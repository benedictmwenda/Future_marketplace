const mysql = require('mysql2/promise');
require('dotenv').config();

async function updateUsersTable() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: parseInt(process.env.DB_PORT),
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            ssl: { rejectUnauthorized: false }
        });

        try {
            await connection.query('ALTER TABLE users ADD COLUMN password VARCHAR(255) NOT NULL AFTER email');
            console.log('✅ Added password column to MySQL users table!');
        } catch (e) {
            console.log('Notice (password column):', e.message);
        }

        await connection.end();
    } catch (err) {
        console.error('Error updating users table:', err.message);
    }
}

updateUsersTable();
