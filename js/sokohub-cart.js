/* =====================================================
   SokoHub Cart Module
   Shared across all pages. Stores cart in localStorage
   under 'sokohub_cart' and syncs the header total + count
   on every page automatically.
===================================================== */

(function (window, document) {
    'use strict';

    var CART_KEY = 'sokohub_cart';

    // Checkout constants — MUST match the cart/checkout page calculations so
    // the header total is always identical to the amount shown at checkout.
    var DELIVERY_FEE = 500;
    var DISCOUNT = 1500;


    // ---- Read helpers -------------------------------------------------

    function getCart() {
        try {
            var raw = localStorage.getItem(CART_KEY);
            if (!raw) {
                return [];
            }
            var parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            return [];
        }
    }

    function saveCart(cart) {
        try {
            localStorage.setItem(CART_KEY, JSON.stringify(cart));
        } catch (e) {
            console.warn('Could not save cart:', e);
        }
    }

    // ---- Math ---------------------------------------------------------

    function getCartTotal() {
        var cart = getCart();
        var total = 0;
        cart.forEach(function (item) {
            var price = parseFloat(item.price) || 0;
            var qty = parseInt(item.quantity, 10) || 1;
            total += price * qty;
        });
        return total;
    }

    function getCartCount() {
        var cart = getCart();
        var count = 0;
        cart.forEach(function (item) {
            count += parseInt(item.quantity, 10) || 1;
        });
        return count;
    }

    function formatKsh(amount) {
        var n = Math.round(amount || 0);
        return 'KSH ' + n.toLocaleString('en-KE');
    }

    // ---- Mutations ----------------------------------------------------

    function addToCart(item, qty) {
        if (!item || !item.id) return;
        qty = qty || 1;
        var cart = getCart();
        var found = false;
        cart.forEach(function (cartItem) {
            if (cartItem.id === item.id) {
                cartItem.quantity = (parseInt(cartItem.quantity, 10) || 1) + qty;
                found = true;
            }
        });
        if (!found) {
            cart.unshift({
                id: item.id,
                title: item.title || 'Listing',
                price: parseFloat(item.price) || 0,
                quantity: qty,
                image: item.image || 'img/featured/feature-1.jpg',
                badge: item.badge || 'Product',
                seller: item.seller || 'Verified Seller'
            });
        }
        saveCart(cart);
        updateCartUI();
        return cart;
    }

    function removeFromCart(id) {
        var cart = getCart().filter(function (item) { return item.id !== id; });
        saveCart(cart);
        updateCartUI();
        return cart;
    }

    function updateCartQty(id, qty) {
        var cart = getCart();
        qty = Math.max(parseInt(qty, 10) || 0, 0);
        if (qty === 0) {
            cart = cart.filter(function (item) { return item.id !== id; });
        } else {
            cart.forEach(function (item) {
                if (item.id === id) item.quantity = qty;
            });
        }
        saveCart(cart);
        updateCartUI();
        return cart;
    }

    function clearCart() {
        saveCart([]);
        updateCartUI();
    }

    // ---- Checkout total ------------------------------------------------
    // The amount the buyer actually pays at checkout = subtotal + delivery - discount.
    // Header price MUST equal this same value on every page.
    function getCheckoutTotal() {
        var subtotal = getCartTotal();
        var total = subtotal + DELIVERY_FEE - DISCOUNT;
        // Never show a negative total.
        return total > 0 ? total : 0;
    }

    // ---- UI sync ------------------------------------------------------

    // Updates every header/humberger cart price + bag count on the page.
    function updateCartUI() {
        var total = getCheckoutTotal();
        var count = getCartCount();
        var priceEls = document.querySelectorAll('.header__cart__price span');
        var i;

        for (i = 0; i < priceEls.length; i++) {
            priceEls[i].textContent = formatKsh(total);
        }

        // Bag count: identified by icon, since the link is just href="#"
        // (an href*="cart" selector never actually matched anything here).
        var bagLinks = [];
        document.querySelectorAll('.header__cart ul li a, .humberger__menu__cart ul li a').forEach(function (link) {
            if (!link.querySelector('.fa-shopping-bag')) return;
            var span = link.querySelector('span');
            if (span) span.textContent = count;
            bagLinks.push(link);
        });

        // Also update any element with [data-cart-total] or [data-cart-count]
        document.querySelectorAll('[data-cart-total]').forEach(function (el) {
            el.textContent = formatKsh(total);
        });
        document.querySelectorAll('[data-cart-count]').forEach(function (el) {
            el.textContent = count;
        });

        // Dispatch so pages with custom widgets can react
        document.dispatchEvent(new CustomEvent('sokohub:cart-updated', {
            detail: { total: total, count: count }
        }));

        // If a cart preview dropdown is currently open, refresh its contents
        // so removing an item updates it live instead of going stale.
        var openPanel = document.querySelector('.soko-header-dropdown.soko-cart-dropdown.open');
        if (openPanel) renderCartDropdown(openPanel);
    }

    // ---- Cart preview dropdown ----------------------------------------

    function buildDropdownItemRow(opts) {
        var row = document.createElement('div');
        row.className = 'soko-header-dropdown__item';
        row.innerHTML =
            '<img src="' + (opts.image || 'img/featured/feature-1.jpg') + '" alt="">' +
            '<div class="soko-header-dropdown__item__info">' +
                '<a href="' + opts.href + '">' + opts.title + '</a>' +
                '<span>' + opts.priceLabel + '</span>' +
            '</div>' +
            '<button type="button" class="soko-header-dropdown__item__remove" title="Remove"><i class="fa fa-times"></i></button>';
        row.querySelector('button').addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            opts.onRemove();
        });
        return row;
    }

    function renderCartDropdown(panel) {
        var cart = getCart();
        var listEl = panel.querySelector('.soko-header-dropdown__list');
        listEl.innerHTML = '';

        if (cart.length === 0) {
            listEl.innerHTML = '<div class="soko-header-dropdown__empty">Your cart is empty.</div>';
        } else {
            cart.forEach(function (item) {
                var qty = parseInt(item.quantity, 10) || 1;
                var lineTotal = (parseFloat(item.price) || 0) * qty;
                listEl.appendChild(buildDropdownItemRow({
                    image: item.image,
                    title: item.title + (qty > 1 ? ' × ' + qty : ''),
                    priceLabel: formatKsh(lineTotal),
                    href: 'shoping-cart.html',
                    onRemove: function () {
                        removeFromCart(item.id);
                        renderCartDropdown(panel);
                    }
                }));
            });
        }
    }

    function buildCartDropdownPanel() {
        var panel = document.createElement('div');
        panel.className = 'soko-header-dropdown soko-cart-dropdown';
        panel.innerHTML =
            '<div class="soko-header-dropdown__title">Your Cart</div>' +
            '<div class="soko-header-dropdown__list"></div>' +
            '<div class="soko-header-dropdown__footer">' +
                '<a href="shoping-cart.html" class="outline">View Cart</a>' +
                '<a href="checkout.html" class="primary">Checkout</a>' +
            '</div>';
        renderCartDropdown(panel);
        return panel;
    }

    function closeAllHeaderDropdowns(except) {
        document.querySelectorAll('.soko-header-dropdown.open').forEach(function (p) {
            if (p !== except) p.classList.remove('open');
        });
    }

    function wireCartDropdownTriggers() {
        document.querySelectorAll('.header__cart ul li a, .humberger__menu__cart ul li a').forEach(function (link) {
            if (!link.querySelector('.fa-shopping-bag') || link.dataset.sokoCartWired) return;
            link.dataset.sokoCartWired = '1';
            link.addEventListener('click', function (e) {
                e.preventDefault();
                var li = link.closest('li');
                var existing = li.querySelector('.soko-cart-dropdown');
                if (existing) {
                    var isOpen = existing.classList.contains('open');
                    closeAllHeaderDropdowns();
                    if (!isOpen) { renderCartDropdown(existing); existing.classList.add('open'); }
                    return;
                }
                closeAllHeaderDropdowns();
                var panel = buildCartDropdownPanel();
                li.style.position = 'relative';
                li.appendChild(panel);
                panel.classList.add('open');
            });
        });

        if (!document.body.dataset.sokoCartOutsideClickWired) {
            document.body.dataset.sokoCartOutsideClickWired = '1';
            document.addEventListener('click', function (e) {
                if (!e.target.closest('.soko-cart-dropdown') && !e.target.closest('.header__cart, .humberger__menu__cart')) {
                    closeAllHeaderDropdowns();
                }
            });
        }
    }

    // ---- Click handling: "Add to cart" icons -------------------------
    // Delegates clicks on any listing's cart icon (fa-shopping-cart / fa-cart)
    // so the header total updates live without page-specific code.

    function parsePriceToNumber(priceText) {
        if (!priceText) return 0;
        var cleaned = priceText.replace(/[^0-9]/g, '');
        return parseFloat(cleaned) || 0;
    }

    function extractListingFromContainer(container) {
        if (!container) return null;

        var titleEl = container.querySelector('.featured__item__text h6 a, .product__item__text h6 a, .latest-product__item__text h6');
        var priceEl = container.querySelector('.featured__item__text h5, .product__item__text h5, .latest-product__item__text span');
        var imageEl = container.querySelector('.featured__item__pic, .product__item__pic, .latest-product__item__pic img');

        var id = container.getAttribute('data-id') || 'item_' + Date.now();

        return {
            id: id,
            title: titleEl ? titleEl.textContent.trim() : 'Marketplace Listing',
            price: priceEl ? parsePriceToNumber(priceEl.textContent) : 0,
            image: imageEl
                ? (imageEl.getAttribute('data-setbg') ||
                   (imageEl.tagName === 'IMG' ? imageEl.src : '') ||
                   getComputedStyle(imageEl).backgroundImage.replace(/url\((['"]?)(.*?)\1\)/g, '$2') ||
                   'img/featured/feature-1.jpg')
                : 'img/featured/feature-1.jpg'
        };
    }

    document.addEventListener('click', function (e) {
        var target = e.target;

        // Find the clickable anchor containing the cart icon
        var link = target.closest ? target.closest('a') : null;
        if (!link) return;

        var isCartIcon = link.querySelector && link.querySelector('i.fa-shopping-cart, i.fa-cart-plus, i.fa-cart-plus');
        if (!isCartIcon) {
            // Also support the Quick View "Add to Cart" primary button
            if (!(link.classList && link.classList.contains('qv-btn--primary'))) return;
        }

        // If a page already intercepts the click (e.g. auth guard on shop-details),
        // let it run first and DO NOT hijack when a handler was attached.
        var container = link.closest('.featured__item, .product__item, .latest-product__item');

        // Quick View modal: read directly from the populated modal fields
        if (link.classList && link.classList.contains('qv-btn--primary')) {
            var nameEl = document.getElementById('qv-name');
            var priceEl = document.getElementById('qv-price');
            var imgEl = document.getElementById('qv-img');
            if (nameEl && priceEl) {
                e.preventDefault();
                addToCart({
                    id: 'qv-' + (nameEl.textContent.trim().replace(/\s+/g, '-').toLowerCase()),
                    title: nameEl.textContent.trim(),
                    price: parsePriceToNumber(priceEl.textContent),
                    image: imgEl ? imgEl.src : 'img/featured/feature-1.jpg',
                    badge: document.getElementById('qv-category') ? document.getElementById('qv-category').textContent : 'Product'
                }, 1);
                // Optional visual feedback
                if (link.tagName === 'A') {
                    link.textContent = 'Added ✓';
                    setTimeout(function () { link.textContent = 'Add to Cart'; }, 1200);
                }
            }
            return;
        }

        if (container) {
            // Only intercept if no other handler already handled this link.
            var item = extractListingFromContainer(container);
            if (item.price > 0) {
                e.preventDefault();
                addToCart(item, 1);
                // Tiny feedback
                var icon = link.querySelector('i');
                if (icon) {
                    var originalClass = icon.className;
                    icon.className = 'fa fa-check';
                    setTimeout(function () { icon.className = originalClass; }, 900);
                }
            }
        }
    });

    // ---- Expose API ---------------------------------------------------

    window.SokoCart = {
        getCart: getCart,
        saveCart: saveCart,
        addToCart: addToCart,
        removeFromCart: removeFromCart,
        updateCartQty: updateCartQty,
        clearCart: clearCart,
        getCartTotal: getCartTotal,
        getCheckoutTotal: getCheckoutTotal,
        getCartCount: getCartCount,
        formatKsh: formatKsh,
        updateCartUI: updateCartUI
    };

    // Auto-sync header/cart indicators on DOM ready
    document.addEventListener('DOMContentLoaded', function () {
        updateCartUI();
        wireCartDropdownTriggers();
    });

    // Also sync immediately in case DOM is already parsed
    if (document.readyState === 'interactive' || document.readyState === 'complete') {
        setTimeout(function () {
            updateCartUI();
            wireCartDropdownTriggers();
        }, 0);
    }

})(window, document);

