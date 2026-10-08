const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

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
        const DB_PASSWORD = process.env.DB_PASSWORD; // no hardcoded fallback
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

        // POST: Save listing OR Login / Register User
        if (event.httpMethod === 'POST') {
            const body = typeof event.body === 'string' ? JSON.parse(event.body || '{}') : event.body;

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
                const passwordMatches = await bcrypt.compare(password, user.password);
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
                        user: { name: user.name, email: user.email, role: user.role || role || 'buyer', phone: user.phone || '', photo: user.photo_url || '' }
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

                const query = `INSERT INTO users (name, email, password, phone, role) VALUES (?, ?, ?, ?, ?)`;
                const hashedPassword = await bcrypt.hash(password, 10);
                await connection.query(query, [name || email.split('@')[0], email, hashedPassword, phone || '', role || 'buyer']);
                await connection.end();

                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        success: true,
                        user: { name: name || email.split('@')[0], email, role: role || 'buyer', phone: phone || '', photo: '' }
                    })
                };
            }

            // Handle AUTH: UPDATE PROFILE (name, phone, photo — not email/password)
            if (event.path.includes('/auth/update-profile') || body.action === 'update-profile') {
                const { email, name, phone, photo } = body;
                if (!email) {
                    await connection.end();
                    return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: 'Missing account email.' }) };
                }

                const [rows] = await connection.query('SELECT * FROM users WHERE email = ?', [email]);
                if (rows.length === 0) {
                    await connection.end();
                    return { statusCode: 404, headers, body: JSON.stringify({ success: false, message: 'Account not found.' }) };
                }

                await connection.query(
                    'UPDATE users SET name = ?, phone = ?, photo_url = ? WHERE email = ?',
                    [name || rows[0].name, phone || '', photo || rows[0].photo_url || '', email]
                );
                await connection.end();

                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        success: true,
                        user: { name: name || rows[0].name, email, role: rows[0].role, phone: phone || '', photo: photo || rows[0].photo_url || '' }
                    })
                };
            }

            // Handle AUTH: CHANGE PASSWORD (requires verifying the current one)
            if (event.path.includes('/auth/change-password') || body.action === 'change-password') {
                const { email, currentPassword, newPassword } = body;
                if (!email || !currentPassword || !newPassword) {
                    await connection.end();
                    return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: 'Missing required fields.' }) };
                }
                if (newPassword.length < 6) {
                    await connection.end();
                    return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: 'New password must be at least 6 characters.' }) };
                }

                const [rows] = await connection.query('SELECT * FROM users WHERE email = ?', [email]);
                if (rows.length === 0) {
                    await connection.end();
                    return { statusCode: 404, headers, body: JSON.stringify({ success: false, message: 'Account not found.' }) };
                }

                const user = rows[0];
                const matches = await bcrypt.compare(currentPassword, user.password);
                if (!matches) {
                    await connection.end();
                    return { statusCode: 401, headers, body: JSON.stringify({ success: false, message: '🔒 Current password is incorrect.' }) };
                }

                const hashedNew = await bcrypt.hash(newPassword, 10);
                await connection.query('UPDATE users SET password = ? WHERE email = ?', [hashedNew, email]);
                await connection.end();

                return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: 'Password updated successfully.' }) };
            }

            // ==========================================================
            // ADMIN ACTIONS — every single one re-verifies the requester's
            // role from the database by their email. The client's claimed
            // role is NEVER trusted; localStorage can be edited by anyone,
            // so admin access only ever counts if the DB says so.
            // ==========================================================
            const ADMIN_ACTIONS = ['admin-stats', 'admin-get-users', 'admin-update-user-role', 'admin-delete-user', 'admin-delete-listing', 'admin-update-listing'];
            if (ADMIN_ACTIONS.includes(body.action)) {
                const adminEmail = body.adminEmail;
                if (!adminEmail) {
                    await connection.end();
                    return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: 'Missing adminEmail.' }) };
                }
                const [adminRows] = await connection.query('SELECT role FROM users WHERE email = ?', [adminEmail]);
                if (adminRows.length === 0 || adminRows[0].role !== 'admin') {
                    await connection.end();
                    return { statusCode: 403, headers, body: JSON.stringify({ success: false, message: 'Admin access required.' }) };
                }

                if (body.action === 'admin-stats') {
                    const [[{ totalUsers }]] = await connection.query('SELECT COUNT(*) AS totalUsers FROM users');
                    const [[{ totalBuyers }]] = await connection.query("SELECT COUNT(*) AS totalBuyers FROM users WHERE role = 'buyer'");
                    const [[{ totalSellers }]] = await connection.query("SELECT COUNT(*) AS totalSellers FROM users WHERE role = 'seller'");
                    const [[{ totalAdmins }]] = await connection.query("SELECT COUNT(*) AS totalAdmins FROM users WHERE role = 'admin'");
                    const [[{ totalListings }]] = await connection.query('SELECT COUNT(*) AS totalListings FROM listings');
                    const [[{ newUsers7d }]] = await connection.query('SELECT COUNT(*) AS newUsers7d FROM users WHERE created_at >= (NOW() - INTERVAL 7 DAY)');
                    const [[{ newListings7d }]] = await connection.query('SELECT COUNT(*) AS newListings7d FROM listings WHERE created_at >= (NOW() - INTERVAL 7 DAY)');
                    const [byCategory] = await connection.query('SELECT category, COUNT(*) AS count FROM listings GROUP BY category ORDER BY count DESC');
                    const [byStatus] = await connection.query('SELECT status, COUNT(*) AS count FROM listings GROUP BY status');
                    const [byPremium] = await connection.query('SELECT premium, COUNT(*) AS count FROM listings GROUP BY premium');
                    const [byFeatured] = await connection.query("SELECT COUNT(*) AS count FROM listings WHERE featured = 'Yes'");
                    const [topSellers] = await connection.query('SELECT seller_name, seller_email, COUNT(*) AS listingCount FROM listings GROUP BY seller_email, seller_name ORDER BY listingCount DESC LIMIT 5');

                    await connection.end();
                    return {
                        statusCode: 200, headers, body: JSON.stringify({
                            success: true,
                            stats: {
                                totalUsers, totalBuyers, totalSellers, totalAdmins, totalListings,
                                newUsers7d, newListings7d,
                                featuredCount: byFeatured[0].count,
                                byCategory, byStatus, byPremium, topSellers
                            }
                        })
                    };
                }

                if (body.action === 'admin-get-users') {
                    const [users] = await connection.query('SELECT id, name, email, phone, role, created_at FROM users ORDER BY created_at DESC');
                    await connection.end();
                    return { statusCode: 200, headers, body: JSON.stringify({ success: true, users }) };
                }

                if (body.action === 'admin-update-user-role') {
                    const { targetEmail, newRole } = body;
                    if (!targetEmail || !['buyer', 'seller', 'admin'].includes(newRole)) {
                        await connection.end();
                        return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: 'Invalid target email or role.' }) };
                    }
                    await connection.query('UPDATE users SET role = ? WHERE email = ?', [newRole, targetEmail]);
                    await connection.end();
                    return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: 'Role updated.' }) };
                }

                if (body.action === 'admin-delete-user') {
                    const { targetEmail } = body;
                    if (!targetEmail) {
                        await connection.end();
                        return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: 'Missing targetEmail.' }) };
                    }
                    if (targetEmail === adminEmail) {
                        await connection.end();
                        return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: "You can't delete your own admin account from here." }) };
                    }
                    await connection.query('DELETE FROM users WHERE email = ?', [targetEmail]);
                    await connection.end();
                    return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: 'User deleted.' }) };
                }

                if (body.action === 'admin-delete-listing') {
                    const { listingId } = body;
                    if (!listingId) {
                        await connection.end();
                        return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: 'Missing listingId.' }) };
                    }
                    await connection.query('DELETE FROM listings WHERE id = ?', [listingId]);
                    await connection.end();
                    return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: 'Listing deleted.' }) };
                }

                if (body.action === 'admin-update-listing') {
                    const { listingId, premium, status } = body;
                    if (!listingId) {
                        await connection.end();
                        return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: 'Missing listingId.' }) };
                    }
                    const fields = [];
                    const values = [];
                    if (premium) { fields.push('premium = ?'); values.push(premium); }
                    if (status) { fields.push('status = ?'); values.push(status); }
                    if (fields.length === 0) {
                        await connection.end();
                        return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: 'Nothing to update.' }) };
                    }
                    values.push(listingId);
                    await connection.query(`UPDATE listings SET ${fields.join(', ')} WHERE id = ?`, values);
                    await connection.end();
                    return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: 'Listing updated.' }) };
                }
            }

            // Save listing...
            const item = body;
            const id = item.id || ('sh_' + Date.now());
            const imagesJson = JSON.stringify(item.images || [item.imageUrl]);
            const featuresJson = JSON.stringify(item.features || []);
            const attributesJson = JSON.stringify(item.attributes || {});

            const query = `
                INSERT INTO listings 
                (id, title, category, subcategory, price, description, \`condition\`, location, seller_id, seller_name, seller_email, seller_phone, whatsapp, negotiable, delivery_available, image_url, images, features, attributes, status, premium, featured)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                item.featured || 'No'
            ]);

            await connection.end();
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ success: true, message: 'Listing saved to Aiven Cloud MySQL', id })
            };
        }

        // DELETE: remove a listing by id (used by the seller's own "Delete Listing" button)
        if (event.httpMethod === 'DELETE') {
            const idMatch = event.path.match(/\/listings\/([^\/]+)$/);
            const id = idMatch ? decodeURIComponent(idMatch[1]) : null;
            if (!id) {
                await connection.end();
                return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: 'Missing listing id in URL.' }) };
            }
            await connection.query('DELETE FROM listings WHERE id = ?', [id]);
            await connection.end();
            return { statusCode: 200, headers, body: JSON.stringify({ success: true, message: 'Listing deleted.' }) };
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