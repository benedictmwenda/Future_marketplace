const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkItems() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: parseInt(process.env.DB_PORT),
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            ssl: { rejectUnauthorized: false }
        });

        const [rows] = await connection.query('SELECT id, title, price, category, created_at FROM listings');
        console.log('📊 Current Items in Aiven MySQL Database:', rows.length);
        console.log(JSON.stringify(rows, null, 2));

        await connection.end();
    } catch (err) {
        console.error('Error checking DB:', err.message);
    }
}

checkItems();
