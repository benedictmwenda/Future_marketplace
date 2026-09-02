// SokoHub Dynamic Listing Fetcher & Realtime Sync

async function fetchSokoHubListings() {
    let allListings = [];

    // 0. Fetch from MySQL Backend Server (if running on http://localhost:5000)
    if (window.SokoMySQL) {
        try {
            const mysqlListings = await window.SokoMySQL.fetchListings();
            if (Array.isArray(mysqlListings) && mysqlListings.length > 0) {
                allListings = mysqlListings;
            }
        } catch (mErr) {
            console.warn("MySQL fetch warning:", mErr);
        }
    }

    // 1. Read from IndexedDB (High Capacity Persistent Database)
    if (window.SokoDB) {
        try {
            const dbListings = await window.SokoDB.getAllListings();
            if (Array.isArray(dbListings) && dbListings.length > 0) {
                allListings = dbListings;
            }
        } catch (e) {
            console.warn("Could not read from IndexedDB: ", e);
        }
    }

    // 2. Fetch from LocalStorage synced items
    try {
        const localData = localStorage.getItem('sokohub_listings');
        if (localData) {
            const parsed = JSON.parse(localData);
            if (Array.isArray(parsed)) {
                parsed.forEach(item => {
                    if (!allListings.some(l => l.id === item.id)) {
                        allListings.unshift(item);
                    }
                });
            }
        }
    } catch (e) {
        console.warn("Could not read local listings: ", e);
    }

    // 3. Fetch from Firebase Firestore if configured
    if (window.db && typeof firebaseConfig !== 'undefined' && firebaseConfig.apiKey !== "YOUR_API_KEY") {
        try {
            const snapshot = await window.db.collection('listings').get();
            snapshot.forEach(doc => {
                const item = doc.data() || {};
                if (!item.id) item.id = doc.id;
                const idx = allListings.findIndex(l => l.id === item.id);
                if (idx === -1) {
                    allListings.unshift(item);
                } else {
                    allListings[idx] = Object.assign({}, allListings[idx], item);
                }
            });
        } catch (err) {
            console.warn("Firestore fetch notice: ", err.message);
        }
    }

    return allListings;
}

// Render dynamic items on shop-grid.html
async function renderShopGridListings() {
    const gridContainer = document.getElementById('shop-grid-items-container');
    if (!gridContainer) return;

    const listings = await fetchSokoHubListings();
    if (!listings || listings.length === 0) return;

    window.quickViewItems = window.quickViewItems || {};

    let html = '';
    listings.forEach(item => {
        let catSlug = 'vehicles';
        if (item.category) {
            const cat = item.category.toLowerCase();
            if (cat.includes('vehic') || cat.includes('car') || cat.includes('auto')) catSlug = 'vehicles';
            else if (cat.includes('prop') || cat.includes('house') || cat.includes('rent') || cat.includes('land')) catSlug = 'property';
            else if (cat.includes('elec') || cat.includes('phone') || cat.includes('laptop') || cat.includes('tv')) catSlug = 'electronics';
            else if (cat.includes('fash') || cat.includes('cloth') || cat.includes('shoe')) catSlug = 'fashion';
            else if (cat.includes('home') || cat.includes('furnit')) catSlug = 'home';
            else if (cat.includes('serv')) catSlug = 'services';
            else if (cat.includes('job')) catSlug = 'jobs';
        }

        const subcatSlug = item.subcategory ? item.subcategory.toLowerCase().replace(/[^a-z0-9]/g, '-') : '';
        const formattedPrice = typeof item.price === 'number' ? item.price.toLocaleString() : item.price;
        const mainImage = (item.images && item.images[0]) || item.imageUrl || 'img/featured/feature-1.jpg';

        window.quickViewItems[item.id] = item;

        html += `
            <div class="col-lg-4 col-md-6 col-sm-6 mix ${catSlug} ${subcatSlug} user-dynamic-grid-item">
                <div class="product__item">
                    <div class="product__item__pic set-bg" style="background-image: url('${mainImage}'); background-size: cover; background-position: center; height: 260px; position: relative;">
                        <span class="badge badge-success" style="position: absolute; top: 10px; left: 10px; background: #7fad39; padding: 5px 10px; font-size: 11px; text-transform: uppercase;">
                            ${item.category || 'Product'} ${item.subcategory ? '▸ ' + item.subcategory : ''}
                        </span>
                        <span class="badge" style="position: absolute; top: 10px; right: 10px; background: ${item.status === 'Sold' ? '#dc3545' : (item.status === 'Reserved' ? '#ffc107' : (item.status === 'Out of Stock' ? '#6c757d' : '#28a745'))}; padding: 5px 10px; font-size: 11px; text-transform: uppercase; color: #fff;">
                            ${item.status || 'Available'}
                        </span>
                        <ul class="product__item__pic__hover">
                            <li><a href="#"><i class="fa fa-heart"></i></a></li>
                            <li><a href="#" class="quick-view-btn" data-qv-id="${item.id}"><i class="fa fa-eye"></i></a></li>
                            <li><a href="shop-details.html?id=${item.id}"><i class="fa fa-external-link"></i></a></li>
                        </ul>
                    </div>
                    <div class="product__item__text" style="padding-top: 15px;">
                        <h6><a href="shop-details.html?id=${item.id}">${item.title}</a></h6>
                        <h5 style="color: #7fad39; font-weight: 700; margin-top: 5px;">
                            ${typeof item.price === 'number' ? 'KSH ' + formattedPrice : item.price}
                        </h5>
                        <small style="color: #888; display: block; margin-top: 3px;">
                            <i class="fa fa-map-marker"></i> ${item.location || 'Nairobi'} | <i class="fa fa-user"></i> ${item.sellerName || 'Verified Seller'}
                        </small>
                    </div>
                </div>
            </div>
        `;
    });

    $('.user-dynamic-grid-item').remove();
    gridContainer.insertAdjacentHTML('afterbegin', html);
}

// Render dynamic listings on index.html homepage
async function renderHomePageListings() {
    const container = document.querySelector('.featured__filter') || document.getElementById('home-user-listings');
    if (!container) return;

    const listings = await fetchSokoHubListings();
    if (!listings || listings.length === 0) return;

    window.quickViewItems = window.quickViewItems || {};

    let html = '';
    listings.forEach(item => {
        let catSlug = 'vehicles';
        if (item.category) {
            const cat = item.category.toLowerCase();
            if (cat.includes('vehic') || cat.includes('car') || cat.includes('auto')) catSlug = 'vehicles';
            else if (cat.includes('prop') || cat.includes('house') || cat.includes('rent') || cat.includes('land')) catSlug = 'property';
            else if (cat.includes('elec') || cat.includes('phone') || cat.includes('laptop') || cat.includes('tv')) catSlug = 'electronics';
            else if (cat.includes('fash') || cat.includes('cloth') || cat.includes('shoe')) catSlug = 'fashion';
            else if (cat.includes('home') || cat.includes('furnit')) catSlug = 'home';
            else if (cat.includes('serv')) catSlug = 'services';
            else if (cat.includes('job')) catSlug = 'jobs';
            else catSlug = 'vehicles';
        }

        const subcatSlug = item.subcategory ? item.subcategory.toLowerCase().replace(/[^a-z0-9]/g, '-') : '';
        const formattedPrice = typeof item.price === 'number' ? 'KSH ' + item.price.toLocaleString() : item.price;
        const mainImage = (item.images && item.images[0]) || item.imageUrl || 'img/featured/feature-1.jpg';

        window.quickViewItems[item.id] = item;

        html += `
            <div class="col-lg-3 col-md-4 col-sm-6 mix ${catSlug} ${subcatSlug} user-dynamic-grid-item" style="display: block;">
                <div class="featured__item">
                    <div class="featured__item__pic set-bg" style="background-image: url('${mainImage}'); background-size: cover; background-position: center; height: 260px; position: relative;">
                        <span class="badge badge-success" style="position: absolute; top: 10px; left: 10px; background: #7fad39; padding: 5px 10px; font-size: 11px; text-transform: uppercase; color: #fff; z-index: 2;">
                            ${item.category || 'Product'} ${item.subcategory ? '▸ ' + item.subcategory : ''}
                        </span>
                        <ul class="featured__item__pic__hover">
                            <li><a href="#"><i class="fa fa-heart"></i></a></li>
                            <li><a href="#" class="quick-view-btn" data-qv-id="${item.id}"><i class="fa fa-eye"></i></a></li>
                            <li><a href="shop-details.html?id=${item.id}"><i class="fa fa-external-link"></i></a></li>
                        </ul>
                    </div>
                    <div class="featured__item__text">
                        <h6><a href="shop-details.html?id=${item.id}">${item.title}</a></h6>
                        <h5>${formattedPrice}</h5>
                        <small style="color:#888;"><i class="fa fa-map-marker"></i> ${item.location || 'Nairobi'} | ${item.sellerName || 'Seller'}</small>
                    </div>
                </div>
            </div>
        `;
    });

    $('.user-dynamic-grid-item').remove();
    container.insertAdjacentHTML('afterbegin', html);

    setTimeout(function () {
        if (typeof mixitup !== 'undefined') {
            try {
                if (window.homeMixer && typeof window.homeMixer.destroy === 'function') {
                    window.homeMixer.destroy();
                }
                window.homeMixer = mixitup(container, {
                    selectors: { target: '.mix' },
                    animation: { duration: 300 }
                });
            } catch (mErr) {
                console.warn('MixItUp re-init notice:', mErr);
            }
        }
    }, 100);
}

// Render single listing details on shop-details.html if ?id= is present in URL
async function renderShopDetailsPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const itemId = urlParams.get('id');
    if (!itemId) return;

    const listings = await fetchSokoHubListings();
    const item = listings.find(l => String(l.id) === String(itemId));
    if (!item) return;

    const titleEl = document.querySelector('.product__details__text h3');
    if (titleEl) titleEl.textContent = item.title;

    const priceEl = document.querySelector('.product__details__price');
    if (priceEl) {
        priceEl.textContent = typeof item.price === 'number' ? 'KSH ' + item.price.toLocaleString() : item.price;
    }

    const descEl = document.querySelector('.product__details__text p');
    if (descEl && item.description) descEl.textContent = item.description;

    const mainImg = document.querySelector('.product__details__pic__item--large');
    const imageSrc = (item.images && item.images[0]) || item.imageUrl || 'img/featured/feature-1.jpg';
    if (mainImg) mainImg.src = imageSrc;

    const contactBtn = document.querySelector('.product__details__text a.primary-btn');
    if (contactBtn && item.sellerPhone) {
        contactBtn.href = `tel:${item.sellerPhone}`;
        contactBtn.innerHTML = `<i class="fa fa-phone"></i> CALL ${item.sellerPhone}`;
    }

    const listItems = document.querySelectorAll('.product__details__text ul li');
    listItems.forEach(li => {
        const text = li.textContent;
        if (text.includes('Availability')) {
            li.innerHTML = `<b>Availability</b> <span>${item.status || 'Available'}</span>`;
        } else if (text.includes('Seller')) {
            li.innerHTML = `<b>Seller</b> <span>${item.sellerName || 'Verified Seller'}</span>`;
        } else if (text.includes('Location')) {
            li.innerHTML = `<b>Location</b> <span>${item.location || 'Nairobi, Kenya'}</span>`;
        } else if (text.includes('Category')) {
            li.innerHTML = `<b>Category</b> <span>${item.category || 'Product'}</span>`;
        }
    });

    const breadcrumbTitle = document.querySelector('.breadcrumb__text h2');
    if (breadcrumbTitle) breadcrumbTitle.textContent = item.title;
    const breadcrumbItem = document.querySelector('.breadcrumb__option span');
    if (breadcrumbItem) breadcrumbItem.textContent = item.title;
}

// Dynamic Hero Categories Sidebar Counter & Auto-Filter with Hover Flyout
function updateHeroCategories(listings) {
    const list = document.getElementById('hero-categories-list');
    if (!list) return;

    listings = listings || [];

    const subCounts = {};
    const catCounts = { vehicles: 0, property: 0, electronics: 0, fashion: 0, services: 0, jobs: 0 };

    listings.forEach(item => {
        if (item.subcategory) {
            const subKey = item.subcategory.trim();
            subCounts[subKey] = (subCounts[subKey] || 0) + 1;
        }

        const cat = (item.category || '').toLowerCase();
        if (cat.includes('vehic') || cat.includes('car') || cat.includes('auto')) catCounts.vehicles++;
        else if (cat.includes('prop') || cat.includes('house') || cat.includes('rent') || cat.includes('land')) catCounts.property++;
        else if (cat.includes('elec') || cat.includes('phone') || cat.includes('laptop') || cat.includes('tv')) catCounts.electronics++;
        else if (cat.includes('fash') || cat.includes('cloth') || cat.includes('shoe')) catCounts.fashion++;
        else if (cat.includes('serv')) catCounts.services++;
        else if (cat.includes('job')) catCounts.jobs++;
        else catCounts.vehicles++;
    });

    const categoryMap = [
        { name: 'Vehicles', icon: 'fa-car', cat: 'vehicles', total: catCounts.vehicles, subs: ['Cars', 'Motorcycles', 'Trucks / Lorries', 'Buses / Vans', 'Spare Parts'] },
        { name: 'Property Rentals', icon: 'fa-home', cat: 'property', total: catCounts.property, subs: ['Apartments', 'Houses', 'Land', 'Commercial Space', 'Offices'] },
        { name: 'Electronics', icon: 'fa-laptop', cat: 'electronics', total: catCounts.electronics, subs: ['Phones & Tablets', 'Computers & Laptops', 'TVs & Audio', 'Cameras', 'Appliances'] },
        { name: 'Fashion & Beauty', icon: 'fa-shopping-bag', cat: 'fashion', total: catCounts.fashion, subs: ['Men', 'Women', 'Kids', 'Shoes', 'Bags & Accessories'] },
        { name: 'Services', icon: 'fa-cogs', cat: 'services', total: catCounts.services, subs: ['Home Services', 'Automotive Services', 'Beauty & Health', 'Events', 'Digital Services'] },
        { name: 'Jobs', icon: 'fa-briefcase', cat: 'jobs', total: catCounts.jobs, subs: ['Full-time', 'Part-time', 'Contract', 'Internship', 'Freelance'] }
    ];

    let html = '';
    categoryMap.forEach(c => {
        let subItemsHtml = '';

        c.subs.forEach(s => {
            const count = subCounts[s] || 0;
            const subSlug = s.toLowerCase().replace(/[^a-z0-9]/g, '-');
            subItemsHtml += `
                <li>
                    <a href="./shop-grid.html?category=${subSlug}">
                        <span>${s}</span>
                        ${count > 0 ? `<span class="sub-badge">${count}</span>` : ''}
                    </a>
                </li>
            `;
        });

        html += `
            <li class="hero-cat-item">
                <a href="./shop-grid.html?category=${c.cat}" class="hero-cat-link">
                    <span class="hero-cat-title">
                        <i class="fa ${c.icon}"></i> ${c.name}
                    </span>
                    <span class="hero-cat-right">
                        <span class="main-badge">${c.total}</span>
                        <i class="fa fa-angle-right arrow-icon"></i>
                    </span>
                </a>
                <div class="hero-sub-flyout">
                    <div class="flyout-header">${c.name}</div>
                    <ul class="flyout-list">
                        ${subItemsHtml}
                    </ul>
                </div>
            </li>
        `;
    });

    list.innerHTML = html;
}

function handleUrlCategoryFilter() {
    const urlParams = new URLSearchParams(window.location.search);
    const cat = urlParams.get('category');
    if (!cat) return;

    setTimeout(function () {
        const filterBtn = document.querySelector(`[data-filter=".${cat}"]`);
        if (filterBtn) filterBtn.click();
    }, 300);
}

// Auto-run on DOM Ready
$(document).ready(async function () {
    const listings = await fetchSokoHubListings();
    updateHeroCategories(listings);
    renderShopGridListings();
    renderHomePageListings();
    renderShopDetailsPage();
    handleUrlCategoryFilter();
});
