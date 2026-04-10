import { describe, it, expect, beforeEach, vi } from 'vitest';
import { saveCurrentTabs, loadAllGroups, deleteGroup, restoreGroup } from '../src/lib/tabs.js';

// Mock chrome APIs
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
        remove: vi.fn((key) => {
          delete store[key];
          return Promise.resolve();
        }),
      },
    },
    tabs: {
      query: vi.fn(() =>
        Promise.resolve([
          { url: 'https://example.com', title: 'Example', favIconUrl: 'https://example.com/icon.png' },
          { url: 'https://test.com', title: 'Test', favIconUrl: '' },
        ])
      ),
    },
  };
});

describe('saveCurrentTabs', () => {
  it('creates a group with correct structure', async () => {
    const group = await saveCurrentTabs();

    expect(group).toBeDefined();
    expect(group.id).toMatch(/^group_\d+$/);
    expect(group.createdAt).toBeTypeOf('number');
    expect(group.title).toContain('2 tabs');
    expect(group.tabs).toHaveLength(2);
    expect(group.tabs[0]).toEqual({
      url: 'https://example.com',
      title: 'Example',
      favIconUrl: 'https://example.com/icon.png',
    });
  });

  it('filters out chrome:// URLs', async () => {
    chrome.tabs.query.mockResolvedValue([
      { url: 'https://example.com', title: 'Example', favIconUrl: '' },
      { url: 'chrome://settings', title: 'Settings', favIconUrl: '' },
      { url: 'chrome-extension://abc/page.html', title: 'Extension', favIconUrl: '' },
      { url: 'about:blank', title: '', favIconUrl: '' },
    ]);

    const group = await saveCurrentTabs();

    expect(group.tabs).toHaveLength(1);
    expect(group.tabs[0].url).toBe('https://example.com');
  });

  it('handles empty tab list gracefully', async () => {
    chrome.tabs.query.mockResolvedValue([]);

    const group = await saveCurrentTabs();

    expect(group).toBeNull();
  });

  it('handles all-filtered tab list gracefully', async () => {
    chrome.tabs.query.mockResolvedValue([
      { url: 'chrome://newtab', title: 'New Tab', favIconUrl: '' },
    ]);

    const group = await saveCurrentTabs();

    expect(group).toBeNull();
  });
});

describe('loadAllGroups', () => {
  it('returns groups sorted newest first', async () => {
    const groups = [
      { id: 'group_1000', createdAt: 1000, title: 'Old', tabs: [] },
      { id: 'group_3000', createdAt: 3000, title: 'New', tabs: [] },
      { id: 'group_2000', createdAt: 2000, title: 'Mid', tabs: [] },
    ];
    store.tabvault_groups = groups;

    const result = await loadAllGroups();

    expect(result[0].id).toBe('group_3000');
    expect(result[1].id).toBe('group_2000');
    expect(result[2].id).toBe('group_1000');
  });

  it('returns empty array when no groups exist', async () => {
    const result = await loadAllGroups();
    expect(result).toEqual([]);
  });
});

describe('deleteGroup', () => {
  it('removes the correct group', async () => {
    store.tabvault_groups = [
      { id: 'group_1', createdAt: 1, title: 'A', tabs: [] },
      { id: 'group_2', createdAt: 2, title: 'B', tabs: [] },
      { id: 'group_3', createdAt: 3, title: 'C', tabs: [] },
    ];

    await deleteGroup('group_2');

    expect(store.tabvault_groups).toHaveLength(2);
    expect(store.tabvault_groups.find((g) => g.id === 'group_2')).toBeUndefined();
  });
});

describe('restoreGroup', () => {
  it('returns the correct tabs', async () => {
    const tabs = [
      { url: 'https://example.com', title: 'Example', favIconUrl: '' },
    ];
    store.tabvault_groups = [
      { id: 'group_1', createdAt: 1, title: 'A', tabs },
    ];

    const result = await restoreGroup('group_1');

    expect(result).toEqual(tabs);
  });

  it('returns null for non-existent group', async () => {
    store.tabvault_groups = [];
    const result = await restoreGroup('group_999');
    expect(result).toBeNull();
  });
});
