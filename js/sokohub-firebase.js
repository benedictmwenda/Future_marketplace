// SokoHub Dynamic Listing Fetcher & Realtime Sync

// Categories that are high-value / negotiated / require viewing — these stay
// contact-only (call/WhatsApp the seller), never go through cart + checkout.
// Everything else (electronics, fashion, home goods, etc.) is shop-type and
// can be bought directly through the cart.
window.SOKO_LISTING_ONLY_CATEGORIES = ['vehicles', 'property', 'services', 'jobs'];

function getSokoCatSlug(categoryText) {
    let catSlug = 'vehicles';
    if (categoryText) {
        const cat = categoryText.toLowerCase();
        if (cat.includes('vehic') || cat.includes('car') || cat.includes('auto')) catSlug = 'vehicles';
        else if (cat.includes('prop') || cat.includes('house') || cat.includes('rent') || cat.includes('land')) catSlug = 'property';
        else if (cat.includes('elec') || cat.includes('phone') || cat.includes('laptop') || cat.includes('tv')) catSlug = 'electronics';
        else if (cat.includes('fash') || cat.includes('cloth') || cat.includes('shoe')) catSlug = 'fashion';
        else if (cat.includes('home') || cat.includes('furnit')) catSlug = 'home';
        else if (cat.includes('serv')) catSlug = 'services';
        else if (cat.includes('job')) catSlug = 'jobs';
    }
    return catSlug;
}
window.getSokoCatSlug = getSokoCatSlug;

// True if this item should show "Add to Cart"; false if it should be
// contact-only (call/WhatsApp), e.g. vehicles, property, services, jobs.
function isSokoShopType(item) {
    const catSlug = getSokoCatSlug(item && item.category);
    return window.SOKO_LISTING_ONLY_CATEGORIES.indexOf(catSlug) === -1;
}
window.isSokoShopType = isSokoShopType;

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

    // 1. Read from IndexedDB — only as a fallback if MySQL returned nothing
    // (e.g. offline). Must NOT run when MySQL already succeeded, otherwise this
    // browser's local cache silently replaces the full catalog after posting.
    if (window.SokoDB && allListings.length === 0) {
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

    const urlParams = new URLSearchParams(window.location.search);
    const filterCat = urlParams.get('category');

    const allListings = await fetchSokoHubListings();
    if (!allListings || allListings.length === 0) {
        gridContainer.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:#7a7a7a;">No listings yet. Be the first to post one!</div>';
        return;
    }

    window.quickViewItems = window.quickViewItems || {};

    // Work out each item's category/subcategory slug up front so we can both
    // filter by it (if a ?category= is in the URL) and use it for the card's class.
    const withSlugs = allListings.map(function (item) {
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
        return { item: item, catSlug: catSlug, subcatSlug: subcatSlug };
    });

    const filtered = filterCat
        ? withSlugs.filter(function (x) { return x.catSlug === filterCat || x.subcatSlug === filterCat; })
        : withSlugs;

    // Let the page know which category is active, for a heading + "clear filter" link.
    const headingEl = document.querySelector('.shop-grid-category-heading');
    if (headingEl) {
        if (filterCat) {
            const label = filterCat.replace(/-/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
            headingEl.innerHTML = `Showing: <b>${label}</b> &nbsp; <a href="shop-grid.html" style="font-size:13px;color:#1000B8;">(clear filter)</a>`;
            headingEl.style.display = 'block';
        } else {
            headingEl.style.display = 'none';
        }
    }

    if (filtered.length === 0) {
        gridContainer.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:#7a7a7a;">No listings in this category yet. <a href="shop-grid.html">View all listings</a></div>';
        return;
    }

    let html = '';
    filtered.forEach(function (entry) {
        const item = entry.item;
        const catSlug = entry.catSlug;
        const subcatSlug = entry.subcatSlug;
        const formattedPrice = typeof item.price === 'number' ? item.price.toLocaleString() : item.price;
        const mainImage = (item.images && item.images[0]) || item.imageUrl || 'img/featured/feature-1.jpg';

        window.quickViewItems[item.id] = item;

        html += `
            <div class="col-lg-4 col-md-6 col-sm-6 mix ${catSlug} ${subcatSlug} user-dynamic-grid-item">
                <div class="product__item">
                    <div class="product__item__pic set-bg" style="background-image: url('${mainImage}'); background-size: cover; background-position: center; height: 260px; position: relative;">
                        <span class="badge" style="position: absolute; top: 10px; left: 10px; background: #1000B8; color: #F3F3E6; padding: 5px 10px; font-size: 11px; text-transform: uppercase; border-radius: 4px; font-weight: 700;">
                            ${item.category || 'Product'} ${item.subcategory ? '▸ ' + item.subcategory : ''}
                        </span>
                        <span class="badge" style="position: absolute; top: 10px; right: 10px; background: ${item.status === 'Sold' ? '#dc3545' : (item.status === 'Reserved' ? '#DAA520' : (item.status === 'Out of Stock' ? '#6c757d' : '#28a745'))}; padding: 5px 10px; font-size: 11px; text-transform: uppercase; color: #F3F3E6; border-radius: 4px;">
                            ${item.status || 'Available'}
                        </span>
                        <ul class="product__item__pic__hover">
                            <li><a href="#" style="background:#1000B8; color:#F3F3E6;"><i class="fa fa-heart"></i></a></li>
                            <li><a href="#" class="quick-view-btn" data-qv-id="${item.id}" style="background:#1000B8; color:#F3F3E6;"><i class="fa fa-eye"></i></a></li>
                            <li><a href="shop-details.html?id=${item.id}" style="background:#DAA520; color:#1D1912;"><i class="fa fa-external-link"></i></a></li>
                        </ul>
                    </div>
                    <div class="product__item__text" style="padding-top: 15px;">
                        <h6><a href="shop-details.html?id=${item.id}" style="color:#1D1912; font-weight:700;">${item.title}</a></h6>
                        <h5 style="color: #1000B8; font-weight: 800; margin-top: 5px;">
                            ${typeof item.price === 'number' ? 'KSH ' + formattedPrice : item.price}
                        </h5>
                        <small style="color: #666; display: block; margin-top: 3px;">
                            <i class="fa fa-map-marker" style="color:#1000B8;"></i> ${item.location || 'Nairobi'} | <i class="fa fa-user" style="color:#DAA520;"></i> ${item.sellerName || 'Verified Seller'}
                        </small>
                    </div>
                </div>
            </div>
        `;
    });

    $('.user-dynamic-grid-item').remove();
    gridContainer.innerHTML = html; // full replace: clears loading placeholder
}

// Render dynamic listings on index.html homepage
function buildHomeListingCard(item) {
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

    window.quickViewItems = window.quickViewItems || {};
    window.quickViewItems[item.id] = item;

    return `
        <div class="col-lg-3 col-md-4 col-sm-6 mix ${catSlug} ${subcatSlug} user-dynamic-grid-item" style="display: block;">
            <div class="featured__item">
                <div class="featured__item__pic set-bg" style="background-image: url('${mainImage}'); background-size: cover; background-position: center; height: 260px; position: relative;">
                    <span class="badge" style="position: absolute; top: 10px; left: 10px; background: #1000B8; color: #F3F3E6; padding: 5px 10px; font-size: 11px; text-transform: uppercase; font-weight:700; border-radius:4px; z-index: 2;">
                        ${item.category || 'Product'} ${item.subcategory ? '▸ ' + item.subcategory : ''}
                    </span>
                    <ul class="featured__item__pic__hover">
                        <li><a href="#" style="background:#1000B8; color:#F3F3E6;"><i class="fa fa-heart"></i></a></li>
                        <li><a href="#" class="quick-view-btn" data-qv-id="${item.id}" style="background:#1000B8; color:#F3F3E6;"><i class="fa fa-eye"></i></a></li>
                        <li><a href="shop-details.html?id=${item.id}" style="background:#DAA520; color:#1D1912;"><i class="fa fa-external-link"></i></a></li>
                    </ul>
                </div>
                <div class="featured__item__text">
                    <h6><a href="shop-details.html?id=${item.id}" style="color:#1D1912; font-weight:700;">${item.title}</a></h6>
                    <h5 style="color:#1000B8; font-weight:800;">${formattedPrice}</h5>
                    <small style="color:#666;"><i class="fa fa-map-marker" style="color:#1000B8;"></i> ${item.location || 'Nairobi'} | ${item.sellerName || 'Seller'}</small>
                </div>
            </div>
        </div>
    `;
}

async function renderHomePageListings() {
    const featuredContainer = document.querySelector('.featured__filter');
    const recentContainer = document.getElementById('home-user-listings');
    if (!featuredContainer && !recentContainer) return;

    const listings = await fetchSokoHubListings();

    // --- Featured Listings: only items the seller explicitly marked as featured ---
    if (featuredContainer) {
        if (!listings || listings.length === 0) {
            featuredContainer.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:#7a7a7a;">No listings yet. Be the first to post one!</div>';
        } else {
            const featured = listings.filter(function (item) { return item.featured === 'Yes' || item.featured === true; });
            if (featured.length === 0) {
                featuredContainer.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px 20px;color:#7a7a7a;">No featured listings yet. Sellers can highlight their best items when posting.</div>';
            } else {
                featuredContainer.innerHTML = featured.map(buildHomeListingCard).join('');
            }
        }

        setTimeout(function () {
            if (typeof mixitup !== 'undefined') {
                try {
                    if (window.homeMixer && typeof window.homeMixer.destroy === 'function') {
                        window.homeMixer.destroy();
                    }
                    window.homeMixer = mixitup(featuredContainer, {
                        selectors: { target: '.mix' },
                        animation: { duration: 300 }
                    });
                } catch (mErr) {
                    console.warn('MixItUp re-init notice:', mErr);
                }
            }
        }, 100);
    }

    // --- Recent Listings from Our Sellers: everything, newest first ---
    if (recentContainer) {
        if (!listings || listings.length === 0) {
            recentContainer.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:#7a7a7a;">No listings yet. Be the first to post one!</div>';
        } else {
            const sorted = listings.slice().sort(function (a, b) {
                return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
            });
            recentContainer.innerHTML = sorted.map(buildHomeListingCard).join('');
        }
    }
}

// Render single listing details on shop-details.html if ?id= is present in URL
async function renderShopDetailsPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const itemId = urlParams.get('id');
    const loadingOverlay = document.getElementById('product-loading-overlay');

    if (!itemId) {
        if (loadingOverlay) {
            loadingOverlay.innerHTML = '<p style="color:#7a7a7a; text-align:center; padding:0 20px;">No listing selected.<br><a href="shop-grid.html" style="color:#1000B8; font-weight:700;">Browse all listings</a></p>';
        }
        return;
    }

    const listings = await fetchSokoHubListings();
    const item = listings.find(l => String(l.id) === String(itemId));
    if (!item) {
        if (loadingOverlay) {
            loadingOverlay.innerHTML = '<p style="color:#7a7a7a;">Sorry, this listing could not be found.</p>';
        }
        return;
    }

    const titleEl = document.querySelector('.product__details__text h3');
    if (titleEl) titleEl.textContent = item.title;

    const priceEl = document.querySelector('.product__details__price');
    if (priceEl) {
        priceEl.textContent = typeof item.price === 'number' ? 'KSH ' + item.price.toLocaleString() : item.price;
    }

    const descEl = document.querySelector('.product__details__text p');
    if (descEl && item.description) descEl.textContent = item.description;

    const mainImg = document.querySelector('.product__details__pic__item--large');
    const itemImages = (Array.isArray(item.images) && item.images.length > 0) ? item.images : [item.imageUrl || 'img/featured/feature-1.jpg'];
    const imageSrc = itemImages[0];
    if (mainImg) mainImg.src = imageSrc;

    // Rebuild the thumbnail strip from this item's actual uploaded photos.
    // (It used to be static demo markup — same 4 stock images on every listing.)
    const oldSlider = document.querySelector('.product__details__pic__slider');
    if (oldSlider) {
        const thumbsHtml = itemImages.map(function (img) {
            const safe = String(img).replace(/"/g, '&quot;');
            return `<img data-imgbigurl="${safe}" src="${safe}" alt="${(item.title || 'Product photo').replace(/"/g, '&quot;')}">`;
        }).join('');

        const freshSlider = document.createElement('div');
        freshSlider.className = 'product__details__pic__slider owl-carousel';
        freshSlider.innerHTML = thumbsHtml;
        oldSlider.replaceWith(freshSlider);

        if (window.jQuery && window.jQuery.fn.owlCarousel) {
            window.jQuery(freshSlider).owlCarousel({
                loop: itemImages.length > 1,
                margin: 20,
                items: 4,
                dots: true,
                smartSpeed: 1200,
                autoHeight: false,
                autoplay: itemImages.length > 1
            });
        }

        // Bind the click-to-swap behavior once, delegated so it also covers
        // carousel-cloned thumbnails and any future re-renders.
        if (window.jQuery && !window.__sokoThumbClickBound) {
            window.__sokoThumbClickBound = true;
            window.jQuery(document).on('click', '.product__details__pic__slider img', function () {
                const imgurl = window.jQuery(this).data('imgbigurl');
                window.jQuery('.product__details__pic__item--large').attr('src', imgurl);
            });
        }
    }

    const contactBtn = document.querySelector('.product__details__text a.primary-btn');
    const shopType = isSokoShopType(item);

    if (contactBtn) {
        if (shopType) {
            // Shop-type item: real "Add to Cart" wired to the cart module.
            contactBtn.href = '#';
            contactBtn.innerHTML = '<i class="fa fa-shopping-cart"></i> ADD TO CART';
            contactBtn.onclick = function (e) {
                e.preventDefault();
                e.stopPropagation();
                if (!window.SokoCart) return;
                const qtyInput = document.querySelector('.product__details__quantity input');
                const qty = Math.max(parseInt(qtyInput && qtyInput.value, 10) || 1, 1);
                const mainImage = (item.images && item.images[0]) || item.imageUrl || 'img/featured/feature-1.jpg';
                window.SokoCart.addToCart({
                    id: item.id,
                    title: item.title,
                    price: item.price,
                    image: mainImage,
                    badge: item.category || 'Product',
                    seller: item.sellerName || 'Verified Seller'
                }, qty);
                contactBtn.innerHTML = '<i class="fa fa-check"></i> ADDED TO CART';
                setTimeout(function () {
                    contactBtn.innerHTML = '<i class="fa fa-shopping-cart"></i> ADD TO CART';
                }, 1500);
            };
        } else if (item.sellerPhone) {
            // Listing-type item (vehicles, property, services, jobs): contact only.
            contactBtn.href = `tel:${item.sellerPhone}`;
            contactBtn.innerHTML = `<i class="fa fa-phone"></i> CALL ${item.sellerPhone}`;
            contactBtn.onclick = null;
        }
    }

    // Wire the WhatsApp share icon to a real chat link for listing-type items
    // (it was previously a dead href="#" for every listing).
    const whatsappIcon = document.querySelector('.product__details__text .share a .fa-whatsapp');
    if (whatsappIcon && whatsappIcon.parentElement) {
        const waNumber = (item.whatsapp || item.sellerPhone || '').replace(/[^0-9]/g, '');
        if (!shopType && waNumber) {
            const waText = encodeURIComponent(`Hi, I'm interested in your listing "${item.title}" on SokoHub.`);
            whatsappIcon.parentElement.href = `https://wa.me/${waNumber}?text=${waText}`;
            whatsappIcon.parentElement.target = '_blank';
        }
    }

    // Quantity selector only makes sense for shop-type items you can buy more
    // than one of — hide it for vehicles/property/services/jobs.
    const qtyWrapper = document.querySelector('.product__details__quantity');
    if (qtyWrapper) {
        qtyWrapper.style.display = shopType ? '' : 'none';
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

    // Description, Specifications & Reviews tabs — these were static BMW demo
    // content in the template and are now built from the real listing.
    const descTab = document.querySelector('#tabs-1 .product__details__tab__desc');
    if (descTab) {
        const desc = (item.description && item.description.trim()) || 'No description provided by the seller.';
        descTab.innerHTML = `<h6>Listing Overview</h6><p>${desc.replace(/</g, '&lt;')}</p>`;
    }

    const specsTab = document.querySelector('#tabs-2 .product__details__tab__desc');
    if (specsTab) {
        const rows = [];
        if (item.category) rows.push(['Category', item.category]);
        if (item.subcategory) rows.push(['Subcategory', item.subcategory]);
        if (item.condition) rows.push(['Condition', item.condition]);
        if (item.location) rows.push(['Location', item.location]);
        if (item.negotiable) rows.push(['Price Negotiable', item.negotiable]);
        if (item.deliveryAvailable) rows.push(['Delivery Available', item.deliveryAvailable]);
        if (item.attributes && typeof item.attributes === 'object') {
            Object.keys(item.attributes).forEach(function (key) {
                const val = item.attributes[key];
                if (val === undefined || val === null || val === '') return;
                const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, function (c) { return c.toUpperCase(); });
                rows.push([label, val]);
            });
        }
        if (rows.length > 0) {
            const rowsHtml = rows.map(function (r) {
                return `<tr><td><b>${r[0]}</b></td><td>${String(r[1]).replace(/</g, '&lt;')}</td></tr>`;
            }).join('');
            specsTab.innerHTML = `<h6>Specifications</h6><table class="table table-bordered mt-3"><tbody>${rowsHtml}</tbody></table>`;
        } else {
            specsTab.innerHTML = '<h6>Specifications</h6><p>No additional specifications provided by the seller.</p>';
        }
    }

    const reviewsTab = document.querySelector('#tabs-3 .product__details__tab__desc');
    if (reviewsTab) {
        reviewsTab.innerHTML = '<h6>Reviews</h6><p>This seller has not received any reviews yet.</p>';
    }
    const reviewsCountEl = document.querySelector('a[href="#tabs-3"] span');
    if (reviewsCountEl) reviewsCountEl.textContent = '(0)';

    // Related Products: real listings from the same category, excluding this one.
    const relatedContainer = document.getElementById('related-products-container');
    if (relatedContainer) {
        const related = listings
            .filter(function (l) { return String(l.id) !== String(item.id) && l.category === item.category; })
            .slice(0, 4);
        if (related.length === 0) {
            relatedContainer.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:20px;color:#7a7a7a;">No other listings in this category yet.</div>';
        } else {
            relatedContainer.innerHTML = related.map(buildHomeListingCard).join('');
        }
    }

    if (loadingOverlay) loadingOverlay.remove();
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
                        <span style="color:#1D1912;">${s}</span>
                        ${count > 0 ? `<span class="sub-badge" style="background:#28a745; color:#F3F3E6;">${count}</span>` : ''}
                    </a>
                </li>
            `;
        });

        html += `
            <li class="hero-cat-item">
                <a href="./shop-grid.html?category=${c.cat}" class="hero-cat-link">
                    <span class="hero-cat-title" style="color:#1D1912;">
                        <i class="fa ${c.icon}" style="color:#1000B8;"></i> ${c.name}
                    </span>
                    <span class="hero-cat-right">
                        <span class="main-badge" style="background:#DAA520; color:#1D1912;">${c.total}</span>
                        <i class="fa fa-angle-right arrow-icon" style="color:#DAA520;"></i>
                    </span>
                </a>
                <div class="hero-sub-flyout">
                    <ul class="flyout-list">
                        ${subItemsHtml}
                    </ul>
                </div>
            </li>
        `;
    });

    list.innerHTML = html;

    // Click-to-toggle for the subcategory flyout: works on touch devices where
    // :hover never "un-hovers", unlike the pure-CSS hover behavior alone.
    if (!window.__sokoHeroCatToggleBound) {
        window.__sokoHeroCatToggleBound = true;
        document.addEventListener('click', function (e) {
            const arrow = e.target.closest('.arrow-icon');
            if (arrow) {
                e.preventDefault();
                e.stopPropagation();
                const li = arrow.closest('.hero-cat-item');
                if (!li) return;
                const wasOpen = li.classList.contains('hero-cat-open');
                document.querySelectorAll('.hero-cat-item.hero-cat-open').forEach(function (openLi) {
                    if (openLi !== li) openLi.classList.remove('hero-cat-open');
                });
                li.classList.toggle('hero-cat-open', !wasOpen);
                return;
            }
            if (!e.target.closest('.hero-cat-item')) {
                document.querySelectorAll('.hero-cat-item.hero-cat-open').forEach(function (openLi) {
                    openLi.classList.remove('hero-cat-open');
                });
            }
        });
    }

    // The shop-grid page also has its own simpler "Categories" filter widget
    // in the sidebar — populate it from the same data instead of duplicating logic.
    const sidebarList = document.getElementById('shop-sidebar-categories');
    if (sidebarList) {
        let sidebarHtml = '';
        categoryMap.forEach(c => {
            sidebarHtml += `<li><a href="./shop-grid.html?category=${c.cat}">${c.name} ${c.total > 0 ? `<span style="color:#999;">(${c.total})</span>` : ''}</a></li>`;
        });
        sidebarList.innerHTML = sidebarHtml;
    }
}

// Auto-run on DOM Ready
$(document).ready(async function () {
    const listings = await fetchSokoHubListings();
    updateHeroCategories(listings);
    renderShopGridListings();
    renderHomePageListings();
    renderShopDetailsPage();
});
