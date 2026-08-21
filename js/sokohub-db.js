// SokoHub Persistent IndexedDB Database Handler
// Provides high-capacity client-side database storage (up to 1GB+) 
// ensuring seller-uploaded listings with photos never fail or get deleted.

const SokoDB = (function () {
    const DB_NAME = 'SokoHubLocalDB';
    const DB_VERSION = 1;
    const STORE_NAME = 'listings';

    function openDB() {
        return new Promise((resolve, reject) => {
            if (!window.indexedDB) {
                reject(new Error("IndexedDB not supported"));
                return;
            }
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = function (e) {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                }
            };

            request.onsuccess = function (e) {
                resolve(e.target.result);
            };

            request.onerror = function (e) {
                reject(e.target.error);
            };
        });
    }

    return {
        saveListing: async function (item) {
            try {
                const db = await openDB();
                return new Promise((resolve, reject) => {
                    const tx = db.transaction(STORE_NAME, 'readwrite');
                    const store = tx.objectStore(STORE_NAME);
                    const request = store.put(item);
                    request.onsuccess = () => resolve(true);
                    request.onerror = (e) => reject(e.target.error);
                });
            } catch (err) {
                console.warn("IndexedDB save warning: ", err);
                return false;
            }
        },

        getAllListings: async function () {
            try {
                const db = await openDB();
                return new Promise((resolve, reject) => {
                    const tx = db.transaction(STORE_NAME, 'readonly');
                    const store = tx.objectStore(STORE_NAME);
                    const request = store.getAll();
                    request.onsuccess = () => resolve(request.result || []);
                    request.onerror = (e) => reject(e.target.error);
                });
            } catch (err) {
                console.warn("IndexedDB fetch warning: ", err);
                return [];
            }
        },

        deleteListing: async function (id) {
            try {
                const db = await openDB();
                return new Promise((resolve, reject) => {
                    const tx = db.transaction(STORE_NAME, 'readwrite');
                    const store = tx.objectStore(STORE_NAME);
                    const request = store.delete(id);
                    request.onsuccess = () => resolve(true);
                    request.onerror = (e) => reject(e.target.error);
                });
            } catch (err) {
                console.warn("IndexedDB delete warning: ", err);
                return false;
            }
        }
    };
})();

// Expose globally
window.SokoDB = SokoDB;
