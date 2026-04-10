import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getCleanupSetting, setCleanupSetting, runCleanup, CLEANUP_OPTIONS } from '../src/lib/cleanup.js';

let store = {};

beforeEach(() => {
  store = {};
  globalThis.chrome = {
    storage: {
      local: {
        get: vi.fn((key) => {
          if (typeof key === 'string') {
            return Promise.resolve({ [key]: store[key] ?? undefined });
          }
          return Promise.resolve(store);
        }),
        set: vi.fn((obj) => {
          Object.assign(store, obj);
          return Promise.resolve();
        }),
      },
    },
  };
});

describe('CLEANUP_OPTIONS', () => {
  it('contains the expected options', () => {
    expect(CLEANUP_OPTIONS).toEqual([
      { label: 'Off', days: 0 },
      { label: '7 days', days: 7 },
      { label: '14 days', days: 14 },
      { label: '30 days', days: 30 },
      { label: '60 days', days: 60 },
      { label: '90 days', days: 90 },
    ]);
  });
});

describe('getCleanupSetting', () => {
  it('returns 0 (off) by default', async () => {
    const result = await getCleanupSetting();
    expect(result).toBe(0);
  });

  it('returns stored value', async () => {
    store.tabvault_cleanup_days = 30;
    const result = await getCleanupSetting();
    expect(result).toBe(30);
  });
});

describe('setCleanupSetting', () => {
  it('stores the value', async () => {
    await setCleanupSetting(14);
    expect(store.tabvault_cleanup_days).toBe(14);
  });

  it('can set to 0 (off)', async () => {
    store.tabvault_cleanup_days = 30;
    await setCleanupSetting(0);
    expect(store.tabvault_cleanup_days).toBe(0);
  });
});

describe('runCleanup', () => {
  it('returns 0 when cleanup is off (days = 0)', async () => {
    store.tabvault_cleanup_days = 0;
    store.tabvault_groups = [
      { id: 'group_1', createdAt: 1000, title: 'Old', tabs: [] },
    ];

    const removed = await runCleanup();
    expect(removed).toBe(0);
    expect(store.tabvault_groups).toHaveLength(1);
  });

  it('removes groups older than threshold', async () => {
    const now = Date.now();
    const eightDaysAgo = now - 8 * 24 * 60 * 60 * 1000;
    const threeDaysAgo = now - 3 * 24 * 60 * 60 * 1000;

    store.tabvault_cleanup_days = 7;
    store.tabvault_groups = [
      { id: 'group_old', createdAt: eightDaysAgo, title: 'Old Group', tabs: [] },
      { id: 'group_recent', createdAt: threeDaysAgo, title: 'Recent Group', tabs: [] },
    ];

    const removed = await runCleanup();
    expect(removed).toBe(1);
    expect(store.tabvault_groups).toHaveLength(1);
    expect(store.tabvault_groups[0].id).toBe('group_recent');
  });

  it('removes multiple old groups', async () => {
    const now = Date.now();
    const fifteenDaysAgo = now - 15 * 24 * 60 * 60 * 1000;
    const twentyDaysAgo = now - 20 * 24 * 60 * 60 * 1000;
    const fiveDaysAgo = now - 5 * 24 * 60 * 60 * 1000;

    store.tabvault_cleanup_days = 14;
    store.tabvault_groups = [
      { id: 'group_1', createdAt: fifteenDaysAgo, title: 'Old 1', tabs: [] },
      { id: 'group_2', createdAt: twentyDaysAgo, title: 'Old 2', tabs: [] },
      { id: 'group_3', createdAt: fiveDaysAgo, title: 'Recent', tabs: [] },
    ];

    const removed = await runCleanup();
    expect(removed).toBe(2);
    expect(store.tabvault_groups).toHaveLength(1);
    expect(store.tabvault_groups[0].id).toBe('group_3');
  });

  it('keeps all groups when none are older than threshold', async () => {
    const now = Date.now();
    const oneDayAgo = now - 1 * 24 * 60 * 60 * 1000;

    store.tabvault_cleanup_days = 30;
    store.tabvault_groups = [
      { id: 'group_1', createdAt: oneDayAgo, title: 'Recent', tabs: [] },
    ];

    const removed = await runCleanup();
    expect(removed).toBe(0);
    expect(store.tabvault_groups).toHaveLength(1);
  });

  it('handles empty groups array', async () => {
    store.tabvault_cleanup_days = 7;
    store.tabvault_groups = [];

    const removed = await runCleanup();
    expect(removed).toBe(0);
  });

  it('handles missing groups key', async () => {
    store.tabvault_cleanup_days = 7;

    const removed = await runCleanup();
    expect(removed).toBe(0);
  });

  it('does not remove auto-saved groups', async () => {
    const now = Date.now();
    const fifteenDaysAgo = now - 15 * 24 * 60 * 60 * 1000;

    store.tabvault_cleanup_days = 7;
    store.tabvault_groups = [
      { id: 'group_1', createdAt: fifteenDaysAgo, title: 'Old Group', tabs: [], autoSaved: true },
      { id: 'group_2', createdAt: fifteenDaysAgo, title: 'Old Manual', tabs: [] },
    ];

    const removed = await runCleanup();
    expect(removed).toBe(1);
    expect(store.tabvault_groups).toHaveLength(1);
    expect(store.tabvault_groups[0].id).toBe('group_1');
  });
});
