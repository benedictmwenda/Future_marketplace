// SokoHub Global Auth & Navbar Helper

document.addEventListener('DOMContentLoaded', function () {
    const rawUser = localStorage.getItem('sokohub_user');
    let user = null;
    try {
        if (rawUser) user = JSON.parse(rawUser);
    } catch (e) { }

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

    // 2. Update Header Auth display (Login / User Name)
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

    // 3. Attach Logout handler
    document.querySelectorAll('.logout-btn').forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            localStorage.removeItem('sokohub_user');
            alert("Signed out successfully.");
            window.location.reload();
        });
    });
});
