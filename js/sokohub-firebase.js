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
        let catSlug = 'product';
        if (item.category) {
            const cat = item.category.toLowerCase();
            if (cat.includes('vehicle')) catSlug = 'vehicles';
            else if (cat.includes('property') || cat.includes('rental')) catSlug = 'property';
            else if (cat.includes('elec') || cat.includes('phone')) catSlug = 'electronics';
            else if (cat.includes('fashion')) catSlug = 'fashion';
            else if (cat.includes('service')) catSlug = 'services';
            else if (cat.includes('job')) catSlug = 'jobs';
            else if (cat.includes('home')) catSlug = 'home';
        }

        const formattedPrice = typeof item.price === 'number' ? item.price.toLocaleString() : item.price;
        const mainImage = (item.images && item.images[0]) || item.imageUrl || 'img/featured/feature-1.jpg';

        window.quickViewItems[item.id] = item;

        html += `
            <div class="col-lg-4 col-md-6 col-sm-6 mix ${catSlug} user-dynamic-grid-item">
                <div class="product__item">
                    <div class="product__item__pic set-bg" style="background-image: url('${mainImage}'); background-size: cover; background-position: center; height: 260px; position: relative;">
                        <span class="badge badge-success" style="position: absolute; top: 10px; left: 10px; background: #7fad39; padding: 5px 10px; font-size: 11px; text-transform: uppercase;">
                            ${item.category || item.listingType || 'Product'}
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
            else if (cat.includes('serv')) catSlug = 'services';
            else if (cat.includes('job')) catSlug = 'jobs';
            else catSlug = 'vehicles';
        }

        const formattedPrice = typeof item.price === 'number' ? 'KSH ' + item.price.toLocaleString() : item.price;
        const mainImage = (item.images && item.images[0]) || item.imageUrl || 'img/featured/feature-1.jpg';

        window.quickViewItems[item.id] = item;

        html += `
            <div class="col-lg-3 col-md-4 col-sm-6 mix ${catSlug} user-dynamic-grid-item" style="display: block;">
                <div class="featured__item">
                    <div class="featured__item__pic set-bg" style="background-image: url('${mainImage}'); background-size: cover; background-position: center; height: 260px; position: relative;">
                        <span class="badge badge-success" style="position: absolute; top: 10px; left: 10px; background: #7fad39; padding: 5px 10px; font-size: 11px; text-transform: uppercase; color: #fff; z-index: 2;">
                            ${item.category || 'Product'}
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

// Dynamic Hero Categories Sidebar Counter & Auto-Filter
function updateHeroCategories(listings) {
    const list = document.getElementById('hero-categories-list');
    if (!list) return;

    listings = listings || [];

    const counts = {
        vehicles: 0,
        property: 0,
        electronics: 0,
        fashion: 0,
        home: 0,
        services: 0,
        jobs: 0
    };

    listings.forEach(item => {
        const cat = (item.category || '').toLowerCase();
        if (cat.includes('vehic') || cat.includes('car') || cat.includes('auto')) counts.vehicles++;
        else if (cat.includes('prop') || cat.includes('house') || cat.includes('rent') || cat.includes('land')) counts.property++;
        else if (cat.includes('elec') || cat.includes('phone') || cat.includes('laptop') || cat.includes('tv')) counts.electronics++;
        else if (cat.includes('fash') || cat.includes('cloth') || cat.includes('shoe')) counts.fashion++;
        else if (cat.includes('home') || cat.includes('furnit')) counts.home++;
        else if (cat.includes('serv')) counts.services++;
        else if (cat.includes('job')) counts.jobs++;
        else counts.vehicles++;
    });

    list.innerHTML = `
        <li><a href="./shop-grid.html?category=vehicles"><i class="fa fa-car" style="margin-right: 10px; width: 18px; color: #7fad39;"></i> Vehicles <span class="badge badge-light float-right" style="margin-top:3px; background:#eef7e6; color:#7fad39; font-weight:700;">${counts.vehicles}</span></a></li>
        <li><a href="./shop-grid.html?category=property"><i class="fa fa-home" style="margin-right: 10px; width: 18px; color: #7fad39;"></i> Property & Rentals <span class="badge badge-light float-right" style="margin-top:3px; background:#eef7e6; color:#7fad39; font-weight:700;">${counts.property}</span></a></li>
        <li><a href="./shop-grid.html?category=electronics"><i class="fa fa-laptop" style="margin-right: 10px; width: 18px; color: #7fad39;"></i> Electronics <span class="badge badge-light float-right" style="margin-top:3px; background:#eef7e6; color:#7fad39; font-weight:700;">${counts.electronics}</span></a></li>
        <li><a href="./shop-grid.html?category=fashion"><i class="fa fa-shopping-bag" style="margin-right: 10px; width: 18px; color: #7fad39;"></i> Fashion & Beauty <span class="badge badge-light float-right" style="margin-top:3px; background:#eef7e6; color:#7fad39; font-weight:700;">${counts.fashion}</span></a></li>
        <li><a href="./shop-grid.html?category=home"><i class="fa fa-couch" style="margin-right: 10px; width: 18px; color: #7fad39;"></i> Home & Furniture <span class="badge badge-light float-right" style="margin-top:3px; background:#eef7e6; color:#7fad39; font-weight:700;">${counts.home}</span></a></li>
        <li><a href="./shop-grid.html?category=services"><i class="fa fa-cogs" style="margin-right: 10px; width: 18px; color: #7fad39;"></i> Services <span class="badge badge-light float-right" style="margin-top:3px; background:#eef7e6; color:#7fad39; font-weight:700;">${counts.services}</span></a></li>
        <li><a href="./shop-grid.html?category=jobs"><i class="fa fa-briefcase" style="margin-right: 10px; width: 18px; color: #7fad39;"></i> Jobs <span class="badge badge-light float-right" style="margin-top:3px; background:#eef7e6; color:#7fad39; font-weight:700;">${counts.jobs}</span></a></li>
    `;
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
