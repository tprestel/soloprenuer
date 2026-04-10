/**
 * Settings module for FreshTab.
 * Manages user preferences with defaults and partial merge support.
 */

export const DEFAULTS = {
  name: '',
  showWeather: true,
  showQuote: true,
  showFocus: true,
  showLinks: true,
  temperatureUnit: 'F',
  quickLinks: [],
  backgroundMode: 'gradient', // 'gradient', 'solid', 'unsplash'
};

/**
 * Load settings from chrome.storage.local, merged with defaults.
 * @returns {Promise<Object>}
 */
export async function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get('settings', (result) => {
      resolve({ ...DEFAULTS, ...(result.settings || {}) });
    });
  });
}

/**
 * Save settings to chrome.storage.local.
 * Performs a partial merge: loads existing settings, applies updates, saves.
 * @param {Object} partial - Partial settings object to merge
 * @returns {Promise<void>}
 */
export async function saveSettings(partial) {
  const current = await loadSettings();
  const merged = { ...current, ...partial };
  return new Promise((resolve) => {
    chrome.storage.local.set({ settings: merged }, () => {
      resolve();
    });
  });
}
