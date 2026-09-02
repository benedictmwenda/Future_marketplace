const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// MySQL Connection Pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sokohub',
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
            (id, title, category, subcategory, price, description, \`condition\`, location, seller_id, seller_name, seller_email, seller_phone, whatsapp, negotiable, delivery_available, image_url, images, features, attributes, status, premium)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            title=VALUES(title), category=VALUES(category), subcategory=VALUES(subcategory), price=VALUES(price), description=VALUES(description), \`condition\`=VALUES(\`condition\`), location=VALUES(location), seller_name=VALUES(seller_name), seller_email=VALUES(seller_email), seller_phone=VALUES(seller_phone), whatsapp=VALUES(whatsapp), negotiable=VALUES(negotiable), delivery_available=VALUES(delivery_available), image_url=VALUES(image_url), images=VALUES(images), features=VALUES(features), attributes=VALUES(attributes), status=VALUES(status), premium=VALUES(premium)
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
            item.premium || 'Normal'
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
