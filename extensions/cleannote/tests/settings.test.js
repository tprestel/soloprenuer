import { describe, it, expect, beforeEach } from 'vitest';

// Mock chrome.storage.local
const mockStore = {};
globalThis.chrome = {
  storage: {
    local: {
      get: (keys) => {
        if (keys === null) return Promise.resolve({ ...mockStore });
        return Promise.resolve(
          Object.fromEntries(
            (Array.isArray(keys) ? keys : [keys]).map(k => [k, mockStore[k]])
          )
        );
      },
      set: (obj) => {
        Object.assign(mockStore, obj);
        return Promise.resolve();
      },
      remove: (keys) => {
        (Array.isArray(keys) ? keys : [keys]).forEach(k => delete mockStore[k]);
        return Promise.resolve();
      }
    }
  }
};

import { loadSettings, saveSettings, DEFAULTS } from '../src/lib/settings.js';

describe('settings', () => {
  beforeEach(() => {
    Object.keys(mockStore).forEach(k => delete mockStore[k]);
  });

  it('returns defaults when no settings saved', async () => {
    const settings = await loadSettings();
    expect(settings).toEqual(DEFAULTS);
  });

  it('saves and loads settings', async () => {
    await saveSettings({ fontFamily: 'Georgia' });
    const settings = await loadSettings();
    expect(settings.fontFamily).toBe('Georgia');
  });

  it('merges partial updates with existing settings', async () => {
    await saveSettings({ fontSize: 20 });
    const settings = await loadSettings();
    expect(settings.fontSize).toBe(20);
    expect(settings.fontFamily).toBe(DEFAULTS.fontFamily);
    expect(settings.theme).toBe(DEFAULTS.theme);
  });

  it('has correct default values', () => {
    expect(DEFAULTS.fontFamily).toBe('Georgia');
    expect(DEFAULTS.fontSize).toBe(18);
    expect(DEFAULTS.theme).toBe('light');
    expect(DEFAULTS.lineHeight).toBe(1.7);
  });
});
