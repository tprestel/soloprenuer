import { storageGet, storageSet } from './storage.js';

const SETTINGS_KEY = 'tabquill_settings';

export const DEFAULTS = {
  fontFamily: 'Georgia',
  fontSize: 18,
  lineHeight: 1.7,
  theme: 'light',
  maxWidth: 700
};

export async function loadSettings() {
  const saved = await storageGet(SETTINGS_KEY);
  return { ...DEFAULTS, ...(saved || {}) };
}

export async function saveSettings(partial) {
  const current = await loadSettings();
  const updated = { ...current, ...partial };
  await storageSet(SETTINGS_KEY, updated);
  return updated;
}
