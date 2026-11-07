// SokoHub listings client — talks to the TiDB-backed API (/api/listings).
// (File name kept so existing <script> tags keep working; the old global name
// SokoMySQL is kept as an alias of SokoTiDB.)
const SokoTiDB = (function () {
    function api() { return window.SokoApi; }

    return {
        // Resolves { ok, id, listing } on success or { ok:false, message } on failure.
        saveListing: async function (item) {
            try {
                const data = await api().request('/listings', { method: 'POST', body: item });
                if (data.success) return { ok: true, id: data.id, listing: data.listing };
                return { ok: false, message: data.message || 'Could not save your listing.' };
            } catch (err) {
                return { ok: false, message: 'Could not reach the server. Please check your connection and try again.' };
            }
        },

        // Resolves an array of listings, or null if the server could not be reached.
        fetchListings: async function () {
            try {
                // Use the request started in <head> once; later calls always hit the server.
                const early = window.__earlyListingsPromise;
                window.__earlyListingsPromise = null;
                if (early) {
                    const list = await early;
                    if (Array.isArray(list)) return list;
                }
                const data = await api().request('/listings');
                if (data.success && Array.isArray(data.listings)) return data.listings;
            } catch (err) {
                console.warn('Could not load listings:', err.message);
            }
            return null;
        },

        deleteListing: async function (id) {
            try {
                const data = await api().request('/listings/' + encodeURIComponent(id), { method: 'DELETE' });
                return { ok: !!data.success, message: data.message };
            } catch (err) {
                return { ok: false, message: 'Could not reach the server.' };
            }
        },

        recordView: function (id) {
            try { api().request('/listings/' + encodeURIComponent(id) + '/view', { method: 'POST', body: {} }); } catch (e) { }
        }
    };
})();

window.SokoTiDB = SokoTiDB;
window.SokoMySQL = SokoTiDB;
