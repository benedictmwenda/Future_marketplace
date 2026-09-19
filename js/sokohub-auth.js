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

    // Helper: Require any login and redirect if not
    function requireAuth(e, redirectUrl) {
        if (!isLoggedIn()) {
            if (e) e.preventDefault();
            const target = redirectUrl || window.location.pathname.split('/').pop() || 'index.html';
            alert("🔒 Sign In Required\n\nYou must be signed in to perform this action on SokoHub. Redirecting to Login...");
            window.location.href = './login.html?redirect=' + encodeURIComponent(target);
            return false;
        }
        return true;
    }

    // Helper: Require any login (buyer or seller) and redirect if not
    function requireAnyLogin(e, redirectUrl) {
        return requireAuth(e, redirectUrl);
    }

    // 1. Intercept "+ Sell Item" clicks
    const sellBtns = document.querySelectorAll('a[href="./post-item.html"], a[href="post-item.html"]');
    sellBtns.forEach(btn => {
        btn.addEventListener('click', function (e) {
            if (!isLoggedIn()) {
                e.preventDefault();
                alert("🔒 Sign In Required\n\nPlease sign in or create an account to post items on SokoHub.");
                window.location.href = './login.html?redirect=post-item.html';
            }
        });
    });

    // 2. Intercept "Add to Cart" button clicks
    document.querySelectorAll('.product__item__pic__hover li a, .featured__item__pic__hover li a, .product__discount__item__pic__hover li a').forEach(btn => {
        btn.addEventListener('click', function (e) {
            if (btn.innerHTML.includes('fa-shopping-cart') || btn.innerHTML.includes('Add to Cart')) {
                requireAuth(e, window.location.pathname.split('/').pop());
            }
        });
    });

    // 3. Intercept "Add to Cart" in quick view modal
    document.querySelectorAll('.qv-btn--primary').forEach(btn => {
        btn.addEventListener('click', function (e) {
            requireAuth(e, 'shop-grid.html');
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
            requireAuth(e, window.location.pathname.split('/').pop());
        });
    });

    // 7. Update Header Auth display (Login / User Name)
    const headerAuth = document.querySelectorAll('.header__top__right__auth');
    headerAuth.forEach(el => {
        if (user && user.isLoggedIn) {
            el.innerHTML = `
                <a href="#" style="color:#28a745; font-weight:600;"><i class="fa fa-user-circle"></i> ${user.name || user.email}</a>
                <a href="#" class="logout-btn" style="margin-left:10px; color:#1D1912;"><i class="fa fa-sign-out"></i> Logout</a>
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

