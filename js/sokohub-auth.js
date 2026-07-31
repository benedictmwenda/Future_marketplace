// SokoHub Global Auth & Navbar Helper

document.addEventListener('DOMContentLoaded', function () {
    const rawUser = localStorage.getItem('sokohub_user');
    let user = null;
    try {
        if (rawUser) user = JSON.parse(rawUser);
    } catch (e) { }

    // Helper: Check if user is logged in (any role)
    function isLoggedIn() {
        return user && user.isLoggedIn === true;
    }

    // Helper: Require buyer login and redirect if not
    function requireBuyerLogin(e, redirectUrl) {
        if (!isLoggedIn() || user.role !== 'buyer') {
            e.preventDefault();
            const target = redirectUrl || window.location.pathname.split('/').pop() || 'index.html';
            alert("🔒 Buyer Sign In Required\n\nYou must be signed in as a Buyer to purchase items on SokoHub. Redirecting to Buyer Login...");
            window.location.href = './login.html?role=buyer&redirect=' + encodeURIComponent(target);
            return false;
        }
        return true;
    }

    // Helper: Require any login (buyer or seller) and redirect if not
    function requireAnyLogin(e, redirectUrl) {
        if (!isLoggedIn()) {
            e.preventDefault();
            const target = redirectUrl || window.location.pathname.split('/').pop() || 'index.html';
            alert("🔒 Sign In Required\n\nYou must be signed in to access this page on SokoHub. Redirecting to Login...");
            window.location.href = './login.html?redirect=' + encodeURIComponent(target);
            return false;
        }
        return true;
    }

    // 1. Intercept "+ Sell Item" clicks
    const sellBtns = document.querySelectorAll('a[href="./post-item.html"], a[href="post-item.html"]');
    sellBtns.forEach(btn => {
        btn.addEventListener('click', function (e) {
            if (!user || user.role !== 'seller') {
                e.preventDefault();
                alert("🔒 Seller Sign In Required\n\nYou must be signed in as a seller to post items on SokoHub. Redirecting to Seller Login...");
                window.location.href = './login.html?role=seller&redirect=post-item.html';
            }
        });
    });

    // 2. Intercept "Add to Cart" button clicks (buyer login required)
    document.querySelectorAll('.product__item__pic__hover li a, .featured__item__pic__hover li a, .product__discount__item__pic__hover li a').forEach(btn => {
        btn.addEventListener('click', function (e) {
            if (btn.innerHTML.includes('fa-shopping-cart') || btn.innerHTML.includes('Add to Cart')) {
                requireBuyerLogin(e, window.location.pathname.split('/').pop());
            }
        });
    });

    // 3. Intercept "Add to Cart" in quick view modal
    document.querySelectorAll('.qv-btn--primary').forEach(btn => {
        btn.addEventListener('click', function (e) {
            requireBuyerLogin(e, 'shop-grid.html');
        });
    });

    // 4. Intercept cart page navigation links
    const cartLinks = document.querySelectorAll('a[href="./shoping-cart.html"], a[href="shoping-cart.html"]');
    cartLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            requireAnyLogin(e, 'shoping-cart.html');
        });
    });

    // 5. Intercept checkout page navigation links
    const checkoutLinks = document.querySelectorAll('a[href="./checkout.html"], a[href="checkout.html"]');
    checkoutLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            requireAnyLogin(e, 'checkout.html');
        });
    });

    // 6. Intercept wishlist / heart icon clicks
    document.querySelectorAll('.fa-heart').forEach(icon => {
        icon.closest('a')?.addEventListener('click', function (e) {
            requireBuyerLogin(e, window.location.pathname.split('/').pop());
        });
    });

    // 7. Update Header Auth display (Login / User Name)
    const headerAuth = document.querySelectorAll('.header__top__right__auth');
    headerAuth.forEach(el => {
        if (user && user.isLoggedIn) {
            const roleBadge = user.role === 'seller' ? ' [Seller]' : ' [Buyer]';
            el.innerHTML = `
                <a href="#" style="color:#7fad39; font-weight:600;"><i class="fa fa-user-circle"></i> ${user.name || user.email}${roleBadge}</a>
                <a href="#" class="logout-btn" style="margin-left:10px; color:#e74c3c;"><i class="fa fa-sign-out"></i> Logout</a>
            `;
        } else {
            el.innerHTML = `
                <a href="./login.html"><i class="fa fa-user"></i> Login / Register</a>
            `;
        }
    });

    // 8. Attach Logout handler
    document.querySelectorAll('.logout-btn').forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            localStorage.removeItem('sokohub_user');
            alert("Signed out successfully.");
            window.location.reload();
        });
    });
});

