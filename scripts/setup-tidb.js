// Creates / upgrades every table in TiDB and normalises emails to lower-case.
// Usage: npm run setup-db      (reads DB_* from .env)
require('dotenv').config();
const { getPool, ensureSchema } = require('../lib/db');

(async () => {
    const p = getPool();
    await ensureSchema();
    const [users] = await p.query('SELECT id, email FROM users WHERE email <> LOWER(email)');
    for (const u of users) {
        try { await p.query('UPDATE users SET email = LOWER(email) WHERE id = ?', [u.id]); }
        catch (e) { console.warn('Could not lower-case user', u.id, e.message); }
    }
    await p.query('UPDATE listings SET seller_email = LOWER(seller_email) WHERE seller_email IS NOT NULL AND seller_email <> LOWER(seller_email)');
    for (const t of ['users', 'sessions', 'listings', 'listing_images', 'cart_items', 'wishlist_items', 'orders', 'order_items', 'contact_messages', 'newsletter_subscribers']) {
        const [[r]] = await p.query(`SELECT COUNT(*) AS n FROM \`${t}\``);
        console.log(t.padEnd(24), r.n);
    }
    console.log('TiDB is ready.');
    await p.end();
})().catch((e) => { console.error('Setup failed:', e.message); process.exit(1); });
