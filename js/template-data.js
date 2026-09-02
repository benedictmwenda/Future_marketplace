// ==========================================
// 1. DATA DEFINITIONS
// ==========================================

const navigationLinks = [
    { title: "Home", url: "./index.html", active: true },
    { title: "Shop", url: "./shop-grid.html" },
    { 
        title: "Account", 
        url: "#", 
        dropdown: [
            { title: "Shop Details", url: "./shop-details.html" },
            { title: "Shoping Cart", url: "./shoping-cart.html" },
            { title: "Check_Out", url: "./checkout.html" },
        ] 
    },
    { title: "Blog", url: "./blog.html" },
    { title: "Contact", url: "./contact.html" }
];

const socialMedia = [
    { icon: "fa-facebook", url: "#" },
    { icon: "fa-twitter", url: "#" },
    { icon: "fa-linkedin", url: "#" },
    { icon: "fa-pinterest-p", url: "#" },
    { icon: "fa-instagram", url: "#" } // Automatically used on footer social wrapper
];

const heroDepartments = [
  {
    name: "Vehicles",
    items: [
      "Cars",
      "Motorcycles",
      "Trucks",
      "Buses",
      "Spare Parts",
      "Tyres & Wheels",
      "Car Accessories",
      "Boats"
    ]
  },
  {
    name: "Property",
    items: [
      "Houses for Sale",
      "Houses for Rent",
      "Apartments",
      "Land & Plots",
      "Commercial Property",
      "Hostels",
      "Office Space"
    ]
  },
  {
    name: "Electronics",
    items: [
      "Mobile Phones",
      "Laptops",
      "Desktop Computers",
      "Televisions",
      "Gaming Consoles",
      "Cameras",
      "Accessories"
    ]
  },
  {
    name: "Fashion & Beauty",
    items: [
      "Men's Fashion",
      "Women's Fashion",
      "Shoes",
      "Bags",
      "Watches",
      "Jewellery",
      "Beauty Products"
    ]
  },
  {
    name: "Home & Furniture",
    items: [
      "Sofas",
      "Beds",
      "Dining Tables",
      "Wardrobes",
      "Kitchen Appliances",
      "Home Decor"
    ]
  },
  {
    name: "Food & Restaurants",
    items: [
      "Restaurants",
      "Fast Food",
      "Hotels",
      "Cafes",
      "Groceries",
      "Bakery"
    ]
  },
  {
    name: "Online Computer Service",
    items: [
      "Graphic Design",
      "Software Development",
      "Photography",
      "Digital Marketing"
    ]
  },
  {
    name: "Jobs",
    items: [
      "Full-Time",
      "Part-Time",
      "Internships",
      "Remote Jobs",
      "Freelance"
    ]
  },
  {
    name: "Education",
    items: [
      "Schools",
      "Colleges",
      "Universities",
      "Tutors",
      "Online Courses"
    ]
  },
  {
    name: "Events",
    items: [
      "Wedding Services",
      "Birthdays",
      "Conference Halls",
      "Event Planning",
      "Catering"
    ]
  },
  {
    name: "Agriculture",
    items: [
      "Livestock",
      "Farm Produce",
      "Farm Equipment",
      "Seeds",
      "Fertilizers"
    ]
  }
];

const productCategories = [
    { title: "Vehicle", img: "img/categories/cat-1.jpg", url: "#" },
    { title: "Property", img: "img/categories/cat-2.jpg", url: "#" },
    { title: "Electronics", img: "img/categories/cat-3.jpg", url: "#" },
    { title: "Fashion & Beauty", img: "img/categories/cat-4.jpg", url: "#" },
    { title: "Home & Furniture", img: "img/categories/cat-5.jpg", url: "#" }
];

const featuredProducts = [
    { name: "2017 BMW X1", price: "KSH 3,150,000", img: "img/featured/feature-1.jpg", tags: "vehicles vehicles" },
    { name: "iPhone 15 Pro Max", price: "KSH 120,000.00", img: "img/featured/feature-2.jpg", tags: "Electronics fastfood" },
    { name: "Designer Handbag", price: "KSH 25,000.00", img: "img/featured/feature-3.jpg", tags: "Electronics fresh-meat" },
    { name: "3 Bedroom Apartment", price: "KSH 75,000.00", img: "img/featured/feature-4.jpg", tags: "fastfood oranges" },
    { name: "Senior Web Developer", price: "KSH 3,500.00/month", img: "img/featured/feature-5.jpg", tags: "fresh-meat Electronics" },
    { name: "Wedding Services", price: "KSH 5,000.00", img: "img/featured/feature-6.jpg", tags: "oranges fastfood" },
    { name: "Crab Pool Security", price: "KSH 30.00", img: "img/featured/feature-7.jpg", tags: "fresh-meat Electronics" },
    { name: "Crab Pool Security", price: "KSH 30.00", img: "img/featured/feature-8.jpg", tags: "fastfood Electronics" }
];

// =============================================
// QAQA — Quick View Modal Logic
// =============================================
document.addEventListener('DOMContentLoaded', function () {

    const overlay = document.getElementById('quickViewOverlay');
    const modal   = document.getElementById('quickViewModal');
    const closeBtn= document.getElementById('quickViewClose');

    // Registry for seller-posted listings so the quick view can render
    // ALL data saved by the seller (features[], attributes{}, images[], ...).
    // Keyed by listing id; populated by sokohub-firebase.js render functions.
    window.quickViewItems = window.quickViewItems || {};

    // Helper: build feature tag pills, supporting BOTH the legacy string
    // format ("⚙️:A|B;🛡️:C") and the new array format (["Bluetooth", ...]).
    function renderQvFeatures(featuresContainer, rawFeatures) {
        featuresContainer.innerHTML = '';
        if (!rawFeatures) {
            document.getElementById('qv-features-wrapper').style.display = 'none';
            return;
        }

        const isArray = Array.isArray(rawFeatures);
        if (!isArray && !String(rawFeatures).trim()) {
            document.getElementById('qv-features-wrapper').style.display = 'none';
            return;
        }

        if (isArray) {
            // New format: flat array of feature strings (may include prefixed ✓)
            const tagsEl = document.createElement('div');
            tagsEl.className = 'qv-feature-tags';
            rawFeatures.forEach(function (ft) {
                if (!ft) return;
                const pill = document.createElement('span');
                pill.className = 'qv-tag';
                pill.textContent = ft.replace(/^✓\s*/i, '') + ' ✓';
                tagsEl.appendChild(pill);
            });
            const groupEl = document.createElement('div');
            groupEl.className = 'qv-feature-group';
            const emojiEl = document.createElement('span');
            emojiEl.className = 'qv-feature-emoji';
            emojiEl.textContent = '⭐';
            groupEl.appendChild(emojiEl);
            groupEl.appendChild(tagsEl);
            featuresContainer.appendChild(groupEl);
        } else {
            // Legacy format: "emoji:tag1|tag2;emoji2:tag3"
            const groups = String(rawFeatures).split(';');
            groups.forEach(function (group) {
                const colonIdx = group.indexOf(':');
                if (colonIdx === -1) return;
                const emoji = group.substring(0, colonIdx).trim();
                const tags  = group.substring(colonIdx + 1)
                                    .split('|')
                                    .map(t => t.trim())
                                    .filter(t => t.length > 0);
                if (tags.length === 0) return;
                const groupEl = document.createElement('div');
                groupEl.className = 'qv-feature-group';
                const emojiEl = document.createElement('span');
                emojiEl.className = 'qv-feature-emoji';
                emojiEl.textContent = emoji;
                const tagsEl = document.createElement('div');
                tagsEl.className = 'qv-feature-tags';
                tags.forEach(function (tag) {
                    const pill = document.createElement('span');
                    pill.className = 'qv-tag';
                    pill.textContent = tag;
                    tagsEl.appendChild(pill);
                });
                groupEl.appendChild(emojiEl);
                groupEl.appendChild(tagsEl);
                featuresContainer.appendChild(groupEl);
            });
        }
        document.getElementById('qv-features-wrapper').style.display = 'block';
    }

    // Helper: build the Details (attributes{}) section from the DB schema.
    function renderQvAttributes(attrs) {
        const wrapper = document.getElementById('qv-attributes-wrapper');
        const list    = document.getElementById('qv-attributes-list');
        list.innerHTML = '';
        if (!attrs || typeof attrs !== 'object' || Object.keys(attrs).length === 0) {
            wrapper.style.display = 'none';
            return;
        }
        Object.keys(attrs).forEach(function (key) {
            const val = attrs[key];
            if (val === undefined || val === null || val === '') return;
            const row = document.createElement('div');
            row.className = 'qv-attr-row';
            const label = document.createElement('span');
            label.className = 'qv-attr-label';
            label.textContent = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) + ':';
            const value = document.createElement('span');
            value.className = 'qv-attr-value';
            value.textContent = val;
            row.appendChild(label);
            row.appendChild(value);
            list.appendChild(row);
        });
        wrapper.style.display = list.childNodes.length ? 'block' : 'none';
    }

    // Populate the whole modal from a full listing object (seller data).
    function populateFromItem(item) {
        item = item || {};
        const mainImage = (item.images && item.images[0]) || item.imageUrl || '';
        document.getElementById('qv-img').src               = mainImage;
        document.getElementById('qv-img').alt               = item.title || 'Item';
        document.getElementById('qv-name').textContent      = item.title || 'No Title';
        document.getElementById('qv-price').textContent     = (typeof item.price === 'number' ? 'KSH ' + item.price.toLocaleString() : (item.price || ''));
        document.getElementById('qv-category').textContent  = item.category || item.listingType || '';
        document.getElementById('qv-desc').textContent      = item.description || '';
        document.getElementById('qv-location').textContent  = item.location || '—';
        document.getElementById('qv-condition').textContent = item.condition || '—';
        document.getElementById('qv-seller').textContent    = item.sellerName || item.sellerEmail || 'Verified Seller';

        // Badges (status + premium)
        const badgesEl = document.getElementById('qv-badges');
        badgesEl.innerHTML = '';
        if (item.status) {
            const pills = ['Available', 'Sold', 'Reserved', 'Out of Stock'];
            const cls = pills.indexOf(item.status) !== -1 ? item.status.toLowerCase().replace(/\s+/g, '-') : 'available';
            badgesEl.insertAdjacentHTML('beforeend',
                '<span class="qv-status-badge qv-status-' + cls + '">' + item.status + '</span>');
        }
        if (item.premium && item.premium !== 'Normal') {
            badgesEl.insertAdjacentHTML('beforeend',
                '<span class="qv-status-badge qv-premium">' + item.premium + '</span>');
        } else if (item.featured) {
            badgesEl.insertAdjacentHTML('beforeend',
                '<span class="qv-status-badge qv-premium">Featured</span>');
        }

        // Thumbnails for all images
        const thumbsEl = document.getElementById('qv-thumbs');
        thumbsEl.innerHTML = '';
        if (item.images && item.images.length > 1) {
            item.images.forEach(function (src, idx) {
                const img = document.createElement('img');
                img.src = src;
                img.className = 'qv-thumb' + (idx === 0 ? ' active' : '');
                img.alt = 'Photo ' + (idx + 1);
                img.addEventListener('click', function () {
                    document.getElementById('qv-img').src = src;
                    document.querySelectorAll('.qv-thumb').forEach(t => t.classList.remove('active'));
                    img.classList.add('active');
                });
                thumbsEl.appendChild(img);
            });
        }

        // Features + Attributes + Extras
        renderQvFeatures(document.getElementById('qv-features-list'), item.features || item.featuresList);
        renderQvAttributes(item.attributes);
        renderQvExtras(item);
    }

    // Helper: build the "Seller Info & Extras" section (extra fields from the
    // post-item form + DB schema: subcategory, contact, delivery, negotiable,
    // status, views, dates ...). This makes ALL seller data visible in QV.
    function renderQvExtras(item) {
        item = item || {};
        const wrapper = document.getElementById('qv-extra');
        const list    = document.getElementById('qv-extra-list');
        if (!wrapper || !list) return;
        list.innerHTML = '';

        const rows = [];

        if (item.subcategory)            rows.push(['Subcategory', item.subcategory]);
        if (item.sellerName)             rows.push(['Seller', item.sellerName]);
        if (item.sellerEmail)            rows.push(['Email', item.sellerEmail]);
        if (item.sellerPhone)            rows.push(['Phone', item.sellerPhone]);
        if (item.whatsapp)               rows.push(['WhatsApp', item.whatsapp]);
        if (item.negotiable)             rows.push(['Negotiable', String(item.negotiable) === 'true' || item.negotiable === true ? 'Yes' : 'No']);
        if (item.deliveryAvailable)      rows.push(['Delivery', String(item.deliveryAvailable) === 'true' || item.deliveryAvailable === true ? 'Available' : 'No']);
        if (item.status)                 rows.push(['Status', item.status]);
        if (item.premium && item.premium !== 'Normal') rows.push(['Listing Type', item.premium]);
        if (typeof item.views === 'number') rows.push(['Views', item.views]);
        if (item.createdAt)              rows.push(['Posted', formatQvDate(item.createdAt)]);
        if (item.updatedAt)              rows.push(['Updated', formatQvDate(item.updatedAt)]);

        if (rows.length === 0) {
            wrapper.style.display = 'none';
            return;
        }

        rows.forEach(function (pair) {
            const row = document.createElement('div');
            row.className = 'qv-attr-row';
            const label = document.createElement('span');
            label.className = 'qv-attr-label';
            label.textContent = pair[0] + ':';
            const value = document.createElement('span');
            value.className = 'qv-attr-value';
            value.textContent = pair[1];
            row.appendChild(label);
            row.appendChild(value);
            list.appendChild(row);
        });
        wrapper.style.display = 'block';
    }

    function formatQvDate(value) {
        try {
            if (!value) return '';
            if (typeof value === 'object' && value.toDate) {
                // Firestore Timestamp
                return value.toDate().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
            }
            const d = new Date(value);
            if (isNaN(d.getTime())) return String(value);
            return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
        } catch (e) {
            return String(value);
        }
    }

    // Populate the modal from legacy data-* attributes (static demo items).
    function populateFromData(btn) {
        document.getElementById('qv-img').src               = btn.dataset.img       || '';
        document.getElementById('qv-img').alt               = btn.dataset.name      || 'Item';
        document.getElementById('qv-name').textContent      = btn.dataset.name      || 'No Title';
        document.getElementById('qv-price').textContent     = btn.dataset.price     || '';
        document.getElementById('qv-category').textContent  = btn.dataset.category  || '';
        document.getElementById('qv-desc').textContent      = btn.dataset.desc      || '';
        document.getElementById('qv-location').textContent  = btn.dataset.location  || '—';
        document.getElementById('qv-condition').textContent = btn.dataset.condition || '—';
        document.getElementById('qv-seller').textContent    = btn.dataset.seller    || '—';

        document.getElementById('qv-badges').innerHTML = '';
        document.getElementById('qv-thumbs').innerHTML = '';
        renderQvFeatures(document.getElementById('qv-features-list'), btn.dataset.features || '');
        renderQvAttributes(null);
        // Legacy demo items have no extras → hide that section
        const extraWrap = document.getElementById('qv-extra');
        if (extraWrap) extraWrap.style.display = 'none';
    }

    // Open modal when eye button is clicked
    document.addEventListener('click', function (e) {
        const btn = e.target.closest('.quick-view-btn');
        if (!btn) return;
        e.preventDefault();

        // If the button references a seller listing id, render ALL its data.
        const qvId = btn.dataset.qvId;
        const item = qvId && window.quickViewItems ? window.quickViewItems[qvId] : null;
        const detailsLink = document.getElementById('qv-link-details');
        if (item) {
            populateFromItem(item);
            if (detailsLink) detailsLink.href = 'shop-details.html?id=' + encodeURIComponent(item.id);
        } else {
            populateFromData(btn);
            if (detailsLink) detailsLink.href = 'shop-details.html';
        }

        // ── Show modal ─────────────────────────────────
        overlay.style.display = 'block';
        modal.classList.add('active');
        document.body.style.overflow = 'hidden'; // prevent background scroll
    });

    // Close on overlay click
    overlay.addEventListener('click', closeModal);

    // Close on X button
    closeBtn.addEventListener('click', closeModal);

    // Close on Escape key
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeModal();
    });

    function closeModal() {
        overlay.style.display = 'none';
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
});

const latestProducts = [
    { name: "Crab Pool Security", price: "KSH 30.00", img: "img/latest-product/lp-1.jpg", url: "#" },
    { name: "Crab Pool Security", price: "KSH 30.00", img: "img/latest-product/lp-2.jpg", url: "#" },
    { name: "Crab Pool Security", price: "KSH 30.00", img: "img/latest-product/lp-3.jpg", url: "#" }
];

const banners = [
    { img: "img/banner/banner-1.jpg", url: "#" },
    { img: "img/banner/banner-2.jpg", url: "#" }
];

const blogPosts = [
    { title: "Cooking tips make cooking simple", desc: "Sed quia non numquam modi tempora indunt ut labore et dolore magnam aliquam quaerat", date: "May 4, 2019", comments: 5, img: "img/blog/blog-1.jpg", url: "#" },
    { title: "6 ways to prepare breakfast for 30", desc: "Sed quia non numquam modi tempora indunt ut labore et dolore magnam aliquam quaerat", date: "May 4, 2019", comments: 5, img: "img/blog/blog-2.jpg", url: "#" },
    { title: "Visit the clean farm in the US", desc: "Sed quia non numquam modi tempora indunt ut labore et dolore magnam aliquam quaerat", date: "May 4, 2019", comments: 5, img: "img/blog/blog-3.jpg", url: "#" }
];

const footerLinksCol1 = [
    { title: "About Us", url: "#" },
    { title: "About Our Shop", url: "#" },
    { title: "Secure Shopping", url: "#" },
    { title: "Delivery information", url: "#" },
    { title: "Privacy Policy", url: "#" },
    { title: "Our Sitemap", url: "#" }
];

const footerLinksCol2 = [
    { title: "Who We Are", url: "#" },
    { title: "Our Services", url: "#" },
    { title: "Projects", url: "#" },
    { title: "Contact", url: "#" },
    { title: "Innovation", url: "#" },
    { title: "Testimonials", url: "#" }
];


// ==========================================
// 2. RENDERING LOGIC (Runs Synchronously)
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
    
    // Render Navigation
    const navHTML = `<ul>${navigationLinks.map(link => `
        <li class="${link.active ? 'active' : ''}">
            <a href="${link.url}">${link.title}</a>
            ${link.dropdown ? `
                <ul class="header__menu__dropdown">
                    ${link.dropdown.map(drop => `<li><a href="${drop.url}">${drop.title}</a></li>`).join('')}
                </ul>
            ` : ''}
        </li>`).join('')}
    </ul>`;
    document.querySelectorAll(".navigation-placeholder").forEach(el => el.innerHTML = navHTML);

    // Render Social Links
    const socialHTML = socialMedia.slice(0, 4).map(s => `<a href="${s.url}"><i class="fa ${s.icon}"></i></a>`).join('');
    document.querySelectorAll(".social-placeholder").forEach(el => {
        // If it's the footer widget, it might have Instagram too. Let's render custom config based on container.
        if (el.classList.contains("footer__widget__social")) {
            el.innerHTML = socialMedia.map(s => `<a href="${s.url}"><i class="fa ${s.icon}"></i></a>`).join('');
        } else {
            el.innerHTML = socialHTML;
        }
    });

    // Render Contact Info
    const contactHTML = `<ul>
        <li><i class="fa fa-envelope"></i> hello@colorlib.com</li>
        <li>Free Shipping for all Order of $99</li>
    </ul>`;
    document.querySelectorAll(".contact-info-placeholder").forEach(el => el.innerHTML = contactHTML);

    // Render Language Selectors
    const languageHTML = `
        <img src="img/language.png" alt="Language">
        <div>English</div>
        <span class="arrow_carrot-down"></span>
        <ul>
            <li><a href="#">Spanish</a></li>
            <li><a href="#">English</a></li>
        </ul>`;
    document.querySelectorAll(".language-selector-placeholder").forEach(el => el.innerHTML = languageHTML);

    // Render Cart Summaries
    const cartHTML = `
        <li><a href="#"><i class="fa fa-heart"></i> <span>1</span></a></li>
        <li><a href="#"><i class="fa fa-shopping-bag"></i> <span>3</span></a></li>`;
    document.querySelectorAll(".cart-summary-placeholder").forEach(el => el.innerHTML = cartHTML);

    // Render Hero Categories
    const categoriesList = document.getElementById("hero-categories-list");
    if (categoriesList) {
        categoriesList.innerHTML = heroDepartments.map(dep => `
            <li class="hero__categories__item">
                <a href="#">${dep.name}</a>
                <ul class="hero__categories__submenu">
                    ${dep.items.map(item => `<li><a href="#">${item}</a></li>`).join('')}
                </ul>
            </li>
        `).join('');
    }

    // Render Carousel Categories Slider
    const categoriesSlider = document.getElementById("categories-slider");
    if (categoriesSlider) {
        categoriesSlider.innerHTML = productCategories.map(cat => `
            <div class="col-lg-3">
                <div class="categories__item">
                    <img src="${cat.img}" alt="${cat.title}">
                    <h5><a href="${cat.url}">${cat.title}</a></h5>
                </div>
            </div>`).join('');
    }

    // Render Featured Products Grid
    const featuredContainer = document.getElementById("featured-products-container");
    if (featuredContainer) {
        featuredContainer.innerHTML = featuredProducts.map(p => `
            <div class="col-lg-3 col-md-4 col-sm-6 mix ${p.tags}">
                <div class="featured__item">
                    <div class="featured__item__pic set-bg" data-setbg="${p.img}">
                        <ul class="featured__item__pic__hover">
                            <li><a href="#"><i class="fa fa-heart"></i></a></li>
                            <li><a href="#"><i class="fa fa-retweet"></i></a></li>
                            <li><a href="#"><i class="fa fa-shopping-cart"></i></a></li>
                        </ul>
                    </div>
                    <div class="featured__item__text">
                        <h6><a href="#">${p.name}</a></h6>
                        <h5>${p.price}</h5>
                    </div>
                </div>
            </div>`).join('');
    }

    // Render Banners
    const bannersContainer = document.getElementById("banners-container");
    if (bannersContainer) {
        bannersContainer.innerHTML = banners.map(b => `
            <div class="col-lg-6 col-md-6 col-sm-6">
                <div class="banner__pic">
                    <a href="${b.url}"><img src="${b.img}" alt="Banner"></a>
                </div>
            </div>`).join('');
    }

    // Function to generate content inside the Latest Product dynamic sliders
    const makeProductSliderHTML = (products) => {
        // Create sets of 3 items per slide
        let slides = [];
        for (let i = 0; i < 6; i += 3) {
            const slideItems = products.slice(0, 3); // Copy mock data for demonstration
            slides.push(`
                <div class="latest-prdouct__slider__item">
                    ${slideItems.map(p => `
                        <a href="${p.url}" class="latest-product__item">
                            <div class="latest-product__item__pic">
                                <img src="${p.img}" alt="${p.name}">
                            </div>
                            <div class="latest-product__item__text">
                                <h6>${p.name}</h6>
                                <span>${p.price}</span>
                            </div>
                        </a>
                    `).join('')}
                </div>
            `);
        }
        return slides.join('');
    };

    // Render 3 mini sliders
    const latestSlider = document.getElementById("slider-latest");
    if (latestSlider) latestSlider.innerHTML = makeProductSliderHTML(latestProducts);

    const topRatedSlider = document.getElementById("slider-top-rated");
    if (topRatedSlider) topRatedSlider.innerHTML = makeProductSliderHTML(latestProducts);

    const reviewsSlider = document.getElementById("slider-reviews");
    if (reviewsSlider) reviewsSlider.innerHTML = makeProductSliderHTML(latestProducts);

    // Render Blog Posts
    const blogContainer = document.getElementById("blog-posts-container");
    if (blogContainer) {
        blogContainer.innerHTML = blogPosts.map(post => `
            <div class="col-lg-4 col-md-4 col-sm-6">
                <div class="blog__item">
                    <div class="blog__item__pic">
                        <img src="${post.img}" alt="${post.title}">
                    </div>
                    <div class="blog__item__text">
                        <ul>
                            <li><i class="fa fa-calendar-o"></i> ${post.date}</li>
                            <li><i class="fa fa-comment-o"></i> ${post.comments}</li>
                        </ul>
                        <h5><a href="${post.url}">${post.title}</a></h5>
                        <p>${post.desc}</p>
                    </div>
                </div>
            </div>`).join('');
    }

    // Render Footer Links columns
    const footerCol1 = document.getElementById("footer-links-col1");
    if (footerCol1) {
        footerCol1.innerHTML = footerLinksCol1.map(link => `<li><a href="${link.url}">${link.title}</a></li>`).join('');
    }
    const footerCol2 = document.getElementById("footer-links-col2");
    if (footerCol2) {
        footerCol2.innerHTML = footerLinksCol2.map(link => `<li><a href="${link.url}">${link.title}</a></li>`).join('');
    }
});