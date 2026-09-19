const mysql = require('mysql2/promise');
const crypto = require('crypto');
let bcrypt;
try {
    bcrypt = require('bcryptjs');
} catch (e) {
    bcrypt = null;
}

function hashPassword(password) {
    if (bcrypt) {
        return bcrypt.hashSync(password, 10);
    }
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
    if (!storedHash) return false;
    if (storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$')) {
        if (bcrypt) return bcrypt.compareSync(password, storedHash);
    }
    if (storedHash.includes(':')) {
        const [salt, hash] = storedHash.split(':');
        const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
        return hash === verifyHash;
    }
    return password === storedHash;
}

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
        const DB_HOST = process.env.DB_HOST;
        const DB_PORT = parseInt(process.env.DB_PORT);
        const DB_USER = process.env.DB_USER;
        const DB_PASSWORD = process.env.DB_PASSWORD;
        const DB_NAME = process.env.DB_NAME;

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
                featured: item.featured,
                views: item.views,
                createdAt: item.created_at
            }));

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ success: true, count: listings.length, listings })
            };
        }

        // DELETE: Delete a listing
        if (event.httpMethod === 'DELETE') {
            const id = (event.queryStringParameters && event.queryStringParameters.id) || event.path.split('/').pop();
            if (id) {
                await connection.query('DELETE FROM listings WHERE id = ?', [id]);
            }
            await connection.end();
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ success: true, message: 'Listing deleted from database' })
            };
        }

        // POST: Save listing OR Login / Register User
        if (event.httpMethod === 'POST') {
            const body = typeof event.body === 'string' ? JSON.parse(event.body || '{}') : (event.body || {});

            // Handle AUTH: LOGIN
            if (event.path.includes('/auth/login') || body.action === 'login') {
                const { email, password, role } = body;
                const [rows] = await connection.query('SELECT * FROM users WHERE email = ?', [email]);

                if (rows.length === 0) {
                    await connection.end();
                    return {
                        statusCode: 404,
                        headers,
                        body: JSON.stringify({ success: false, message: 'No account found with this email. Please sign up first.' })
                    };
                }

                const user = rows[0];
                const passwordMatches = verifyPassword(password, user.password);
                if (!passwordMatches) {
                    await connection.end();
                    return {
                        statusCode: 401,
                        headers,
                        body: JSON.stringify({ success: false, message: '🔒 Incorrect Password! Please enter the correct password.' })
                    };
                }

                await connection.end();
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        success: true,
                        user: { name: user.name, email: user.email, role: user.role || role || 'buyer', phone: user.phone || '' }
                    })
                };
            }

            // Handle AUTH: REGISTER
            if (event.path.includes('/auth/register') || body.action === 'register') {
                const { name, email, password, role, phone } = body;
                const [existing] = await connection.query('SELECT * FROM users WHERE email = ?', [email]);
                if (existing.length > 0) {
                    await connection.end();
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ success: false, message: 'An account with this email already exists. Please sign in.' })
                    };
                }

                const userRole = (role && role.toLowerCase() === 'seller') ? 'seller' : 'buyer';
                const displayName = (name && name.trim()) ? name.trim() : email.split('@')[0];
                const hashedPassword = hashPassword(password);
                const query = `INSERT INTO users (name, email, password, phone, role) VALUES (?, ?, ?, ?, ?)`;
                await connection.query(query, [displayName, email, hashedPassword, phone || '', userRole]);
                await connection.end();

                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        success: true,
                        user: { name: displayName, email, role: userRole, phone: phone || '' }
                    })
                };
            }

            // Save listing to MySQL
            const item = body;
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

            await connection.query(query, [
                id, item.title || 'Untitled Item', item.category || 'General', item.subcategory || '',
                parseFloat(item.price) || 0, item.description || '', item.condition || 'Used',
                item.location || 'Nairobi', item.sellerId || '', item.sellerName || 'Verified Seller',
                item.sellerEmail || '', item.sellerPhone || '', item.whatsapp || '', item.negotiable || 'Yes',
                item.deliveryAvailable || 'No', item.imageUrl || (item.images && item.images[0]) || '',
                imagesJson, featuresJson, attributesJson, item.status || 'Available', item.premium || 'Normal',
                (item.featured === 'Yes' || item.featured === true) ? 'Yes' : 'No'
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
