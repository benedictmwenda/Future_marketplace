'use strict';
// One API implementation shared by the Express server (server.js) and the Netlify
// function (netlify/functions/api.js). Everything is stored in TiDB.
//
// Security model: the browser only holds an opaque, HttpOnly session cookie. Who the
// caller is — and whether they are an admin or own a listing — is ALWAYS decided here
// from the database, never from anything the client claims (email, role, etc.).
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { getPool, ensureSchema } = require('./db');

const COOKIE = 'sh_session';
const SESSION_DAYS = 30;
const MAX_IMAGES = 8;
const MAX_IMAGE_BYTES = 1.5 * 1024 * 1024;
const MAX_AVATAR_BYTES = 1024 * 1024;
const DELIVERY_FEE = 500;       // keep in sync with js/sokohub-cart.js
const DISCOUNT = 1500;
const COMMISSION_RATE = 0.10;
const MAX_LOGIN_FAILS = 10;     // per email, per 15 minutes
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

class HttpError extends Error {
    constructor(status, message) { super(message); this.status = status; }
}
const fail = (status, message) => { throw new HttpError(status, message); };
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
const normEmail = (e) => String(e == null ? '' : e).trim().toLowerCase();
const str = (v, max) => String(v == null ? '' : v).trim().slice(0, max);
// Short display text (titles, places, names): angle brackets are never legitimate, drop them.
const txt = (v, max) => str(String(v == null ? '' : v).replace(/[<>]/g, ''), max);
const parseJson = (v, fallback) => {
    if (v == null) return fallback;
    if (typeof v !== 'string') return v;
    try { return JSON.parse(v); } catch (e) { return fallback; }
};

// ---------------------------------------------------------------- helpers

async function withTx(p, fn) {
    const conn = await p.getConnection();
    try {
        await conn.beginTransaction();
        const out = await fn(conn);
        await conn.commit();
        return out;
    } catch (e) {
        try { await conn.rollback(); } catch (_) { /* ignore */ }
        throw e;
    } finally {
        conn.release();
    }
}

function publicUser(u) {
    return {
        id: Number(u.id),
        name: u.name,
        email: u.email,
        phone: u.phone || '',
        photo: u.photo_url || '',
        role: u.role || 'buyer'
    };
}

function sessionCookie(token, req, maxAgeSeconds) {
    const maxAge = maxAgeSeconds == null ? SESSION_DAYS * 86400 : maxAgeSeconds;
    return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${req.secure ? '; Secure' : ''}`;
}

async function createSession(p, userId) {
    const token = crypto.randomBytes(32).toString('hex');
    await p.query(
        'INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? DAY))',
        [sha256(token), userId, SESSION_DAYS]
    );
    await p.query('DELETE FROM sessions WHERE expires_at < NOW()'); // housekeeping
    return token;
}

async function currentUser(p, req) {
    if (req._user !== undefined) return req._user;
    const token = (req.cookies || {})[COOKIE];
    let user = null;
    if (token && /^[a-f0-9]{64}$/.test(token)) {
        const [rows] = await p.query(
            `SELECT u.id, u.name, u.email, u.phone, u.photo_url, u.role
               FROM sessions s JOIN users u ON u.id = s.user_id
              WHERE s.token_hash = ? AND s.expires_at > NOW() LIMIT 1`,
            [sha256(token)]
        );
        user = rows[0] || null;
    }
    req._user = user;
    return user;
}
async function requireUser(p, req) {
    const u = await currentUser(p, req);
    if (!u) fail(401, 'Please sign in to continue.');
    return u;
}
async function requireAdmin(p, req) {
    const u = await requireUser(p, req);
    if (u.role !== 'admin') fail(403, 'Admin access required.');
    return u;
}

function parseDataUrl(s) {
    const m = /^data:(image\/(?:png|jpeg|jpg|webp|gif));base64,([A-Za-z0-9+/=]+)$/.exec(String(s || '').replace(/\s+/g, ''));
    if (!m) return null;
    return { mime: m[1] === 'image/jpg' ? 'image/jpeg' : m[1], buf: Buffer.from(m[2], 'base64'), raw: String(s).replace(/\s+/g, '') };
}

// ---------------------------------------------------------------- auth

async function register(p, req) {
    const b = req.body || {};
    const email = normEmail(b.email);
    const password = String(b.password || '');
    if (!EMAIL_RE.test(email) || email.length > 255) fail(400, 'Please enter a valid email address.');
    if (password.length < 8 || password.length > 200) fail(400, 'Password must be at least 8 characters.');
    const name = txt(b.name, 100) || email.split('@')[0];
    const phone = txt(b.phone, 50);
    // Only buyer/seller can be self-selected. Admin is granted via scripts/make-admin.js only.
    const role = String(b.role || '').toLowerCase() === 'seller' ? 'seller' : 'buyer';

    const [dup] = await p.query('SELECT id FROM users WHERE LOWER(email) = ? LIMIT 1', [email]);
    if (dup.length) fail(400, 'An account with this email already exists. Please sign in.');

    const hash = await bcrypt.hash(password, 10);
    let id;
    try {
        const [r] = await p.query('INSERT INTO users (name, email, password, phone, role) VALUES (?, ?, ?, ?, ?)', [name, email, hash, phone, role]);
        id = r.insertId;
    } catch (e) {
        if (e && e.code === 'ER_DUP_ENTRY') fail(400, 'An account with this email already exists. Please sign in.');
        throw e;
    }
    const token = await createSession(p, id);
    return { json: { success: true, user: publicUser({ id, name, email, phone, photo_url: '', role }) }, cookies: [sessionCookie(token, req)] };
}

async function login(p, req) {
    const b = req.body || {};
    const email = normEmail(b.email);
    const password = String(b.password || '');
    if (!email || !password) fail(400, 'Email and password are required.');

    const [[{ fails }]] = await p.query(
        'SELECT COUNT(*) AS fails FROM login_attempts WHERE email = ? AND created_at > DATE_SUB(NOW(), INTERVAL 15 MINUTE)', [email]);
    if (Number(fails) >= MAX_LOGIN_FAILS) fail(429, 'Too many failed attempts. Please wait 15 minutes and try again.');

    const [rows] = await p.query('SELECT * FROM users WHERE LOWER(email) = ? LIMIT 1', [email]);
    const user = rows[0];
    let ok = false;
    if (user && user.password) { try { ok = await bcrypt.compare(password, user.password); } catch (e) { ok = false; } }
    if (!ok) {
        await p.query('INSERT INTO login_attempts (email) VALUES (?)', [email]);
        fail(401, 'Incorrect email or password.'); // same message for unknown email and wrong password
    }
    await p.query('DELETE FROM login_attempts WHERE email = ?', [email]);
    const token = await createSession(p, user.id);
    return { json: { success: true, user: publicUser(user) }, cookies: [sessionCookie(token, req)] };
}

async function logout(p, req) {
    const token = (req.cookies || {})[COOKIE];
    if (token && /^[a-f0-9]{64}$/.test(token)) await p.query('DELETE FROM sessions WHERE token_hash = ?', [sha256(token)]);
    return { json: { success: true }, cookies: [sessionCookie('', req, 0)] };
}

async function me(p, req) {
    const u = await currentUser(p, req);
    return { json: { success: true, user: u ? publicUser(u) : null } };
}

async function updateProfile(p, req) {
    const user = await requireUser(p, req);
    const b = req.body || {};
    const name = txt(b.name, 100) || user.name;
    const phone = txt(b.phone, 50);
    let photo = user.photo_url || '';
    if (b.photo) {
        const img = parseDataUrl(b.photo);
        if (!img) fail(400, 'Profile photo must be a JPG, PNG, WebP or GIF image.');
        if (img.buf.length > MAX_AVATAR_BYTES) fail(413, 'Profile photo is too large (max 1 MB).');
        photo = img.raw;
    }
    await p.query('UPDATE users SET name = ?, phone = ?, photo_url = ? WHERE id = ?', [name, phone, photo, user.id]);
    return { json: { success: true, user: publicUser({ ...user, name, phone, photo_url: photo }) } };
}

async function changePassword(p, req) {
    const user = await requireUser(p, req);
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) fail(400, 'Missing required fields.');
    if (String(newPassword).length < 8 || String(newPassword).length > 200) fail(400, 'New password must be at least 8 characters.');
    const [rows] = await p.query('SELECT password FROM users WHERE id = ? LIMIT 1', [user.id]);
    let ok = false;
    try { ok = !!rows[0] && await bcrypt.compare(String(currentPassword), rows[0].password); } catch (e) { ok = false; }
    if (!ok) fail(401, 'Current password is incorrect.');
    const hash = await bcrypt.hash(String(newPassword), 10);
    await p.query('UPDATE users SET password = ? WHERE id = ?', [hash, user.id]);
    // Sign out every other device.
    const token = (req.cookies || {})[COOKIE] || '';
    await p.query('DELETE FROM sessions WHERE user_id = ? AND token_hash <> ?', [user.id, sha256(token)]);
    return { json: { success: true, message: 'Password updated successfully.' } };
}

// ---------------------------------------------------------------- listings

const LIST_COLS = 'id, title, category, subcategory, price, description, `condition`, location, seller_id, seller_name, seller_email, ' +
    'seller_phone, whatsapp, negotiable, delivery_available, features, attributes, status, premium, featured, views, created_at, updated_at';
// Listings saved by the old code hold base64 photos inside the row. Never ship those in
// JSON — point at the image route instead (scripts/migrate-images.js moves them to listing_images).
const IMG_SQL = `IF(LEFT(image_url, 5) = 'data:', '', image_url) AS image_url,
    IF(LEFT(image_url, 5) = 'data:', NULL, images) AS images,
    IF(LEFT(image_url, 5) = 'data:', GREATEST(IFNULL(JSON_LENGTH(images), 0), 1), NULL) AS legacy_count`;

function mapListing(row) {
    const id = row.id;
    let images = parseJson(row.images, []);
    if (!Array.isArray(images)) images = [];
    let imageUrl = row.image_url || '';
    if (row.legacy_count != null) {
        images = Array.from({ length: Number(row.legacy_count) }, (_, i) => `/api/listings/${encodeURIComponent(id)}/image?i=${i}`);
        imageUrl = images[0];
    } else {
        if (!images.length && imageUrl) images = [imageUrl];
        if (!imageUrl && images.length) imageUrl = images[0];
    }
    return {
        id,
        title: row.title,
        category: row.category,
        subcategory: row.subcategory,
        price: parseFloat(row.price),
        description: row.description,
        condition: row.condition,
        location: row.location,
        sellerId: row.seller_id,
        sellerName: row.seller_name,
        sellerEmail: row.seller_email,
        sellerPhone: row.seller_phone,
        whatsapp: row.whatsapp,
        negotiable: row.negotiable,
        deliveryAvailable: row.delivery_available,
        imageUrl,
        images,
        features: parseJson(row.features, []),
        attributes: parseJson(row.attributes, {}),
        status: row.status,
        premium: row.premium,
        featured: row.featured,
        views: row.views,
        createdAt: row.created_at
    };
}

async function listListings(p, req) {
    const limit = Math.min(Math.max(parseInt((req.query || {}).limit, 10) || 1000, 1), 2000);
    const [rows] = await p.query(`SELECT ${LIST_COLS}, ${IMG_SQL} FROM listings ORDER BY created_at DESC LIMIT ?`, [limit]);
    const listings = rows.map(mapListing);
    return { json: { success: true, count: listings.length, listings } };
}

async function getListing(p, req, id) {
    const [rows] = await p.query(`SELECT ${LIST_COLS}, ${IMG_SQL} FROM listings WHERE id = ? LIMIT 1`, [id]);
    if (!rows.length) fail(404, 'Listing not found');
    return { json: { success: true, listing: mapListing(rows[0]) } };
}

async function viewListing(p, req, id) {
    await p.query('UPDATE listings SET views = views + 1 WHERE id = ?', [id]);
    return { json: { success: true } };
}

async function serveImage(p, req, id) {
    const [rows] = await p.query('SELECT mime, data FROM listing_images WHERE id = ? LIMIT 1', [id]);
    if (!rows.length) fail(404, 'Image not found');
    return { status: 200, binary: { buf: rows[0].data, type: rows[0].mime }, cache: 'public, max-age=31536000, immutable' };
}

async function serveLegacyImage(p, req, id) {
    const i = Math.max(parseInt((req.query || {}).i, 10) || 0, 0);
    const [rows] = await p.query('SELECT image_url, images FROM listings WHERE id = ? LIMIT 1', [id]);
    if (!rows.length) fail(404, 'Image not found');
    const imgs = parseJson(rows[0].images, []);
    const src = (Array.isArray(imgs) && imgs[i]) || (i === 0 ? rows[0].image_url : '');
    const img = parseDataUrl(src);
    if (img) return { status: 200, binary: { buf: img.buf, type: img.mime }, cache: 'public, max-age=3600' };
    if (/^https?:\/\//i.test(src || '')) return { status: 302, redirect: src };
    fail(404, 'Image not found');
}

// Turns the client's photo list into stored photos. Each entry may be:
//   • a new photo (data URL)                      → inserted into listing_images
//   • /api/images/<id> of this listing's own photo → kept
//   • an old-style /api/listings/<id>/image?i=N    → moved into listing_images
//   • an http(s) URL or bundled img/ path          → kept as-is
async function storeImages(conn, listingId, list, existing) {
    if (list.length > MAX_IMAGES) fail(400, `You can upload at most ${MAX_IMAGES} photos.`);
    const [own] = await conn.query('SELECT id FROM listing_images WHERE listing_id = ?', [listingId]);
    const ownIds = new Set(own.map((r) => String(r.id)));
    const legacy = existing ? parseJson(existing.images, []) : [];
    const keep = new Set();
    const urls = [];
    let pos = 0;

    const insert = async (img) => {
        if (img.buf.length > MAX_IMAGE_BYTES) fail(413, 'One of your photos is too large (max 1.5 MB). Please use a smaller photo.');
        const [r] = await conn.query('INSERT INTO listing_images (listing_id, position, mime, data) VALUES (?, ?, ?, ?)', [listingId, pos++, img.mime, img.buf]);
        keep.add(String(r.insertId));
        urls.push('/api/images/' + r.insertId);
    };

    for (const raw of list) {
        const v = String(raw || '');
        let m;
        if ((m = /^\/api\/images\/(\d+)$/.exec(v))) {
            if (ownIds.has(m[1])) { keep.add(m[1]); urls.push(v); pos++; }
        } else if ((m = /^\/api\/listings\/[^/]+\/image\?i=(\d+)$/.exec(v))) {
            const i = parseInt(m[1], 10);
            const src = (Array.isArray(legacy) && legacy[i]) || (i === 0 && existing ? existing.image_url : '');
            const img = parseDataUrl(src);
            if (img) await insert(img);
        } else if (v.startsWith('data:')) {
            const img = parseDataUrl(v);
            if (!img) fail(400, 'Unsupported image format. Please use JPG, PNG, WebP or GIF.');
            await insert(img);
        } else if (/^https?:\/\/[^\s"'<>()\\]+$/i.test(v) && v.length <= 1000) {
            urls.push(v); pos++;
        } else if (/^img\/[A-Za-z0-9_\-/.]+$/.test(v)) {
            urls.push(v); pos++;
        }
    }
    const removed = [...ownIds].filter((x) => !keep.has(x)).map(Number);
    if (removed.length) await conn.query('DELETE FROM listing_images WHERE listing_id = ? AND id IN (?)', [listingId, removed]);
    return urls;
}

function cleanStringList(v, maxItems, maxLen) {
    if (!Array.isArray(v)) return [];
    return v.slice(0, maxItems).map((x) => txt(x, maxLen)).filter(Boolean);
}

async function saveListing(p, req) {
    const user = await requireUser(p, req);
    const b = req.body || {};
    const title = txt(b.title, 255);
    const category = txt(b.category, 100);
    const location = txt(b.location, 255);
    const phone = txt(b.sellerPhone, 50);
    const price = Number(b.price);
    if (!title) fail(400, 'Please enter a title for your listing.');
    if (!category) fail(400, 'Please choose a category.');
    if (!Number.isFinite(price) || price < 0 || price > 1e10) fail(400, 'Please enter a valid price.');
    if (!location) fail(400, 'Please enter the item location.');
    if (!phone) fail(400, 'Please enter a contact phone number.');

    let attributes = b.attributes && typeof b.attributes === 'object' && !Array.isArray(b.attributes) ? b.attributes : {};
    attributes = Object.fromEntries(Object.entries(attributes).slice(0, 60).map(([k, v]) => [txt(k, 60), typeof v === 'string' ? txt(v, 500) : v]));
    if (JSON.stringify(attributes).length > 20000) fail(400, 'Listing details are too long.');

    let id = typeof b.id === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(b.id) ? b.id : null;
    let existing = null;
    if (id) {
        const [rows] = await p.query('SELECT id, seller_email, image_url, images, premium, featured FROM listings WHERE id = ? LIMIT 1', [id]);
        existing = rows[0] || null;
    }
    if (existing) {
        if (normEmail(existing.seller_email) !== normEmail(user.email) && user.role !== 'admin') fail(403, 'You can only edit your own listings.');
    } else {
        id = 'sh_' + Date.now() + '_' + crypto.randomBytes(3).toString('hex');
    }

    const imageList = Array.isArray(b.images) && b.images.length ? b.images : (b.imageUrl ? [b.imageUrl] : []);
    const yesNo = (v, d) => (String(v) === 'Yes' || String(v) === 'No' ? String(v) : d);
    const row = {
        id,
        title,
        category,
        subcategory: txt(b.subcategory, 100),
        price,
        description: str(b.description, 10000),
        condition: txt(b.condition, 100) || 'Used',
        location,
        seller_id: String(user.id),
        seller_name: txt(b.sellerName, 255) || user.name,
        seller_email: existing ? existing.seller_email : normEmail(user.email), // never taken from the client
        seller_phone: phone,
        whatsapp: txt(b.whatsapp, 50),
        negotiable: yesNo(b.negotiable, 'Yes'),
        delivery_available: yesNo(b.deliveryAvailable, 'No'),
        image_url: '',
        images: '[]',
        features: JSON.stringify(cleanStringList(b.features, 50, 200)),
        attributes: JSON.stringify(attributes),
        status: txt(b.status, 50) || 'Available',
        // Promotion tiers are an admin decision (set from the admin dashboard); sellers can't
        // give themselves 'featured' / 'top' for free, and editing keeps the existing tier.
        premium: existing ? (existing.premium || 'Normal') : 'Normal',
        featured: existing ? (existing.featured || 'No') : 'No'
    };
    if (user.role === 'admin') {
        row.premium = txt(b.premium, 50) || row.premium;
        row.featured = ['featured', 'top'].includes(String(row.premium).toLowerCase()) ? 'Yes' : 'No';
    }
    if (existing) row.seller_id = undefined;

    await withTx(p, async (conn) => {
        const urls = await storeImages(conn, id, imageList, existing);
        if (!urls.length) fail(400, 'Please add at least one photo.');
        row.image_url = urls[0];
        row.images = JSON.stringify(urls);
        const entries = Object.entries(row).filter(([, v]) => v !== undefined);
        if (existing) {
            const sets = entries.filter(([k]) => k !== 'id');
            await conn.query(`UPDATE listings SET ${sets.map(([k]) => '`' + k + '` = ?').join(', ')} WHERE id = ?`, [...sets.map(([, v]) => v), id]);
        } else {
            await conn.query(
                `INSERT INTO listings (${entries.map(([k]) => '`' + k + '`').join(', ')}) VALUES (${entries.map(() => '?').join(', ')})`,
                entries.map(([, v]) => v)
            );
        }
        // Posting a listing makes you a seller (admins keep their role).
        await conn.query("UPDATE users SET role = 'seller' WHERE id = ? AND role = 'buyer'", [user.id]);
    });

    const [rows] = await p.query(`SELECT ${LIST_COLS}, ${IMG_SQL} FROM listings WHERE id = ? LIMIT 1`, [id]);
    return { json: { success: true, message: 'Listing saved', id, listing: mapListing(rows[0]) } };
}

async function removeListing(p, id) {
    await withTx(p, async (conn) => {
        await conn.query('DELETE FROM listing_images WHERE listing_id = ?', [id]);
        await conn.query('DELETE FROM cart_items WHERE listing_id = ?', [id]);
        await conn.query('DELETE FROM wishlist_items WHERE listing_id = ?', [id]);
        await conn.query('DELETE FROM listings WHERE id = ?', [id]);
    });
}

async function deleteListing(p, req, id) {
    const user = await requireUser(p, req);
    const [rows] = await p.query('SELECT seller_email FROM listings WHERE id = ? LIMIT 1', [id]);
    if (!rows.length) fail(404, 'Listing not found.');
    if (normEmail(rows[0].seller_email) !== normEmail(user.email) && user.role !== 'admin') fail(403, 'You can only delete your own listings.');
    await removeListing(p, id);
    return { json: { success: true, message: 'Listing deleted.' } };
}

// ---------------------------------------------------------------- cart & wishlist

const ROW_IMG = `IF(LEFT(l.image_url, 5) = 'data:', '', l.image_url) AS image_url, IF(LEFT(l.image_url, 5) = 'data:', 1, 0) AS legacy`;
const rowImage = (r) => (Number(r.legacy) ? `/api/listings/${encodeURIComponent(r.id)}/image?i=0` : (r.image_url || 'img/featured/feature-1.jpg'));

async function readCart(p, userId) {
    const [rows] = await p.query(
        `SELECT c.listing_id AS id, c.quantity, l.title, l.price, l.category, l.seller_name, ${ROW_IMG}
           FROM cart_items c JOIN listings l ON l.id = c.listing_id
          WHERE c.user_id = ? ORDER BY c.added_at DESC, c.listing_id`, [userId]);
    return rows.map((r) => ({
        id: r.id, title: r.title, price: parseFloat(r.price), quantity: Number(r.quantity),
        image: rowImage(r), badge: r.category || 'Product', seller: r.seller_name || 'Verified Seller'
    }));
}
async function getCart(p, req) {
    const user = await requireUser(p, req);
    return { json: { success: true, items: await readCart(p, user.id) } };
}
function cleanIds(items, withQty) {
    if (!Array.isArray(items)) fail(400, 'items is required.');
    if (items.length > 100) fail(400, 'Too many items.');
    const seen = new Set();
    const out = [];
    for (const it of items) {
        const id = str(it && it.id, 100);
        if (!id || seen.has(id)) continue;
        seen.add(id);
        out.push(withQty ? [id, Math.min(Math.max(parseInt(it.quantity, 10) || 1, 1), 99)] : [id]);
    }
    return out;
}
async function onlyExisting(p, entries) {
    if (!entries.length) return entries;
    const [rows] = await p.query('SELECT id FROM listings WHERE id IN (?)', [entries.map((e) => e[0])]);
    const ok = new Set(rows.map((r) => r.id));
    return entries.filter((e) => ok.has(e[0]));
}
// Replaces the user's whole cart (the client keeps an in-memory copy and syncs it here).
async function putCart(p, req) {
    const user = await requireUser(p, req);
    const entries = await onlyExisting(p, cleanIds((req.body || {}).items, true));
    await withTx(p, async (conn) => {
        await conn.query('DELETE FROM cart_items WHERE user_id = ?', [user.id]);
        for (let i = 0; i < entries.length; i++) {
            await conn.query('INSERT INTO cart_items (user_id, listing_id, quantity, added_at) VALUES (?, ?, ?, DATE_SUB(NOW(), INTERVAL ? SECOND))',
                [user.id, entries[i][0], entries[i][1], i]);
        }
    });
    return { json: { success: true, items: await readCart(p, user.id) } };
}

async function readWishlist(p, userId) {
    const [rows] = await p.query(
        `SELECT w.listing_id AS id, l.title, l.price, l.category, l.seller_name, ${ROW_IMG}
           FROM wishlist_items w JOIN listings l ON l.id = w.listing_id
          WHERE w.user_id = ? ORDER BY w.added_at DESC, w.listing_id`, [userId]);
    return rows.map((r) => ({
        id: r.id, title: r.title, price: parseFloat(r.price), image: rowImage(r),
        category: r.category || 'Product', seller: r.seller_name || 'Verified Seller'
    }));
}
async function getWishlist(p, req) {
    const user = await requireUser(p, req);
    return { json: { success: true, items: await readWishlist(p, user.id) } };
}
async function putWishlist(p, req) {
    const user = await requireUser(p, req);
    const entries = await onlyExisting(p, cleanIds((req.body || {}).items, false));
    await withTx(p, async (conn) => {
        await conn.query('DELETE FROM wishlist_items WHERE user_id = ?', [user.id]);
        for (let i = 0; i < entries.length; i++) {
            await conn.query('INSERT INTO wishlist_items (user_id, listing_id, added_at) VALUES (?, ?, DATE_SUB(NOW(), INTERVAL ? SECOND))',
                [user.id, entries[i][0], i]);
        }
    });
    return { json: { success: true, items: await readWishlist(p, user.id) } };
}

// ---------------------------------------------------------------- orders, contact, newsletter

async function createOrder(p, req) {
    const user = await requireUser(p, req);
    const b = req.body || {};
    const buyerName = str(`${str(b.firstName, 120)} ${str(b.lastName, 120)}`, 255);
    const phone = str(b.phone, 50);
    const address = str(b.address, 500);
    const email = normEmail(b.email || user.email);
    if (!buyerName) fail(400, 'Please enter your name.');
    if (phone.replace(/\D/g, '').length < 7) fail(400, 'Please enter a valid phone number.');
    if (!address) fail(400, 'Please enter your delivery address.');
    if (email && !EMAIL_RE.test(email)) fail(400, 'Please enter a valid email address.');
    const paymentMethod = ['mpesa', 'cod', 'card'].includes(b.paymentMethod) ? b.paymentMethod : 'mpesa';

    // Prices come from the listings table, never from the browser.
    const [items] = await p.query(
        `SELECT c.listing_id, c.quantity, l.title, l.price, l.status, l.seller_email
           FROM cart_items c JOIN listings l ON l.id = c.listing_id WHERE c.user_id = ?`, [user.id]);
    if (!items.length) fail(400, 'Your cart is empty.');
    for (const it of items) {
        if (String(it.status || 'Available').toLowerCase() !== 'available') fail(409, `"${it.title}" is no longer available. Please remove it from your cart.`);
        if (normEmail(it.seller_email) === normEmail(user.email)) fail(400, "You can't buy your own listing.");
    }
    const subtotal = items.reduce((s, it) => s + parseFloat(it.price) * Number(it.quantity), 0);
    const commission = Math.round(subtotal * COMMISSION_RATE);
    const total = Math.max(subtotal + commission + DELIVERY_FEE - DISCOUNT, 0);

    const orderId = await withTx(p, async (conn) => {
        const [r] = await conn.query(
            `INSERT INTO orders (user_id, status, payment_method, subtotal, commission, delivery_fee, discount, total,
                                 buyer_name, buyer_email, buyer_phone, city, address, address2, area, notes)
             VALUES (?, 'Pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [user.id, paymentMethod, subtotal, commission, DELIVERY_FEE, DISCOUNT, total, buyerName, email, phone,
                str(b.city, 255), address, str(b.address2, 255), str(b.area, 255), str(b.notes, 2000)]);
        for (const it of items) {
            await conn.query('INSERT INTO order_items (order_id, listing_id, title, price, quantity, seller_email) VALUES (?, ?, ?, ?, ?, ?)',
                [r.insertId, it.listing_id, it.title, it.price, it.quantity, it.seller_email]);
        }
        await conn.query('DELETE FROM cart_items WHERE user_id = ?', [user.id]);
        return r.insertId;
    });
    return { json: { success: true, order: { id: orderId, status: 'Pending', subtotal, commission, deliveryFee: DELIVERY_FEE, discount: DISCOUNT, total, paymentMethod } } };
}

async function listOrders(p, req) {
    const user = await requireUser(p, req);
    const [orders] = await p.query('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 100', [user.id]);
    if (!orders.length) return { json: { success: true, orders: [] } };
    const [items] = await p.query('SELECT order_id, listing_id, title, price, quantity FROM order_items WHERE order_id IN (?)', [orders.map((o) => o.id)]);
    return { json: { success: true, orders: orders.map((o) => ({ ...o, items: items.filter((i) => i.order_id === o.id) })) } };
}

async function contact(p, req) {
    const b = req.body || {};
    const name = str(b.name, 255);
    const email = normEmail(b.email);
    const message = str(b.message, 5000);
    if (!name || !EMAIL_RE.test(email) || !message) fail(400, 'Please fill in your name, a valid email and a message.');
    await p.query('INSERT INTO contact_messages (name, email, message) VALUES (?, ?, ?)', [name, email, message]);
    return { json: { success: true, message: 'Thanks! Your message has been sent.' } };
}

async function newsletter(p, req) {
    const email = normEmail((req.body || {}).email);
    if (!EMAIL_RE.test(email)) fail(400, 'Please enter a valid email address.');
    await p.query('INSERT IGNORE INTO newsletter_subscribers (email) VALUES (?)', [email]);
    return { json: { success: true, message: "You're subscribed!" } };
}

// ---------------------------------------------------------------- admin (role always read from the DB session)

async function adminStats(p, req) {
    await requireAdmin(p, req);
    const one = async (sql) => { const [[row]] = await p.query(sql); return Number(Object.values(row)[0]); };
    const [byCategory] = await p.query('SELECT category, COUNT(*) AS count FROM listings GROUP BY category ORDER BY count DESC');
    const [byStatus] = await p.query('SELECT status, COUNT(*) AS count FROM listings GROUP BY status');
    const [byPremium] = await p.query('SELECT premium, COUNT(*) AS count FROM listings GROUP BY premium');
    const [topSellers] = await p.query('SELECT seller_name, seller_email, COUNT(*) AS listingCount FROM listings GROUP BY seller_email, seller_name ORDER BY listingCount DESC LIMIT 5');
    return {
        json: {
            success: true,
            stats: {
                totalUsers: await one('SELECT COUNT(*) FROM users'),
                totalBuyers: await one("SELECT COUNT(*) FROM users WHERE role = 'buyer'"),
                totalSellers: await one("SELECT COUNT(*) FROM users WHERE role = 'seller'"),
                totalAdmins: await one("SELECT COUNT(*) FROM users WHERE role = 'admin'"),
                totalListings: await one('SELECT COUNT(*) FROM listings'),
                newUsers7d: await one('SELECT COUNT(*) FROM users WHERE created_at >= (NOW() - INTERVAL 7 DAY)'),
                newListings7d: await one('SELECT COUNT(*) FROM listings WHERE created_at >= (NOW() - INTERVAL 7 DAY)'),
                featuredCount: await one("SELECT COUNT(*) FROM listings WHERE featured = 'Yes'"),
                totalOrders: await one('SELECT COUNT(*) FROM orders'),
                byCategory, byStatus, byPremium, topSellers
            }
        }
    };
}
async function adminUsers(p, req) {
    await requireAdmin(p, req);
    const [users] = await p.query('SELECT id, name, email, phone, role, created_at FROM users ORDER BY created_at DESC');
    return { json: { success: true, users } };
}
async function adminUpdateRole(p, req) {
    const admin = await requireAdmin(p, req);
    const targetEmail = normEmail((req.body || {}).targetEmail);
    const newRole = (req.body || {}).newRole;
    if (!targetEmail || !['buyer', 'seller', 'admin'].includes(newRole)) fail(400, 'Invalid target email or role.');
    if (targetEmail === normEmail(admin.email) && newRole !== 'admin') fail(400, "You can't remove your own admin role.");
    await p.query('UPDATE users SET role = ? WHERE LOWER(email) = ?', [newRole, targetEmail]);
    return { json: { success: true, message: 'Role updated.' } };
}
async function adminDeleteUser(p, req) {
    const admin = await requireAdmin(p, req);
    const targetEmail = normEmail((req.body || {}).targetEmail);
    if (!targetEmail) fail(400, 'Missing targetEmail.');
    if (targetEmail === normEmail(admin.email)) fail(400, "You can't delete your own admin account from here.");
    const [rows] = await p.query('SELECT id FROM users WHERE LOWER(email) = ? LIMIT 1', [targetEmail]);
    if (rows.length) {
        const uid = rows[0].id;
        await withTx(p, async (conn) => {
            await conn.query('DELETE FROM sessions WHERE user_id = ?', [uid]);
            await conn.query('DELETE FROM cart_items WHERE user_id = ?', [uid]);
            await conn.query('DELETE FROM wishlist_items WHERE user_id = ?', [uid]);
            await conn.query('DELETE FROM users WHERE id = ?', [uid]);
        });
    }
    return { json: { success: true, message: 'User deleted.' } };
}
async function adminDeleteListing(p, req) {
    await requireAdmin(p, req);
    const id = str((req.body || {}).listingId, 100);
    if (!id) fail(400, 'Missing listingId.');
    await removeListing(p, id);
    return { json: { success: true, message: 'Listing deleted.' } };
}
async function adminUpdateListing(p, req) {
    await requireAdmin(p, req);
    const { listingId, premium, status } = req.body || {};
    if (!listingId) fail(400, 'Missing listingId.');
    const fields = []; const values = [];
    if (premium) {
        fields.push('premium = ?'); values.push(txt(premium, 50));
        fields.push('featured = ?'); values.push(['featured', 'top'].includes(String(premium).toLowerCase()) ? 'Yes' : 'No');
    }
    if (status) { fields.push('status = ?'); values.push(txt(status, 50)); }
    if (!fields.length) fail(400, 'Nothing to update.');
    values.push(String(listingId));
    await p.query(`UPDATE listings SET ${fields.join(', ')} WHERE id = ?`, values);
    return { json: { success: true, message: 'Listing updated.' } };
}

// ---------------------------------------------------------------- routing

// The Netlify build of admin.html posts "actions"; map them onto the same routes.
const ACTION_ROUTES = {
    login: ['POST', '/auth/login'],
    register: ['POST', '/auth/register'],
    'update-profile': ['POST', '/auth/update-profile'],
    'change-password': ['POST', '/auth/change-password'],
    'admin-stats': ['GET', '/admin/stats'],
    'admin-get-users': ['POST', '/admin/users'],
    'admin-update-user-role': ['POST', '/admin/update-user-role'],
    'admin-delete-user': ['POST', '/admin/delete-user'],
    'admin-delete-listing': ['POST', '/admin/delete-listing'],
    'admin-update-listing': ['POST', '/admin/update-listing']
};

const ROUTES = [
    ['GET', /^\/health$/, async (p) => { await p.query('SELECT 1'); return { json: { success: true, db: 'ok' } }; }],
    ['GET', /^\/auth\/me$/, me],
    ['POST', /^\/auth\/register$/, register],
    ['POST', /^\/auth\/login$/, login],
    ['POST', /^\/auth\/logout$/, logout],
    ['POST', /^\/auth\/update-profile$/, updateProfile],
    ['POST', /^\/auth\/change-password$/, changePassword],
    ['GET', /^\/listings$/, listListings],
    ['POST', /^\/listings$/, saveListing],
    ['GET', /^\/listings\/([^/]+)\/image$/, (p, r, m) => serveLegacyImage(p, r, m[1])],
    ['POST', /^\/listings\/([^/]+)\/view$/, (p, r, m) => viewListing(p, r, m[1])],
    ['GET', /^\/listings\/([^/]+)$/, (p, r, m) => getListing(p, r, m[1])],
    ['DELETE', /^\/listings\/([^/]+)$/, (p, r, m) => deleteListing(p, r, m[1])],
    ['GET', /^\/images\/(\d+)$/, (p, r, m) => serveImage(p, r, m[1])],
    ['GET', /^\/cart$/, getCart],
    ['PUT', /^\/cart$/, putCart],
    ['GET', /^\/wishlist$/, getWishlist],
    ['PUT', /^\/wishlist$/, putWishlist],
    ['POST', /^\/orders$/, createOrder],
    ['GET', /^\/orders$/, listOrders],
    ['POST', /^\/contact$/, contact],
    ['POST', /^\/newsletter$/, newsletter],
    ['GET', /^\/admin\/stats$/, adminStats],
    ['POST', /^\/admin\/users$/, adminUsers],
    ['POST', /^\/admin\/update-user-role$/, adminUpdateRole],
    ['POST', /^\/admin\/delete-user$/, adminDeleteUser],
    ['POST', /^\/admin\/delete-listing$/, adminDeleteListing],
    ['POST', /^\/admin\/update-listing$/, adminUpdateListing]
];

// req: { method, path (without the /api prefix), query, body, cookies, secure }
// returns: { status, json | binary | redirect, cookies?, cache? }
async function handle(req) {
    req.method = String(req.method || 'GET').toUpperCase();
    req.path = ('/' + String(req.path || '').replace(/^\/+|\/+$/g, '')).replace(/\/{2,}/g, '/');
    req.query = req.query || {};
    req.cookies = req.cookies || {};
    req.body = req.body && typeof req.body === 'object' ? req.body : {};
    try {
        const p = getPool();
        await ensureSchema();

        if (req.method === 'POST' && (req.path === '/' || req.path === '/listings') && ACTION_ROUTES[req.body.action]) {
            [req.method, req.path] = ACTION_ROUTES[req.body.action];
        }
        for (const [method, re, fn] of ROUTES) {
            if (method !== req.method) continue;
            const m = re.exec(req.path);
            if (!m) continue;
            const out = await fn(p, req, m);
            return { status: 200, ...out };
        }
        return { status: 404, json: { success: false, message: 'Not found' } };
    } catch (err) {
        if (err instanceof HttpError) {
            return { status: err.status, json: { success: false, message: err.message, error: err.message } };
        }
        console.error('API error:', err && err.stack ? err.stack : err);
        return { status: 500, json: { success: false, message: 'Something went wrong on our side. Please try again.', error: 'Server error' } };
    }
}

module.exports = { handle };
