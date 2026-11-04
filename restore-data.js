const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function restoreData() {
    const backupPath = path.join(__dirname, 'database-backup.json');
    if (!fs.existsSync(backupPath)) {
        console.error('❌ database-backup.json not found! Please run export-data.js first.');
        return;
    }

    const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    console.log(`⏳ Connecting to target database: ${process.env.DB_HOST}...`);

    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: parseInt(process.env.DB_PORT),
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            ssl: { rejectUnauthorized: false }
        });

        console.log('✅ Connected successfully!');

        // 1. Ensure tables exist
        console.log('🛠️ Creating / verifying tables in target database...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL UNIQUE,
                password VARCHAR(255),
                phone VARCHAR(50),
                photo_url LONGTEXT NULL,
                role ENUM('buyer', 'seller', 'admin') DEFAULT 'buyer',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS listings (
                id VARCHAR(100) PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                category VARCHAR(100) NOT NULL,
                subcategory VARCHAR(100),
                price DECIMAL(12,2) NOT NULL,
                description TEXT,
                \`condition\` VARCHAR(100) DEFAULT 'Used',
                location VARCHAR(255) NOT NULL,
                seller_id VARCHAR(255),
                seller_name VARCHAR(255) NOT NULL,
                seller_email VARCHAR(255),
                seller_phone VARCHAR(50) NOT NULL,
                whatsapp VARCHAR(50),
                negotiable VARCHAR(10) DEFAULT 'Yes',
                delivery_available VARCHAR(10) DEFAULT 'No',
                image_url LONGTEXT NOT NULL,
                images JSON,
                features JSON,
                attributes JSON,
                status VARCHAR(50) DEFAULT 'Available',
                premium VARCHAR(50) DEFAULT 'Normal',
                featured VARCHAR(10) DEFAULT 'No',
                views INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            );
        `);

        // 2. Restore Users
        console.log(`📥 Restoring ${backupData.users.length} user(s)...`);
        for (const user of backupData.users) {
            await connection.query(
                `INSERT INTO users (id, name, email, password, phone, role, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE name=VALUES(name), password=VALUES(password), phone=VALUES(phone), role=VALUES(role)`,
                [
                    user.id,
                    user.name,
                    user.email,
                    user.password || '',
                    user.phone || '',
                    user.role || 'buyer',
                    user.created_at ? new Date(user.created_at) : new Date()
                ]
            );
        }
        console.log('✅ Users restored.');

        // 3. Restore Listings
        console.log(`📥 Restoring ${backupData.listings.length} listing(s)...`);
        for (const item of backupData.listings) {
            const imagesJson = item.images ? JSON.stringify(item.images) : null;
            const featuresJson = item.features ? JSON.stringify(item.features) : null;
            const attributesJson = item.attributes ? JSON.stringify(item.attributes) : null;

            await connection.query(
                `INSERT INTO listings (
                    id, title, category, subcategory, price, description, \`condition\`, location,
                    seller_id, seller_name, seller_email, seller_phone, whatsapp, negotiable,
                    delivery_available, image_url, images, features, attributes, status,
                    premium, featured, views, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    title=VALUES(title),
                    price=VALUES(price),
                    category=VALUES(category),
                    description=VALUES(description),
                    status=VALUES(status)`,
                [
                    item.id,
                    item.title,
                    item.category,
                    item.subcategory || null,
                    item.price,
                    item.description || '',
                    item.condition || 'Used',
                    item.location,
                    item.seller_id || null,
                    item.seller_name,
                    item.seller_email || null,
                    item.seller_phone,
                    item.whatsapp || null,
                    item.negotiable || 'Yes',
                    item.delivery_available || 'No',
                    item.image_url,
                    imagesJson,
                    featuresJson,
                    attributesJson,
                    item.status || 'Available',
                    item.premium || 'Normal',
                    item.featured || 'No',
                    item.views || 0,
                    item.created_at ? new Date(item.created_at) : new Date(),
                    item.updated_at ? new Date(item.updated_at) : new Date()
                ]
            );
        }
        console.log('✅ Listings restored.');

        console.log('🎉 Migration / Restore completed successfully!');
        await connection.end();
    } catch (err) {
        console.error('❌ Restore error:', err.message);
    }
}

restoreData();

