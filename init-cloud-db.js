const mysql = require('mysql2/promise');
require('dotenv').config();

async function initCloudDB() {
    console.log('⏳ Connecting to Aiven Cloud MySQL Database...');
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: parseInt(process.env.DB_PORT),
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            ssl: { rejectUnauthorized: false }
        });

        console.log('✅ Connected successfully to Aiven MySQL!');

        const usersTable = `
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL UNIQUE,
                phone VARCHAR(50),
                role ENUM('buyer', 'seller') DEFAULT 'buyer',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `;

        const listingsTable = `
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
                views INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            );
        `;

        await connection.query(usersTable);
        console.log('✅ Users table created / verified in Aiven MySQL!');

        await connection.query(listingsTable);
        console.log('✅ Listings table created / verified in Aiven MySQL!');

        await connection.end();
        console.log('🎉 Cloud MySQL setup completed successfully!');
    } catch (err) {
        console.error('❌ Cloud DB setup error:', err.message);
    }
}

initCloudDB();
