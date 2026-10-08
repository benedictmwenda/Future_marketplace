// One-time (and reusable) migration: adds 'admin' as a valid role, then
// promotes the given email to admin. The account must already exist —
// sign up normally first, then run this against that email.
//
// Usage: node make-admin.js your@email.com
require('dotenv').config();
const mysql = require('mysql2/promise');

const targetEmail = process.argv[2];

if (!targetEmail) {
    console.error('Usage: node make-admin.js your@email.com');
    process.exit(1);
}

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
        // Widen the ENUM if it hasn't been already (safe to run repeatedly).
        await connection.query(`ALTER TABLE users MODIFY COLUMN role ENUM('buyer', 'seller', 'admin') DEFAULT 'buyer'`);
        console.log("role column now allows 'admin'.");

        const [existing] = await connection.query('SELECT id, role FROM users WHERE email = ?', [targetEmail]);
        if (existing.length === 0) {
            console.error(`No account found for ${targetEmail} — sign up on the site first, then run this again.`);
            process.exit(1);
        }

        await connection.query('UPDATE users SET role = ? WHERE email = ?', ['admin', targetEmail]);
        console.log(`${targetEmail} is now an admin.`);
    } catch (err) {
        console.error('Migration failed:', err.message);
    } finally {
        await connection.end();
    }
}

run();
