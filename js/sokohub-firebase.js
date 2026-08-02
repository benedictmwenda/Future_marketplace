// SokoHub Dynamic Listing Fetcher & Realtime Sync

// Recover from storage-quota issues caused by legacy oversized (full-size base64)
// images. Rewrites sokohub_listings keeping only listings that fit within quota.
function sanitizeSokoHubListings() {
    try {
        const raw = localStorage.getItem('sokohub_listings');
        if (!raw) return;
        const list = JSON.parse(raw);
        if (!Array.isArray(list)) return;

        // Re-serialize and drop the largest/oldest items until it fits.
        let pruned = list.slice();
        let ok = false;
        while (pruned.length >= 0) {
            try {
                localStorage.setItem('sokohub_listings', JSON.stringify(pruned));
                ok = true;
                break;
            } catch (e) {
                // Storage full — drop the oldest listing and try again.
                pruned.pop();
                if (pruned.length === 0) {
                    localStorage.removeItem('sokohub_listings');
                    ok = true;
                    break;
                }
            }
        }
        if (ok && pruned.length !== list.length) {
            console.warn(`Sanitized sokohub_listings: removed ${list.length - pruned.length} oversized listing(s) to stay within storage quota.`);
        }
    } catch (e) {
        // If data is corrupt, just clear it.
        try { localStorage.removeItem('sokohub_listings'); } catch (err) { /* noop */ }
    }
}

async function fetchSokoHubListings() {
    // First, clean up any legacy oversized entries so reads/saves never throw.
    sanitizeSokoHubListings();

    let allListings = [];

    // 1. Fetch from LocalStorage synced items (instant loading)
    try {
        const localData = localStorage.getItem('sokohub_listings');
        if (localData) {
            allListings = JSON.parse(localData);
        }
    } catch (e) {
        console.warn("Could not read local listings: ", e);
    }

    // 2. Fetch from Firebase Firestore if configured.
    //    NOTE: We intentionally do NOT filter by status here. Sellers store
    //    status as "Available"/"Sold"/"Reserved"/"Out of Stock", so filtering
    //    by `status == 'active'` would hide every seller-posted listing (and
    //    all the seller-entered attributes/features/images that go with it).
    if (window.db && typeof firebaseConfig !== 'undefined' && firebaseConfig.apiKey !== "YOUR_API_KEY") {
        try {
            const snapshot = await window.db.collection('listings').get();
            snapshot.forEach(doc => {
                const item = doc.data() || {};
                // Make sure every fetched doc has an id (some older writes may
                // have relied on a client-side id that Firestore won't map).
                if (!item.id) item.id = doc.id;
                // Merge without duplicates. Prefer the version that carries
                // the fullest seller data (e.g. one with images/attributes).
                const idx = allListings.findIndex(l => l.id === item.id);
                if (idx === -1) {
                    allListings.unshift(item);
                } else {
                    const existing = allListings[idx];
                    const fullData = (existing.images && existing.images.length) ||
                                     (existing.attributes && Object.keys(existing.attributes).length) ||
                                     (item.images && item.images.length) ||
                                     (item.attributes && Object.keys(item.attributes).length);
                    if (fullData && (existing.images && existing.images.length === 0)) {
                        allListings[idx] = item;
                    }
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

    // Expose full listing data so the Quick View modal can render ALL
    // seller-posted fields (features[], attributes{}, images[], status, premium).
    window.quickViewItems = window.quickViewItems || {};

    let html = '';
    listings.forEach(item => {
        const typeClass = item.listingType ? item.listingType.toLowerCase() : 'product';
        const formattedPrice = typeof item.price === 'number' ? item.price.toLocaleString() : item.price;
        const mainImage = (item.images && item.images[0]) || item.imageUrl || 'img/featured/feature-1.jpg';

        // Register full item payload keyed by id for the quick view.
        window.quickViewItems[item.id] = item;

        html += `
            <div class="col-lg-4 col-md-6 col-sm-6 mix ${typeClass}">
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
                        ${item.premium && item.premium !== 'Normal' ? `<small style="color:#DAA520; display:block; margin-top:3px;"><i class="fa fa-star"></i> ${item.premium}</small>` : ''}
                    </div>
                </div>
            </div>
        `;
    });

    // Prepend user-posted items to the top of the grid
    gridContainer.insertAdjacentHTML('afterbegin', html);
}

// Render user-posted listings on index.html (homepage) into a container
async function renderHomePageListings() {
    const container = document.getElementById('home-user-listings');
    if (!container) return;

    const listings = await fetchSokoHubListings();
    if (!listings || listings.length === 0) {
        container.innerHTML = '<div class="text-center" style="padding:20px; color:#aaa;"><p>No user listings yet. Be the first to sell on SokoHub!</p></div>';
        return;
    }

    // Expose full listing data for the Quick View modal (same registry).
    window.quickViewItems = window.quickViewItems || {};

    let html = '';
    listings.forEach(item => {
        const typeClass = item.listingType ? item.listingType.toLowerCase() : 'product';
        const formattedPrice = typeof item.price === 'number' ? 'KSH ' + item.price.toLocaleString() : item.price;
        const mainImage = (item.images && item.images[0]) || item.imageUrl || 'img/featured/feature-1.jpg';

        // Register the full seller payload so quick view can render ALL data.
        window.quickViewItems[item.id] = item;

        // NOTE: Use inline background-image (matching shop-grid.html) instead of
        // data-setbg so images render even though listings load asynchronously
        // AFTER main.js's window-load background pass.
        html += `
            <div class="col-lg-3 col-md-4 col-sm-6 mix ${typeClass}">
                <div class="featured__item">
                    <div class="featured__item__pic set-bg" style="background-image: url('${mainImage}'); background-size: cover; background-position: center; height: 260px; position: relative;">
                        <span class="badge badge-success" style="position: absolute; top: 10px; left: 10px; background: #7fad39; padding: 5px 10px; font-size: 11px; text-transform: uppercase; color: #fff; z-index: 2;">
                            ${item.category || item.listingType || 'Product'}
                        </span>
                        <span class="badge" style="position: absolute; top: 10px; right: 10px; background: ${item.status === 'Sold' ? '#dc3545' : (item.status === 'Reserved' ? '#ffc107' : (item.status === 'Out of Stock' ? '#6c757d' : '#28a745'))}; padding: 5px 10px; font-size: 11px; text-transform: uppercase; color: #fff; z-index: 2;">
                            ${item.status || 'Available'}
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
                        ${item.premium && item.premium !== 'Normal' ? `<small style="color:#DAA520; display:block;"><i class="fa fa-star"></i> ${item.premium}</small>` : ''}
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// Auto-run on DOM Ready
$(document).ready(function () {
    renderShopGridListings();
    renderHomePageListings();
});
