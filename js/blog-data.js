const sokohubBlogPosts = [
    {
        slug: "iphone-15-pro-max-vs-samsung-s24-ultra",
        title: "iPhone 15 Pro Max vs Samsung S24 Ultra: Kenya Buyer's Guide",
        category: "Tech & Electronics",
        categoryClass: "tech",
        date: "July 18, 2026",
        comments: 12,
        author: "Benedict Mwenda",
        image: "https://i.pinimg.com/736x/c9/69/3d/c9693d8273e8819f2646052d7392093b.jpg",
        excerpt: "Compare performance, battery life, camera quality, and resale value before buying your next flagship phone in Kenya.",
        paragraphs: [
            "When shopping for a flagship smartphone in Kenya, the choice often comes down to Apple's iPhone 15 Pro Max and Samsung's Galaxy S24 Ultra. Both devices command premium prices in Nairobi, so an informed decision matters before you contact a seller.",
            "Apple remains strong on long-term software support and resale value, while Samsung offers a versatile camera system, a brighter display, and faster wired charging. Compare the complete package with your daily needs rather than choosing by brand alone.",
            "Always check the IMEI, confirm the device is not carrier-locked, and ask for a receipt or warranty before paying. A verified SokoHub seller should be able to answer those questions clearly."
        ],
        tags: "iPhone 15, Samsung S24, Nairobi Tech"
    },
    {
        slug: "fuel-efficient-cars-kenya",
        title: "Top 5 Most Fuel-Efficient Cars in Kenya for Daily Commuting",
        category: "Vehicles & Mobility",
        categoryClass: "vehicles",
        date: "July 14, 2026",
        comments: 8,
        author: "SokoHub Mobility Desk",
        image: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=80",
        excerpt: "A practical shortlist of economical cars for Nairobi traffic, highway trips, and everyday errands.",
        paragraphs: [
            "Fuel economy is one of the most important ownership costs for Kenyan commuters. Compact hatchbacks, efficient hybrids, and small engines can make a major difference when traffic keeps you on the road for hours.",
            "Before buying, compare the advertised consumption with service history, tyre condition, engine health, and the availability of spare parts locally. A well-maintained used car is usually a better buy than a neglected car with an impressive specification sheet.",
            "Arrange an inspection and test drive through a trusted seller. Check the logbook and chassis number, and do not send a deposit until the vehicle and ownership documents have been verified."
        ],
        tags: "Cars, Fuel Economy, Vehicle Inspection"
    },
    {
        slug: "nairobi-house-hunting-checklist",
        title: "House Hunting in Nairobi: What to Inspect Before Paying Deposit",
        category: "Real Estate & Rentals",
        categoryClass: "rentals",
        date: "July 10, 2026",
        comments: 15,
        author: "SokoHub Property Desk",
        image: "https://images.unsplash.com/photo-1560185008-b033106af5c3?auto=format&fit=crop&w=1200&q=80",
        excerpt: "Use this inspection checklist to compare apartments, understand extra costs, and avoid surprises after moving in.",
        paragraphs: [
            "A viewing should be more than a quick walk through an attractive room. Test taps and sockets, inspect locks and windows, ask about water reliability, and check how much natural light reaches the space during the day.",
            "Get every cost in writing, including service charge, parking, utilities, internet installation, and the exact deposit refund terms. A clear tenancy agreement protects both the tenant and the landlord.",
            "Use SokoHub to compare locations and contact property owners directly, then verify the viewing address before sharing personal documents or sending money."
        ],
        tags: "Nairobi Rentals, Apartments, Tenant Tips"
    },
    {
        slug: "verified-seller-buyer-protection",
        title: "How SokoHub Verified Seller Badges Protect Buyers",
        category: "Marketplace Safety",
        categoryClass: "safety",
        date: "July 05, 2026",
        comments: 22,
        author: "SokoHub Trust & Safety",
        image: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1200&q=80",
        excerpt: "Learn what to check before a marketplace transaction and how verified seller signals make buying online safer.",
        paragraphs: [
            "A verified badge is a useful trust signal, but it is only one part of a safe transaction. Read the seller profile, inspect the listing photos, and keep your questions and agreements in the SokoHub conversation.",
            "Never share a one-time password or send money to a different account because a seller is applying pressure. For high-value items, meet in a public place or use a documented delivery and inspection process.",
            "If a listing feels inconsistent, report it before completing payment. Fast reporting helps protect other buyers and gives the SokoHub team the context needed to investigate."
        ],
        tags: "Buyer Protection, M-Pesa Safety, Verified Sellers"
    },
    {
        slug: "kenyan-fashion-designers",
        title: "Discover Top Local African Print Fashion Designers on SokoHub",
        category: "Fashion & Clothing",
        categoryClass: "fashion",
        date: "June 28, 2026",
        comments: 7,
        author: "SokoHub Style Desk",
        image: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1200&q=80",
        excerpt: "Find distinctive Kenyan fashion from independent designers, tailors, and makers who bring local craft to modern wardrobes.",
        paragraphs: [
            "Local designers make it easier to find clothing with personality, from tailored suits to Kitenge dresses and handmade accessories. Start with measurements, fabric details, and a clear delivery timeline.",
            "Ask sellers whether an item is ready-made or made to order, and confirm alteration options before paying. Clear photos in natural light will help you judge colour, texture, and finishing.",
            "Supporting local makers keeps more value in the community while giving buyers access to pieces that are less likely to look like everything else on the high street."
        ],
        tags: "Kitenge, Kenyan Designers, Handmade Fashion"
    },
    {
        slug: "high-converting-product-listings",
        title: "How to Create High-Converting Product Listings on SokoHub",
        category: "Seller Guides",
        categoryClass: "seller",
        date: "June 20, 2026",
        comments: 19,
        author: "SokoHub Seller Success",
        image: "https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=1200&q=80",
        excerpt: "Improve your product listings with clearer photos, honest descriptions, and pricing that earns buyer confidence.",
        paragraphs: [
            "The strongest listings answer a buyer's first questions immediately: what is being sold, what condition is it in, where is it located, and what does it cost? Use a specific title instead of a vague phrase like 'best quality item'.",
            "Take several sharp photos in good light and show important details honestly. Mention scratches, age, included accessories, and any service history so the right buyer can make a confident decision.",
            "Respond promptly, keep the price and availability current, and offer a practical collection or delivery option. Good communication turns interest into a completed sale."
        ],
        tags: "Seller Tips, Product Photos, Marketplace Growth"
    }
];

function blogDetailsUrl(slug) {
    return `./blog-details.html?post=${encodeURIComponent(slug)}`;
}
