import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DEFAULTS, loadSettings, saveSettings } from '../src/lib/settings.js';

// Mock chrome.storage.local
let mockStorage = {};
global.chrome = {
  storage: {
    local: {
      get: vi.fn((keys, cb) => {
        const result = {};
        const keyList = Array.isArray(keys) ? keys : [keys];
        for (const k of keyList) {
          if (mockStorage[k] !== undefined) result[k] = mockStorage[k];
        }
        cb(result);
      }),
      set: vi.fn((items, cb) => {
        Object.assign(mockStorage, items);
        cb();
      }),
    },
  },
  runtime: { lastError: null },
};

describe('Settings module', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockStorage = {};
  });

  it('returns defaults when nothing saved', async () => {
    const settings = await loadSettings();
    expect(settings).toEqual(DEFAULTS);
  });

  it('saves and loads settings', async () => {
    const custom = { ...DEFAULTS, name: 'Tyler', temperatureUnit: 'C' };
    await saveSettings(custom);
    const loaded = await loadSettings();
    expect(loaded.name).toBe('Tyler');
    expect(loaded.temperatureUnit).toBe('C');
  });

  it('merges partial updates correctly', async () => {
    await saveSettings({ name: 'Tyler' });
    const loaded = await loadSettings();
    expect(loaded.name).toBe('Tyler');
    // All other defaults should still be present
    expect(loaded.showWeather).toBe(true);
    expect(loaded.showQuote).toBe(true);
    expect(loaded.showFocus).toBe(true);
    expect(loaded.backgroundMode).toBe('gradient');
  });

  it('preserves existing quickLinks when updating other settings', async () => {
    const links = [
      { name: 'Google', url: 'https://google.com' },
      { name: 'GitHub', url: 'https://github.com' },
    ];
    await saveSettings({ quickLinks: links });

    // Now update a different setting
    await saveSettings({ name: 'Tyler' });

    const loaded = await loadSettings();
    expect(loaded.quickLinks).toEqual(links);
    expect(loaded.name).toBe('Tyler');
  });
});
