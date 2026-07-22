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

    // Open modal when eye button is clicked
    document.addEventListener('click', function (e) {
        const btn = e.target.closest('.quick-view-btn');
        if (!btn) return;
        e.preventDefault();

        // ── Populate basic fields ──────────────────────
        document.getElementById('qv-img').src               = btn.dataset.img       || '';
        document.getElementById('qv-img').alt               = btn.dataset.name      || 'Item';
        document.getElementById('qv-name').textContent      = btn.dataset.name      || 'No Title';
        document.getElementById('qv-price').textContent     = btn.dataset.price     || '';
        document.getElementById('qv-category').textContent  = btn.dataset.category  || '';
        document.getElementById('qv-desc').textContent      = btn.dataset.desc      || '';
        document.getElementById('qv-location').textContent  = btn.dataset.location  || '—';
        document.getElementById('qv-condition').textContent = btn.dataset.condition || '—';
        document.getElementById('qv-seller').textContent    = btn.dataset.seller    || '—';

        // ── Populate features ──────────────────────────
        const featuresWrapper = document.getElementById('qv-features-wrapper');
        const featuresList    = document.getElementById('qv-features-list');
        const rawFeatures     = btn.dataset.features || '';
        if (rawFeatures.trim()) {
            featuresList.innerHTML = ''; // clear previous
            // Split into groups by semicolon
            const groups = rawFeatures.split(';');
            groups.forEach(function (group) {
                const colonIdx = group.indexOf(':');
                if (colonIdx === -1) return;
                const emoji = group.substring(0, colonIdx).trim();
                const tags  = group.substring(colonIdx + 1)
                                   .split('|')
                                   .map(t => t.trim())
                                   .filter(t => t.length > 0);
                if (tags.length === 0) return;
                // Build group row
                const groupEl = document.createElement('div');
                groupEl.className = 'qv-feature-group';
                const emojiEl = document.createElement('span');
                emojiEl.className   = 'qv-feature-emoji';
                emojiEl.textContent = emoji;
                const tagsEl = document.createElement('div');
                tagsEl.className = 'qv-feature-tags';
                tags.forEach(function (tag) {
                    const pill = document.createElement('span');
                    pill.className   = 'qv-tag';
                    pill.textContent = tag;
                    tagsEl.appendChild(pill);
                });
                groupEl.appendChild(emojiEl);
                groupEl.appendChild(tagsEl);
                featuresList.appendChild(groupEl);
            });
            featuresWrapper.style.display = 'block';
        } else {
            // Hide features section if no data
            featuresWrapper.style.display = 'none';
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