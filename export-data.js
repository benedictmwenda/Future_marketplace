const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function exportData() {
    console.log('⏳ Connecting to current database to export data...');
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

        // Fetch users
        const [users] = await connection.query('SELECT * FROM users');
        console.log(`📦 Retrieved ${users.length} user(s).`);

        // Fetch listings
        const [listings] = await connection.query('SELECT * FROM listings');
        console.log(`📦 Retrieved ${listings.length} listing(s).`);

        const backupData = {
            exportedAt: new Date().toISOString(),
            users,
            listings
        };

        const backupPath = path.join(__dirname, 'database-backup.json');
        fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2), 'utf8');

        console.log(`💾 Backup successfully saved to ${backupPath}`);
        await connection.end();
    } catch (err) {
        console.error('❌ Error exporting data:', err.message);
    }
}

exportData();

