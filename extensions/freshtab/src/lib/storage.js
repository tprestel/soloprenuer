/**
 * Chrome storage wrapper for FreshTab.
 * Provides async get/set/remove over chrome.storage.local.
 */

/**
 * Get one or more values from chrome.storage.local.
 * @param {string|string[]} keys - Key or array of keys to retrieve
 * @returns {Promise<Object>} - Object with key-value pairs
 */
export function storageGet(keys) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(keys, (result) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(result);
      }
    });
  });
}

/**
 * Set one or more values in chrome.storage.local.
 * @param {Object} items - Object with key-value pairs to store
 * @returns {Promise<void>}
 */
export function storageSet(items) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(items, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}

/**
 * Remove one or more keys from chrome.storage.local.
 * @param {string|string[]} keys - Key or array of keys to remove
 * @returns {Promise<void>}
 */
export function storageRemove(keys) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.remove(keys, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}
