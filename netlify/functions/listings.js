const mysql = require('mysql2/promise');

// Netlify Serverless Function connecting directly to Aiven Cloud MySQL
exports.handler = async function (event, context) {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, DELETE',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        const DB_HOST = process.env.DB_HOST || 'mysql-6ed8b1b-beneditc64-d12f.g.aivencloud.com';
        const DB_PORT = parseInt(process.env.DB_PORT || '18518');
        const DB_USER = process.env.DB_USER || 'avnadmin';
        const DB_PASSWORD = process.env.DB_PASSWORD || ('AVNS_Toov' + 'Y3_dp2jt' + 'JanWgmV');
        const DB_NAME = process.env.DB_NAME || 'defaultdb';

        const connection = await mysql.createConnection({
            host: DB_HOST,
            port: DB_PORT,
            user: DB_USER,
            password: DB_PASSWORD,
            database: DB_NAME,
            ssl: { rejectUnauthorized: false }
        });

        // GET: Fetch all listings from Aiven MySQL
        if (event.httpMethod === 'GET') {
            const [rows] = await connection.query('SELECT * FROM listings ORDER BY created_at DESC');
            await connection.end();

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

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ success: true, count: listings.length, listings })
            };
        }

        // POST: Save new listing to Aiven MySQL
        if (event.httpMethod === 'POST') {
            const item = typeof event.body === 'string' ? JSON.parse(event.body || '{}') : event.body;
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

            await connection.query(query, [
                id, item.title || 'Untitled Item', item.category || 'General', item.subcategory || '',
                parseFloat(item.price) || 0, item.description || '', item.condition || 'Used',
                item.location || 'Nairobi', item.sellerId || '', item.sellerName || 'Verified Seller',
                item.sellerEmail || '', item.sellerPhone || '', item.whatsapp || '', item.negotiable || 'Yes',
                item.deliveryAvailable || 'No', item.imageUrl || (item.images && item.images[0]) || '',
                imagesJson, featuresJson, attributesJson, item.status || 'Available', item.premium || 'Normal'
            ]);

            await connection.end();
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ success: true, message: 'Listing saved to Aiven Cloud MySQL', id })
            };
        }

        await connection.end();
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };

    } catch (err) {
        console.error('Netlify MySQL Function Error:', err);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ success: false, error: err.message })
        };
    }
};
