const mysql = require('mysql2/promise');
require('dotenv').config();

async function seedSampleItem() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: parseInt(process.env.DB_PORT),
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            ssl: { rejectUnauthorized: false }
        });

        const sampleItem = {
            id: 'sh_sample_' + Date.now(),
            title: '2020 Subaru Forester 2.0L EyeSight',
            category: 'Vehicles',
            subcategory: 'Cars',
            price: 2850000,
            description: 'Immaculate 2020 Subaru Forester EyeSight edition. Low genuine mileage, pearl white, sunroof, leather seats, 360 camera, NTSA ready.',
            condition: 'Used — Excellent',
            location: 'Westlands, Nairobi',
            seller_id: 'beneditc64@gmail.com',
            seller_name: 'SokoHub Motors',
            seller_email: 'beneditc64@gmail.com',
            seller_phone: '+254794536597',
            whatsapp: '+254794536597',
            negotiable: 'Yes',
            delivery_available: 'Yes',
            image_url: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&auto=format&fit=crop&q=60',
            images: JSON.stringify(['https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&auto=format&fit=crop&q=60']),
            features: JSON.stringify(['⚙️ 2.0L Boxer Engine', '🛡️ EyeSight Safety System', '☀️ Panoramic Sunroof']),
            attributes: JSON.stringify({ make: 'Subaru', model: 'Forester', year: '2020', mileage: '34,000 km' }),
            status: 'Available',
            premium: 'Featured'
        };

        const query = `
            INSERT INTO listings 
            (id, title, category, subcategory, price, description, \`condition\`, location, seller_id, seller_name, seller_email, seller_phone, whatsapp, negotiable, delivery_available, image_url, images, features, attributes, status, premium)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        await connection.query(query, [
            sampleItem.id, sampleItem.title, sampleItem.category, sampleItem.subcategory, sampleItem.price,
            sampleItem.description, sampleItem.condition, sampleItem.location, sampleItem.seller_id,
            sampleItem.seller_name, sampleItem.seller_email, sampleItem.seller_phone, sampleItem.whatsapp,
            sampleItem.negotiable, sampleItem.delivery_available, sampleItem.image_url, sampleItem.images,
            sampleItem.features, sampleItem.attributes, sampleItem.status, sampleItem.premium
        ]);

        console.log('✅ Sample listing added to Aiven Cloud MySQL!');
        await connection.end();
    } catch (err) {
        console.error('Error seeding DB:', err.message);
    }
}

seedSampleItem();
