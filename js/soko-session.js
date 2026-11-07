/* SokoHub — API client + session (TiDB-backed)
   The browser keeps NO site data. The only thing it holds is an HttpOnly session
   cookie set by the server; who you are comes from GET /api/auth/me on each page.
   Load this script BEFORE sokohub-auth.js / sokohub-cart.js / sokohub-wishlist.js. */
(function (w, d) {
    'use strict';

    var base = String(w.SOKO_API_BASE || '/api').replace(/\/$/, '');

    function request(path, opts) {
        opts = opts || {};
        var init = { method: opts.method || 'GET', credentials: 'same-origin', headers: {} };
        if (opts.keepalive) init.keepalive = true;
        if (opts.body !== undefined) {
            init.headers['Content-Type'] = 'application/json';
            init.body = JSON.stringify(opts.body);
        }
        return fetch(base + path, init).then(function (r) {
            return r.json().catch(function () {
                return { success: false, message: 'Unexpected server response.' };
            }).then(function (data) {
                data.__status = r.status;
                return data;
            });
        });
    }

    var current = null;
    var ready = request('/auth/me').then(function (res) {
        current = (res && res.user) ? Object.assign({ isLoggedIn: true }, res.user) : null;
        return current;
    }).catch(function () {
        current = null;
        return null;
    });

    w.SokoApi = { base: base, request: request };
    w.SokoSession = {
        ready: ready,
        get: function () { return current; },
        // Sends the visitor to the login page unless signed in; resolves with the user otherwise.
        require: function (message, redirectTo) {
            return ready.then(function (u) {
                if (!u) {
                    if (message) alert(message);
                    w.location.href = './login.html?redirect=' + encodeURIComponent(redirectTo || (w.location.pathname.split('/').pop() || 'index.html'));
                }
                return u;
            });
        },
        logout: function () {
            return request('/auth/logout', { method: 'POST', body: {} }).then(function () { current = null; });
        },
        setUser: function (u) { current = u ? Object.assign({ isLoggedIn: true }, u) : null; }
    };

    // ---- Footer newsletter + contact form -> TiDB -------------------------
    d.addEventListener('DOMContentLoaded', function () {
        Array.prototype.forEach.call(d.querySelectorAll('form'), function (form) {
            var btn = form.querySelector('button[type="submit"]');
            var label = btn ? btn.textContent.trim().toLowerCase() : '';

            if (label === 'subscribe') {
                form.addEventListener('submit', function (e) {
                    e.preventDefault();
                    var input = form.querySelector('input');
                    var email = input ? input.value.trim() : '';
                    request('/newsletter', { method: 'POST', body: { email: email } }).then(function (res) {
                        alert(res.success ? (res.message || 'You are subscribed!') : (res.message || 'Could not subscribe.'));
                        if (res.success && input) input.value = '';
                    }).catch(function () { alert('Could not reach the server. Please try again.'); });
                });
            } else if (label === 'send message') {
                form.addEventListener('submit', function (e) {
                    e.preventDefault();
                    var name = (form.querySelector('input[type="text"]') || {}).value || '';
                    var email = (form.querySelector('input[type="email"]') || {}).value || '';
                    var msgEl = form.querySelector('textarea');
                    request('/contact', { method: 'POST', body: { name: name, email: email, message: msgEl ? msgEl.value : '' } }).then(function (res) {
                        alert(res.success ? (res.message || 'Message sent!') : (res.message || 'Could not send your message.'));
                        if (res.success) form.reset();
                    }).catch(function () { alert('Could not reach the server. Please try again.'); });
                });
            }
        });
    });
})(window, document);
