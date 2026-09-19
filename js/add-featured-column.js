// One-time migration: adds a `featured` column to the listings table.
// Run this once against your live database: node add-featured-column.js
require('dotenv').config();
const mysql = require('mysql2/promise');

async function run() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl: { rejectUnauthorized: false }
    });

    try {
        const [existing] = await connection.query(
            `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'listings' AND COLUMN_NAME = 'featured'`,
            [process.env.DB_NAME]
        );

        if (existing.length > 0) {
            console.log('featured column already exists — nothing to do.');
        } else {
            await connection.query(`ALTER TABLE listings ADD COLUMN featured VARCHAR(10) DEFAULT 'No' AFTER premium`);
            console.log('Added featured column to listings table.');
        }
    } catch (err) {
        console.error('Migration failed:', err.message);
    } finally {
        await connection.end();
    }
}

run();
