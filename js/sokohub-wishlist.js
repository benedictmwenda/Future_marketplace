/* =====================================================
   SokoHub Wishlist Module
   Shared across all pages. Stores liked items in
   localStorage under 'sokohub_wishlist' and wires up
   every heart icon on the site automatically.
===================================================== */

(function (window, document) {
    'use strict';

    var WISHLIST_KEY = 'sokohub_wishlist';

    function getWishlist() {
        try {
            var raw = localStorage.getItem(WISHLIST_KEY);
            var parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            return [];
        }
    }

    function saveWishlist(list) {
        try {
            localStorage.setItem(WISHLIST_KEY, JSON.stringify(list));
        } catch (e) { /* noop */ }
        updateWishlistUI();
    }

    function isInWishlist(id) {
        return getWishlist().some(function (item) { return String(item.id) === String(id); });
    }

    function addToWishlist(item) {
        if (!item || !item.id) return;
        var list = getWishlist();
        if (list.some(function (i) { return String(i.id) === String(item.id); })) return;
        list.unshift({
            id: item.id,
            title: item.title || 'Listing',
            price: item.price,
            image: (item.images && item.images[0]) || item.imageUrl || item.image || 'img/featured/feature-1.jpg',
            category: item.category || 'Product',
            seller: item.sellerName || item.seller || 'Verified Seller'
        });
        saveWishlist(list);
    }

    function removeFromWishlist(id) {
        var list = getWishlist().filter(function (item) { return String(item.id) !== String(id); });
        saveWishlist(list);
    }

    // Returns true if now liked, false if now un-liked.
    function toggleWishlist(item) {
        if (!item || !item.id) return false;
        if (isInWishlist(item.id)) {
            removeFromWishlist(item.id);
            return false;
        }
        addToWishlist(item);
        return true;
    }

    function getWishlistCount() {
        return getWishlist().length;
    }

    // ---- UI sync --------------------------------------------------------

    // Updates every heart icon on the page to reflect current wishlist state,
    // and any header wishlist-count badge (id="wishlist-count" if present).
    function updateWishlistUI() {
        var count = getWishlistCount();
        document.querySelectorAll('#wishlist-count, .wishlist-count').forEach(function (el) {
            el.textContent = count;
        });

        // Header + hamburger-menu heart icon count (identified by its icon,
        // since its link is just href="#" with nothing else to target it by).
        document.querySelectorAll('.header__cart ul li a, .humberger__menu__cart ul li a').forEach(function (link) {
            if (!link.querySelector('.fa-heart')) return;
            var span = link.querySelector('span');
            if (span) span.textContent = count;
        });

        var openPanel = document.querySelector('.soko-header-dropdown.soko-wishlist-dropdown.open');
        if (openPanel) renderWishlistDropdown(openPanel);

        document.querySelectorAll('[data-qv-id]').forEach(function (el) {
            var icon = el.classList && el.classList.contains('fa-heart') ? el : el.querySelector('.fa-heart');
            if (!icon) return;
            var id = el.dataset.qvId;
            if (isInWishlist(id)) {
                icon.classList.remove('fa-heart-o');
                icon.classList.add('fa-heart');
                icon.style.color = '#e74c3c';
            } else {
                icon.style.color = '';
            }
        });
    }

    function likedFeedback(el, liked) {
        if (!el) return;
        el.style.transform = 'scale(1.25)';
        setTimeout(function () { el.style.transform = 'scale(1)'; }, 150);
    }

    // ---- Wishlist preview dropdown --------------------------------------

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

    function renderWishlistDropdown(panel) {
        var list = getWishlist();
        var listEl = panel.querySelector('.soko-header-dropdown__list');
        listEl.innerHTML = '';

        if (list.length === 0) {
            listEl.innerHTML = '<div class="soko-header-dropdown__empty">No liked items yet.<br>Tap the heart on any listing to save it here.</div>';
        } else {
            list.forEach(function (item) {
                var priceLabel = typeof item.price === 'number' ? 'KSH ' + item.price.toLocaleString() : (item.price || '');
                listEl.appendChild(buildDropdownItemRow({
                    image: item.image,
                    title: item.title,
                    priceLabel: priceLabel,
                    href: String(item.id).indexOf('qv-') === 0 || String(item.id).indexOf('demo-') === 0 ? '#' : 'shop-details.html?id=' + item.id,
                    onRemove: function () {
                        removeFromWishlist(item.id);
                        renderWishlistDropdown(panel);
                    }
                }));
            });
        }
    }

    function buildWishlistDropdownPanel() {
        var panel = document.createElement('div');
        panel.className = 'soko-header-dropdown soko-wishlist-dropdown';
        panel.innerHTML =
            '<div class="soko-header-dropdown__title">Liked Items</div>' +
            '<div class="soko-header-dropdown__list"></div>' +
            '<div class="soko-header-dropdown__footer">' +
                '<a href="shop-grid.html" class="primary" style="flex:1 1 100%;">Browse Listings</a>' +
            '</div>';
        renderWishlistDropdown(panel);
        return panel;
    }

    function closeAllHeaderDropdowns(except) {
        document.querySelectorAll('.soko-header-dropdown.open').forEach(function (p) {
            if (p !== except) p.classList.remove('open');
        });
    }

    function wireWishlistDropdownTriggers() {
        document.querySelectorAll('.header__cart ul li a, .humberger__menu__cart ul li a').forEach(function (link) {
            if (!link.querySelector('.fa-heart') || link.dataset.sokoWishlistWired) return;
            link.dataset.sokoWishlistWired = '1';
            link.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                var li = link.closest('li');
                var existing = li.querySelector('.soko-wishlist-dropdown');
                if (existing) {
                    var isOpen = existing.classList.contains('open');
                    closeAllHeaderDropdowns();
                    if (!isOpen) { renderWishlistDropdown(existing); existing.classList.add('open'); }
                    return;
                }
                closeAllHeaderDropdowns();
                var panel = buildWishlistDropdownPanel();
                li.style.position = 'relative';
                li.appendChild(panel);
                panel.classList.add('open');
            });
        });

        if (!document.body.dataset.sokoWishlistOutsideClickWired) {
            document.body.dataset.sokoWishlistOutsideClickWired = '1';
            document.addEventListener('click', function (e) {
                if (!e.target.closest('.soko-wishlist-dropdown') && !e.target.closest('.header__cart, .humberger__menu__cart')) {
                    closeAllHeaderDropdowns();
                }
            });
        }
    }

    // Delegated click handling for every heart icon on the site: product
    // cards (data-qv-id on the link), the Quick View modal's Wishlist
    // button, and the main product page's heart-icon button.
    document.addEventListener('click', function (e) {
        // Product card heart icon (has data-qv-id, contains fa-heart, is NOT the eye/quick-view button)
        var cardHeart = e.target.closest('a[data-qv-id]');
        if (cardHeart && cardHeart.querySelector('.fa-heart') && !cardHeart.classList.contains('quick-view-btn')) {
            e.preventDefault();
            var id = cardHeart.dataset.qvId;
            var item = window.quickViewItems ? window.quickViewItems[id] : null;
            if (item) {
                var nowLiked = toggleWishlist(item);
                likedFeedback(cardHeart.querySelector('.fa-heart'), nowLiked);
            }
            return;
        }

        // Quick View modal's "Wishlist" outline button
        var qvWishlistBtn = e.target.closest('.qv-actions .qv-btn--outline');
        if (qvWishlistBtn) {
            e.preventDefault();
            var nameEl = document.getElementById('qv-name');
            var priceEl = document.getElementById('qv-price');
            var imgEl = document.getElementById('qv-img');
            var catEl = document.getElementById('qv-category');
            var sellerEl = document.getElementById('qv-seller');
            if (nameEl && nameEl.textContent) {
                var qvItem = {
                    id: qvWishlistBtn.dataset.qvId || 'qv-' + nameEl.textContent.trim().replace(/\s+/g, '-').toLowerCase(),
                    title: nameEl.textContent.trim(),
                    price: priceEl ? priceEl.textContent.trim() : '',
                    image: imgEl ? imgEl.src : '',
                    category: catEl ? catEl.textContent.trim() : 'Product',
                    seller: sellerEl ? sellerEl.textContent.trim() : 'Verified Seller'
                };
                var liked = toggleWishlist(qvItem);
                qvWishlistBtn.innerHTML = liked
                    ? '<i class="fa fa-heart" style="color:#e74c3c;"></i> Liked'
                    : '<i class="fa fa-heart"></i> Wishlist';
            }
            return;
        }

        // Main product page heart-icon button
        var mainHeart = e.target.closest('.heart-icon');
        if (mainHeart) {
            e.preventDefault();
            var currentItem = window.__sokoCurrentDetailItem;
            if (currentItem) {
                var mainLiked = toggleWishlist(currentItem);
                var icon = mainHeart.querySelector('span, i');
                likedFeedback(icon, mainLiked);
                mainHeart.style.color = mainLiked ? '#e74c3c' : '';
            }
        }
    });

    window.SokoWishlist = {
        getWishlist: getWishlist,
        addToWishlist: addToWishlist,
        removeFromWishlist: removeFromWishlist,
        toggleWishlist: toggleWishlist,
        isInWishlist: isInWishlist,
        getWishlistCount: getWishlistCount,
        updateWishlistUI: updateWishlistUI
    };

    document.addEventListener('DOMContentLoaded', function () {
        updateWishlistUI();
        wireWishlistDropdownTriggers();
    });
    if (document.readyState === 'interactive' || document.readyState === 'complete') {
        setTimeout(function () {
            updateWishlistUI();
            wireWishlistDropdownTriggers();
        }, 0);
    }

})(window, document);
