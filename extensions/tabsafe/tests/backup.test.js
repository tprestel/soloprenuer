import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createBackup, listBackups, restoreFromBackup } from '../src/lib/backup.js';

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

describe('createBackup', () => {
  it('saves current groups as a backup', async () => {
    store.tabvault_groups = [
      { id: 'group_1', createdAt: 1, title: 'A', tabs: [{ url: 'https://a.com', title: 'A', favIconUrl: '' }] },
    ];

    await createBackup();

    expect(store.tabvault_backups).toHaveLength(1);
    expect(store.tabvault_backups[0].groups).toEqual(store.tabvault_groups);
    expect(store.tabvault_backups[0].id).toMatch(/^backup_\d+$/);
    expect(store.tabvault_backups[0].createdAt).toBeTypeOf('number');
  });

  it('keeps only the last 5 backups (drops oldest)', async () => {
    store.tabvault_groups = [{ id: 'g', createdAt: 1, title: 'X', tabs: [] }];
    store.tabvault_backups = Array.from({ length: 5 }, (_, i) => ({
      id: `backup_${i}`,
      createdAt: i,
      groups: [],
    }));

    await createBackup();

    expect(store.tabvault_backups).toHaveLength(5);
    // oldest (createdAt: 0) should be gone
    expect(store.tabvault_backups.find((b) => b.id === 'backup_0')).toBeUndefined();
  });
});

describe('listBackups', () => {
  it('returns backups sorted by date newest first', async () => {
    store.tabvault_backups = [
      { id: 'backup_1', createdAt: 1000, groups: [] },
      { id: 'backup_3', createdAt: 3000, groups: [] },
      { id: 'backup_2', createdAt: 2000, groups: [] },
    ];

    const result = await listBackups();

    expect(result[0].id).toBe('backup_3');
    expect(result[1].id).toBe('backup_2');
    expect(result[2].id).toBe('backup_1');
  });

  it('returns empty array when no backups exist', async () => {
    const result = await listBackups();
    expect(result).toEqual([]);
  });
});

describe('restoreFromBackup', () => {
  it('replaces current groups with backup data', async () => {
    const backupGroups = [
      { id: 'group_old', createdAt: 1, title: 'Old', tabs: [{ url: 'https://old.com', title: 'Old', favIconUrl: '' }] },
    ];
    store.tabvault_backups = [
      { id: 'backup_1', createdAt: 1000, groups: backupGroups },
    ];
    store.tabvault_groups = [
      { id: 'group_current', createdAt: 2, title: 'Current', tabs: [] },
    ];

    await restoreFromBackup('backup_1');

    expect(store.tabvault_groups).toEqual(backupGroups);
  });

  it('returns false for non-existent backup', async () => {
    store.tabvault_backups = [];
    const result = await restoreFromBackup('backup_999');
    expect(result).toBe(false);
  });
});
