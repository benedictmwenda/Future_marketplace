// SokoHub Frontend MySQL API Client
// Connects browser pages to http://localhost:5000/api/listings

const SokoMySQL = (function () {
    const API_PORTS = [5000, 5001];

    async function getActiveBaseUrl() {
        for (let port of API_PORTS) {
            try {
                const res = await fetch(`http://localhost:${port}/api/listings`);
                if (res.ok) return `http://localhost:${port}/api`;
            } catch (e) {}
        }
        return `http://localhost:5000/api`;
    }

    return {
        // Save listing to MySQL API
        saveListing: async function (item) {
            try {
                const baseUrl = await getActiveBaseUrl();
                const response = await fetch(`${baseUrl}/listings`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(item)
                });
                const data = await response.json();
                if (data.success) {
                    console.log('✅ Saved listing to MySQL Database:', data.id);
                    return true;
                } else {
                    console.warn('MySQL API error:', data.error);
                    return false;
                }
            } catch (err) {
                console.warn('MySQL Server offline or unreachable:', err.message);
                return false;
            }
        },

        // Fetch all listings from MySQL API
        fetchListings: async function () {
            try {
                const baseUrl = await getActiveBaseUrl();
                const response = await fetch(`${baseUrl}/listings`);
                const data = await response.json();
                if (data.success && Array.isArray(data.listings)) {
                    return data.listings;
                }
            } catch (err) {
                console.warn('MySQL Server offline or unreachable during fetch:', err.message);
            }
            return null;
        },

        // Delete listing from MySQL API
        deleteListing: async function (id) {
            try {
                const response = await fetch(`${API_BASE_URL}/listings/${id}`, {
                    method: 'DELETE'
                });
                const data = await response.json();
                return data.success;
            } catch (err) {
                console.warn('Could not delete from MySQL API:', err.message);
                return false;
            }
        }
    };
})();

// Expose globally
window.SokoMySQL = SokoMySQL;
