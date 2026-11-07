'use strict';
// TiDB connection + schema bootstrap. TiDB speaks the MySQL protocol, so mysql2 is used.
// Every value the site stores (users, sessions, listings, photos, cart, wishlist,
// orders, messages, newsletter) lives in these tables — nothing is kept in files.
const mysql = require('mysql2/promise');

let pool = null;
let schemaPromise = null;

function sslConfig() {
    if (String(process.env.DB_SSL).toLowerCase() === 'false') return undefined;
    const cfg = {
        minVersion: 'TLSv1.2',
        // TiDB Cloud presents a publicly trusted certificate, so verification works
        // out of the box. Only set DB_SSL_REJECT_UNAUTHORIZED=false as a last resort.
        rejectUnauthorized: String(process.env.DB_SSL_REJECT_UNAUTHORIZED).toLowerCase() !== 'false'
    };
    if (process.env.DB_SSL_CA) cfg.ca = process.env.DB_SSL_CA.replace(/\\n/g, '\n');
    return cfg;
}

function getPool() {
    if (!pool) {
        for (const k of ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME']) {
            if (!process.env[k]) throw new Error('Missing environment variable ' + k);
        }
        pool = mysql.createPool({
            host: process.env.DB_HOST,
            port: parseInt(process.env.DB_PORT || '4000', 10),
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            ssl: sslConfig(),
            charset: 'utf8mb4',
            waitForConnections: true,
            connectionLimit: parseInt(process.env.DB_POOL || '4', 10),
            queueLimit: 0,
            enableKeepAlive: true,
            connectTimeout: 10000
        });
    }
    return pool;
}

const TABLES = [
    `CREATE TABLE IF NOT EXISTS users (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        password VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        photo_url LONGTEXT NULL,
        role ENUM('buyer','seller','admin') DEFAULT 'buyer',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_users_email (email)
    )`,
    `CREATE TABLE IF NOT EXISTS sessions (
        token_hash CHAR(64) PRIMARY KEY,
        user_id BIGINT NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        KEY idx_sessions_user (user_id),
        KEY idx_sessions_exp (expires_at)
    )`,
    `CREATE TABLE IF NOT EXISTS login_attempts (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        KEY idx_login_email_time (email, created_at)
    )`,
    `CREATE TABLE IF NOT EXISTS listings (
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
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY idx_listings_seller (seller_email),
        KEY idx_listings_created (created_at)
    )`,
    // Listing photos are stored in TiDB (one row per photo) instead of as base64 text
    // inside the listing row, so list queries stay small and fast.
    `CREATE TABLE IF NOT EXISTS listing_images (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        listing_id VARCHAR(100) NOT NULL,
        position INT NOT NULL DEFAULT 0,
        mime VARCHAR(100) NOT NULL,
        data LONGBLOB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        KEY idx_images_listing (listing_id)
    )`,
    `CREATE TABLE IF NOT EXISTS cart_items (
        user_id BIGINT NOT NULL,
        listing_id VARCHAR(100) NOT NULL,
        quantity INT NOT NULL DEFAULT 1,
        added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, listing_id)
    )`,
    `CREATE TABLE IF NOT EXISTS wishlist_items (
        user_id BIGINT NOT NULL,
        listing_id VARCHAR(100) NOT NULL,
        added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, listing_id)
    )`,
    `CREATE TABLE IF NOT EXISTS orders (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT NOT NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'Pending',
        payment_method VARCHAR(20) NOT NULL DEFAULT 'mpesa',
        subtotal DECIMAL(12,2) NOT NULL,
        commission DECIMAL(12,2) NOT NULL,
        delivery_fee DECIMAL(12,2) NOT NULL,
        discount DECIMAL(12,2) NOT NULL,
        total DECIMAL(12,2) NOT NULL,
        buyer_name VARCHAR(255) NOT NULL,
        buyer_email VARCHAR(255),
        buyer_phone VARCHAR(50) NOT NULL,
        city VARCHAR(255),
        address VARCHAR(500) NOT NULL,
        address2 VARCHAR(255),
        area VARCHAR(255),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        KEY idx_orders_user (user_id)
    )`,
    `CREATE TABLE IF NOT EXISTS order_items (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        order_id BIGINT NOT NULL,
        listing_id VARCHAR(100) NOT NULL,
        title VARCHAR(255) NOT NULL,
        price DECIMAL(12,2) NOT NULL,
        quantity INT NOT NULL,
        seller_email VARCHAR(255),
        KEY idx_items_order (order_id),
        KEY idx_items_seller (seller_email)
    )`,
    `CREATE TABLE IF NOT EXISTS contact_messages (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS newsletter_subscribers (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_newsletter_email (email)
    )`
];

async function hasColumn(p, table, column) {
    const [rows] = await p.query(
        'SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ? LIMIT 1',
        [table, column]
    );
    return rows.length > 0;
}

// Brings tables created by the older scripts (init-cloud-db.js etc.) up to date.
async function upgradeOldTables(p) {
    const adds = [
        ['users', 'password', "ALTER TABLE users ADD COLUMN password VARCHAR(255) NOT NULL DEFAULT '' AFTER email"],
        ['users', 'photo_url', 'ALTER TABLE users ADD COLUMN photo_url LONGTEXT NULL'],
        ['listings', 'featured', "ALTER TABLE listings ADD COLUMN featured VARCHAR(10) DEFAULT 'No' AFTER premium"],
        ['listings', 'views', 'ALTER TABLE listings ADD COLUMN views INT DEFAULT 0']
    ];
    for (const [t, c, ddl] of adds) {
        if (!(await hasColumn(p, t, c))) await p.query(ddl);
    }
    // Safe to repeat: makes sure 'admin' is an allowed role.
    await p.query("ALTER TABLE users MODIFY COLUMN role ENUM('buyer','seller','admin') DEFAULT 'buyer'");
}

function ensureSchema() {
    if (String(process.env.SKIP_SCHEMA_CHECK).toLowerCase() === 'true') return Promise.resolve();
    if (!schemaPromise) {
        schemaPromise = (async () => {
            const p = getPool();
            for (const ddl of TABLES) await p.query(ddl);
            await upgradeOldTables(p);
        })().catch((err) => { schemaPromise = null; throw err; });
    }
    return schemaPromise;
}

module.exports = { getPool, ensureSchema, TABLES };
