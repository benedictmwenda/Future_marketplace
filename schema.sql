-- SokoHub TiDB schema (generated from lib/db.js; the app also creates these automatically).

CREATE TABLE IF NOT EXISTS users (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        password VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        photo_url LONGTEXT NULL,
        role ENUM('buyer','seller','admin') DEFAULT 'buyer',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_users_email (email)
    );

CREATE TABLE IF NOT EXISTS sessions (
        token_hash CHAR(64) PRIMARY KEY,
        user_id BIGINT NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        KEY idx_sessions_user (user_id),
        KEY idx_sessions_exp (expires_at)
    );

CREATE TABLE IF NOT EXISTS login_attempts (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        KEY idx_login_email_time (email, created_at)
    );

CREATE TABLE IF NOT EXISTS listings (
        id VARCHAR(100) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        subcategory VARCHAR(100),
        price DECIMAL(12,2) NOT NULL,
        description TEXT,
        `condition` VARCHAR(100) DEFAULT 'Used',
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
    );

CREATE TABLE IF NOT EXISTS listing_images (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        listing_id VARCHAR(100) NOT NULL,
        position INT NOT NULL DEFAULT 0,
        mime VARCHAR(100) NOT NULL,
        data LONGBLOB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        KEY idx_images_listing (listing_id)
    );

CREATE TABLE IF NOT EXISTS cart_items (
        user_id BIGINT NOT NULL,
        listing_id VARCHAR(100) NOT NULL,
        quantity INT NOT NULL DEFAULT 1,
        added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, listing_id)
    );

CREATE TABLE IF NOT EXISTS wishlist_items (
        user_id BIGINT NOT NULL,
        listing_id VARCHAR(100) NOT NULL,
        added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, listing_id)
    );

CREATE TABLE IF NOT EXISTS orders (
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
    );

CREATE TABLE IF NOT EXISTS order_items (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        order_id BIGINT NOT NULL,
        listing_id VARCHAR(100) NOT NULL,
        title VARCHAR(255) NOT NULL,
        price DECIMAL(12,2) NOT NULL,
        quantity INT NOT NULL,
        seller_email VARCHAR(255),
        KEY idx_items_order (order_id),
        KEY idx_items_seller (seller_email)
    );

CREATE TABLE IF NOT EXISTS contact_messages (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_newsletter_email (email)
    );
