const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// MySQL Connection Pool (Supports Local & Cloud Databases like Aiven / Railway / PlanetScale)
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sokohub',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test Database Connection
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Connected to MySQL Database:', process.env.DB_NAME || 'sokohub');
        connection.release();
    } catch (err) {
        console.error('❌ MySQL Connection Error:', err.message);
    }
}
testConnection();

// ==========================================
// 1. GET ALL LISTINGS
// ==========================================
app.get('/api/listings', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM listings ORDER BY created_at DESC');
        
        // Format JSON fields back to objects
        const listings = rows.map(item => ({
            id: item.id,
            title: item.title,
            category: item.category,
            subcategory: item.subcategory,
            price: parseFloat(item.price),
            description: item.description,
            condition: item.condition,
            location: item.location,
            sellerId: item.seller_id,
            sellerName: item.seller_name,
            sellerEmail: item.seller_email,
            sellerPhone: item.seller_phone,
            whatsapp: item.whatsapp,
            negotiable: item.negotiable,
            deliveryAvailable: item.delivery_available,
            imageUrl: item.image_url,
            images: typeof item.images === 'string' ? JSON.parse(item.images || '[]') : (item.images || []),
            features: typeof item.features === 'string' ? JSON.parse(item.features || '[]') : (item.features || []),
            attributes: typeof item.attributes === 'string' ? JSON.parse(item.attributes || '{}') : (item.attributes || {}),
            status: item.status,
            premium: item.premium,
            featured: item.featured,
            views: item.views,
            createdAt: item.created_at
        }));

        res.json({ success: true, count: listings.length, listings });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==========================================
// 2. GET SINGLE LISTING BY ID
// ==========================================
app.get('/api/listings/:id', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM listings WHERE id = ?', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Listing not found' });
        }
        const item = rows[0];
        const formatted = {
            id: item.id,
            title: item.title,
            category: item.category,
            subcategory: item.subcategory,
            price: parseFloat(item.price),
            description: item.description,
            condition: item.condition,
            location: item.location,
            sellerId: item.seller_id,
            sellerName: item.seller_name,
            sellerEmail: item.seller_email,
            sellerPhone: item.seller_phone,
            whatsapp: item.whatsapp,
            negotiable: item.negotiable,
            deliveryAvailable: item.delivery_available,
            imageUrl: item.image_url,
            images: typeof item.images === 'string' ? JSON.parse(item.images || '[]') : (item.images || []),
            features: typeof item.features === 'string' ? JSON.parse(item.features || '[]') : (item.features || []),
            attributes: typeof item.attributes === 'string' ? JSON.parse(item.attributes || '{}') : (item.attributes || {}),
            status: item.status,
            premium: item.premium,
            featured: item.featured,
            views: item.views,
            createdAt: item.created_at
        };
        res.json({ success: true, listing: formatted });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==========================================
// 3. POST / UPDATE LISTING (From post-item.html)
// ==========================================
app.post('/api/listings', async (req, res) => {
    try {
        const item = req.body;
        const id = item.id || ('sh_' + Date.now());
        const imagesJson = JSON.stringify(item.images || [item.imageUrl]);
        const featuresJson = JSON.stringify(item.features || []);
        const attributesJson = JSON.stringify(item.attributes || {});

        const query = `
            INSERT INTO listings 
            (id, title, category, subcategory, price, description, \`condition\`, location, seller_id, seller_name, seller_email, seller_phone, whatsapp, negotiable, delivery_available, image_url, images, features, attributes, status, premium, featured)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            title=VALUES(title), category=VALUES(category), subcategory=VALUES(subcategory), price=VALUES(price), description=VALUES(description), \`condition\`=VALUES(\`condition\`), location=VALUES(location), seller_name=VALUES(seller_name), seller_email=VALUES(seller_email), seller_phone=VALUES(seller_phone), whatsapp=VALUES(whatsapp), negotiable=VALUES(negotiable), delivery_available=VALUES(delivery_available), image_url=VALUES(image_url), images=VALUES(images), features=VALUES(features), attributes=VALUES(attributes), status=VALUES(status), premium=VALUES(premium), featured=VALUES(featured)
        `;

        await pool.query(query, [
            id,
            item.title || 'Untitled Item',
            item.category || 'General',
            item.subcategory || '',
            parseFloat(item.price) || 0,
            item.description || '',
            item.condition || 'Used',
            item.location || 'Nairobi',
            item.sellerId || '',
            item.sellerName || 'Verified Seller',
            item.sellerEmail || '',
            item.sellerPhone || '',
            item.whatsapp || '',
            item.negotiable || 'Yes',
            item.deliveryAvailable || 'No',
            item.imageUrl || (item.images && item.images[0]) || '',
            imagesJson,
            featuresJson,
            attributesJson,
            item.status || 'Available',
            item.premium || 'Normal',
            (item.featured === 'Yes' || item.featured === true) ? 'Yes' : 'No'
        ]);

        console.log('📦 Item saved to MySQL:', id, item.title);
        res.json({ success: true, message: 'Listing saved to MySQL database successfully', id });
    } catch (err) {
        console.error('Error saving listing to MySQL:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==========================================
// 4. DELETE LISTING
// ==========================================
app.delete('/api/listings/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM listings WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Listing deleted from MySQL database' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==========================================
// 5. AUTH: REGISTER USER IN MYSQL
// ==========================================
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password, role, phone } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required' });
        }

        // Check if email already registered
        const [existing] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: 'An account with this email already exists. Please sign in.' });
        }

        const query = `INSERT INTO users (name, email, password, phone, role) VALUES (?, ?, ?, ?, ?)`;
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query(query, [name || email.split('@')[0], email, hashedPassword, phone || '', role || 'buyer']);

        res.json({
            success: true,
            user: { name: name || email.split('@')[0], email, role: role || 'buyer', phone: phone || '' }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==========================================
// 6. AUTH: LOGIN USER WITH PASSWORD IN MYSQL
// ==========================================
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password, role } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required' });
        }

        const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'No account found with this email. Please sign up first.' });
        }

        const user = rows[0];
        const passwordMatches = await bcrypt.compare(password, user.password);
        if (!passwordMatches) {
            return res.status(401).json({ success: false, message: '🔒 Incorrect Password! Please enter the correct password.' });
        }

        res.json({
            success: true,
            user: { name: user.name, email: user.email, role: user.role || role || 'buyer', phone: user.phone || '', photo: user.photo_url || '' }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==========================================
// 6b. AUTH: UPDATE PROFILE (name, phone, photo)
// ==========================================
app.post('/api/auth/update-profile', async (req, res) => {
    try {
        const { email, name, phone, photo } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, message: 'Missing account email.' });
        }

        const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Account not found.' });
        }

        await pool.query(
            'UPDATE users SET name = ?, phone = ?, photo_url = ? WHERE email = ?',
            [name || rows[0].name, phone || '', photo || rows[0].photo_url || '', email]
        );

        res.json({
            success: true,
            user: { name: name || rows[0].name, email, role: rows[0].role, phone: phone || '', photo: photo || rows[0].photo_url || '' }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==========================================
// 6c. AUTH: CHANGE PASSWORD (verifies current password first)
// ==========================================
app.post('/api/auth/change-password', async (req, res) => {
    try {
        const { email, currentPassword, newPassword } = req.body;
        if (!email || !currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: 'Missing required fields.' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });
        }

        const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Account not found.' });
        }

        const user = rows[0];
        const matches = await bcrypt.compare(currentPassword, user.password);
        if (!matches) {
            return res.status(401).json({ success: false, message: '🔒 Current password is incorrect.' });
        }

        const hashedNew = await bcrypt.hash(newPassword, 10);
        await pool.query('UPDATE users SET password = ? WHERE email = ?', [hashedNew, email]);

        res.json({ success: true, message: 'Password updated successfully.' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==========================================
// ADMIN ROUTES — every one re-verifies the requester's role from the
// database by email. The client's claimed role is never trusted.
// ==========================================
async function requireAdmin(req, res) {
    const adminEmail = req.body.adminEmail || req.query.adminEmail;
    if (!adminEmail) {
        res.status(400).json({ success: false, message: 'Missing adminEmail.' });
        return null;
    }
    const [rows] = await pool.query('SELECT role FROM users WHERE email = ?', [adminEmail]);
    if (rows.length === 0 || rows[0].role !== 'admin') {
        res.status(403).json({ success: false, message: 'Admin access required.' });
        return null;
    }
    return adminEmail;
}

app.get('/api/admin/stats', async (req, res) => {
    try {
        if (!(await requireAdmin(req, res))) return;
        const [[{ totalUsers }]] = await pool.query('SELECT COUNT(*) AS totalUsers FROM users');
        const [[{ totalBuyers }]] = await pool.query("SELECT COUNT(*) AS totalBuyers FROM users WHERE role = 'buyer'");
        const [[{ totalSellers }]] = await pool.query("SELECT COUNT(*) AS totalSellers FROM users WHERE role = 'seller'");
        const [[{ totalAdmins }]] = await pool.query("SELECT COUNT(*) AS totalAdmins FROM users WHERE role = 'admin'");
        const [[{ totalListings }]] = await pool.query('SELECT COUNT(*) AS totalListings FROM listings');
        const [[{ newUsers7d }]] = await pool.query('SELECT COUNT(*) AS newUsers7d FROM users WHERE created_at >= (NOW() - INTERVAL 7 DAY)');
        const [[{ newListings7d }]] = await pool.query('SELECT COUNT(*) AS newListings7d FROM listings WHERE created_at >= (NOW() - INTERVAL 7 DAY)');
        const [byCategory] = await pool.query('SELECT category, COUNT(*) AS count FROM listings GROUP BY category ORDER BY count DESC');
        const [byStatus] = await pool.query('SELECT status, COUNT(*) AS count FROM listings GROUP BY status');
        const [byPremium] = await pool.query('SELECT premium, COUNT(*) AS count FROM listings GROUP BY premium');
        const [byFeatured] = await pool.query("SELECT COUNT(*) AS count FROM listings WHERE featured = 'Yes'");
        const [topSellers] = await pool.query('SELECT seller_name, seller_email, COUNT(*) AS listingCount FROM listings GROUP BY seller_email, seller_name ORDER BY listingCount DESC LIMIT 5');

        res.json({
            success: true,
            stats: {
                totalUsers, totalBuyers, totalSellers, totalAdmins, totalListings,
                newUsers7d, newListings7d,
                featuredCount: byFeatured[0].count,
                byCategory, byStatus, byPremium, topSellers
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/admin/users', async (req, res) => {
    try {
        if (!(await requireAdmin(req, res))) return;
        const [users] = await pool.query('SELECT id, name, email, phone, role, created_at FROM users ORDER BY created_at DESC');
        res.json({ success: true, users });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/admin/update-user-role', async (req, res) => {
    try {
        if (!(await requireAdmin(req, res))) return;
        const { targetEmail, newRole } = req.body;
        if (!targetEmail || !['buyer', 'seller', 'admin'].includes(newRole)) {
            return res.status(400).json({ success: false, message: 'Invalid target email or role.' });
        }
        await pool.query('UPDATE users SET role = ? WHERE email = ?', [newRole, targetEmail]);
        res.json({ success: true, message: 'Role updated.' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/admin/delete-user', async (req, res) => {
    try {
        const adminEmail = await requireAdmin(req, res);
        if (!adminEmail) return;
        const { targetEmail } = req.body;
        if (!targetEmail) return res.status(400).json({ success: false, message: 'Missing targetEmail.' });
        if (targetEmail === adminEmail) {
            return res.status(400).json({ success: false, message: "You can't delete your own admin account from here." });
        }
        await pool.query('DELETE FROM users WHERE email = ?', [targetEmail]);
        res.json({ success: true, message: 'User deleted.' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/admin/delete-listing', async (req, res) => {
    try {
        if (!(await requireAdmin(req, res))) return;
        const { listingId } = req.body;
        if (!listingId) return res.status(400).json({ success: false, message: 'Missing listingId.' });
        await pool.query('DELETE FROM listings WHERE id = ?', [listingId]);
        res.json({ success: true, message: 'Listing deleted.' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/admin/update-listing', async (req, res) => {
    try {
        if (!(await requireAdmin(req, res))) return;
        const { listingId, premium, status } = req.body;
        if (!listingId) return res.status(400).json({ success: false, message: 'Missing listingId.' });
        const fields = [];
        const values = [];
        if (premium) { fields.push('premium = ?'); values.push(premium); }
        if (status) { fields.push('status = ?'); values.push(status); }
        if (fields.length === 0) return res.status(400).json({ success: false, message: 'Nothing to update.' });
        values.push(listingId);
        await pool.query(`UPDATE listings SET ${fields.join(', ')} WHERE id = ?`, values);
        res.json({ success: true, message: 'Listing updated.' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Start Server with EADDRINUSE fallback
const server = app.listen(PORT, () => {
    console.log(`🚀 SokoHub MySQL Backend Server running on http://localhost:${PORT}`);
}).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        const altPort = PORT + 1;
        console.log(`⚠️ Port ${PORT} is currently busy. Switching to http://localhost:${altPort}`);
        app.listen(altPort, () => {
            console.log(`🚀 SokoHub MySQL Backend Server running on http://localhost:${altPort}`);
        });
    } else {
        console.error('❌ Server startup error:', err);
    }
});