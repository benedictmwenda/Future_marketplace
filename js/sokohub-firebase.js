// SokoHub Dynamic Listing Fetcher & Realtime Sync

async function fetchSokoHubListings() {
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

    // 2. Fetch from Firebase Firestore if configured
    if (window.db && typeof firebaseConfig !== 'undefined' && firebaseConfig.apiKey !== "YOUR_API_KEY") {
        try {
            const snapshot = await window.db.collection('listings').where('status', '==', 'active').get();
            snapshot.forEach(doc => {
                const item = doc.data();
                if (!allListings.some(l => l.id === item.id)) {
                    allListings.unshift(item);
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

    let html = '';
    listings.forEach(item => {
        const typeClass = item.listingType ? item.listingType.toLowerCase() : 'product';
        const formattedPrice = typeof item.price === 'number' ? item.price.toLocaleString() : item.price;
        
        html += `
            <div class="col-lg-4 col-md-6 col-sm-6 mix ${typeClass}">
                <div class="product__item">
                    <div class="product__item__pic set-bg" style="background-image: url('${item.imageUrl}'); background-size: cover; background-position: center; height: 260px; position: relative;">
                        <span class="badge badge-success" style="position: absolute; top: 10px; left: 10px; background: #7fad39; padding: 5px 10px; font-size: 11px; text-transform: uppercase;">
                            ${item.listingType || 'Product'}
                        </span>
                        <ul class="product__item__pic__hover">
                            <li><a href="#"><i class="fa fa-heart"></i></a></li>
                            <li><a href="shop-details.html?id=${item.id}"><i class="fa fa-eye"></i></a></li>
                            <li><a href="#"><i class="fa fa-shopping-cart"></i></a></li>
                        </ul>
                    </div>
                    <div class="product__item__text" style="padding-top: 15px;">
                        <h6><a href="shop-details.html?id=${item.id}">${item.title}</a></h6>
                        <h5 style="color: #7fad39; font-weight: 700; margin-top: 5px;">KSH ${formattedPrice}</h5>
                        <small style="color: #888; display: block; margin-top: 3px;">
                            <i class="fa fa-map-marker"></i> ${item.location || 'Nairobi'} | <i class="fa fa-user"></i> ${item.sellerName || 'Verified Seller'}
                        </small>
                    </div>
                </div>
            </div>
        `;
    });

    // Prepend user-posted items to the top of the grid
    gridContainer.insertAdjacentHTML('afterbegin', html);
}

// Auto-run on DOM Ready
$(document).ready(function () {
    renderShopGridListings();
});
