QAQA Marketplace
================

QAQA Marketplace is a digital marketplace that connects buyers and sellers in one simple online platform. Users can discover products and services, view detailed listings, contact sellers, and manage their shopping activity. Sellers can create and publish listings with prices, images, descriptions, location, condition, contact details, features, and delivery information.

The project is designed for a local marketplace experience, similar to a classifieds platform, while providing a foundation that can grow into a complete e-commerce solution. The initial buying experience focuses on helping customers find suitable items and contact sellers directly. Online payments, order processing, and delivery integrations are planned for later phases.

Current features
----------------
- Responsive homepage with product categories and recent listings.
- Shop page with listing filters, search, product cards, and quick view.
- Product detail pages with images, descriptions, features, seller information, and item metadata.
- Buyer authentication and account registration.
- Seller portal for adding and updating marketplace listings.
- Listing support for categories, subcategories, pricing, condition, location, negotiability, and delivery availability.
- Shopping cart, checkout, wishlist, and contact pages for the wider commerce experience.
- Blog and content pages for marketplace information and updates.
- MySQL-backed API for reading, creating, updating, and deleting listings.
- Support for local MySQL development and cloud MySQL deployment through environment variables.

How the marketplace works
-------------------------
1. A buyer browses categories or searches for a listing.
2. The buyer opens a quick view or full details page to review the item.
3. The buyer checks the seller and contact information and can continue through the cart or checkout experience.
4. A seller signs in to the seller portal and publishes a listing with its details and images.
5. Listings are stored in MySQL and made available to the storefront through the API.

Technology
----------
- Frontend: HTML, CSS, Bootstrap, JavaScript, jQuery, and reusable marketplace scripts.
- Backend: Node.js, Express, and MySQL2.
- Database: MySQL, with schema and seed scripts included in the repository.
- Deployment: Netlify/Vercel-compatible serverless listing function, with cloud database configuration support.

Running the project locally
---------------------------
1. Install dependencies:

	npm install

2. Configure the database environment variables in a local `.env` file:

	DB_HOST=localhost
	DB_PORT=3306
	DB_USER=root
	DB_PASSWORD=your_password
	DB_NAME=sokohub

3. Create the database tables using `schema.sql` and load sample data if needed.

4. Start the API server:

	npm start

The backend runs on `http://localhost:5000` by default. The static HTML pages can be opened through a local web server, or served using the hosting configuration included in the project.

Planned development
-------------------
- Phase 1: strengthen the MVP with seller dashboards, listing moderation, categories, search, filters, and direct seller contact.
- Phase 2: introduce featured listings, premium seller accounts, paid listings, seller analytics, and advertising.
- Phase 3: complete the e-commerce workflow with M-Pesa payments, order tracking, commissions, and seller payouts.
- Phase 4: expand with mobile apps, in-app chat, push notifications, reviews, recommendations, and delivery integration.

Project status
--------------
QAQA Marketplace is an active MVP in development. The storefront, seller listing workflow, authentication pages, and MySQL listing API are in place. Payment processing, full order management, moderation tools, and production delivery workflows remain part of the planned roadmap.

Template attribution
--------------------
This project was originally built from a Colorlib template. For more templates, visit https://colorlib.com/wp/templates/.

Copyright information for the template cannot be altered or removed unless the appropriate license has been purchased. More information is available at https://colorlib.com/wp/licence/.
