/**
 * Storage Helper
 * Abstraction layer to handle both Chrome Extension Storage and Web LocalStorage
 */
const StorageHelper = {
    isExtension: typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local,

    get(keys, callback) {
        if (this.isExtension) {
            chrome.storage.local.get(keys, callback);
        } else {
            const results = {};
            const keyList = Array.isArray(keys) ? keys : [keys];

            if (keys === null) {
                // Get everything from localStorage
                for (let i = 0; i < localStorage.length; i++) {
                    const k = localStorage.key(i);
                    try {
                        results[k] = JSON.parse(localStorage.getItem(k));
                    } catch (e) {
                        results[k] = localStorage.getItem(k);
                    }
                }
            } else {
                keyList.forEach(key => {
                    const val = localStorage.getItem(key);
                    try {
                        results[key] = val ? JSON.parse(val) : undefined;
                    } catch (e) {
                        results[key] = val;
                    }
                });
            }
            if (callback) callback(results);
        }
    },

    set(items, callback) {
        if (this.isExtension) {
            chrome.storage.local.set(items, callback);
        } else {
            for (const key in items) {
                const val = items[key];
                localStorage.setItem(key, typeof val === 'object' ? JSON.stringify(val) : val);
            }
            if (callback) callback();
        }
    },

    remove(keys, callback) {
        if (this.isExtension) {
            chrome.storage.local.remove(keys, callback);
        } else {
            const keyList = Array.isArray(keys) ? keys : [keys];
            keyList.forEach(key => localStorage.removeItem(key));
            if (callback) callback();
        }
    },

    clear(callback) {
        if (this.isExtension) {
            chrome.storage.local.clear(callback);
        } else {
            localStorage.clear();
            if (callback) callback();
        }
    }
};
