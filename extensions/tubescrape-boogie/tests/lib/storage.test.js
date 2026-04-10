import { describe, it, expect, beforeEach } from 'vitest';

// Mock chrome.storage.local
const mockStore = {};
globalThis.chrome = {
  storage: {
    local: {
      get: (keys) => {
        if (keys === null) return Promise.resolve({ ...mockStore });
        const keyList = Array.isArray(keys) ? keys : [keys];
        const result = {};
        keyList.forEach(k => { if (k in mockStore) result[k] = mockStore[k]; });
        return Promise.resolve(result);
      },
      set: (obj) => {
        Object.assign(mockStore, obj);
        return Promise.resolve();
      },
      remove: (keys) => {
        (Array.isArray(keys) ? keys : [keys]).forEach(k => delete mockStore[k]);
        return Promise.resolve();
      },
    },
  },
};

import {
  saveTranscript,
  getTranscript,
  getAllTranscripts,
  deleteTranscript,
  saveFolder,
  getFolders,
  deleteFolder,
  saveKeywords,
  getKeywords,
  getSettings,
  saveSettings,
} from '../../src/lib/storage.js';

describe('storage — transcripts', () => {
  beforeEach(() => {
    Object.keys(mockStore).forEach(k => delete mockStore[k]);
  });

  it('saves and retrieves a transcript by video ID', async () => {
    const transcript = {
      id: 'abc123',
      title: 'Test Video',
      channel: 'Test Channel',
      channelId: 'UC123',
      publishDate: '2026-03-15',
      viewCount: 1000,
      description: 'A test',
      language: 'en',
      transcript: [{ start: 0, duration: 3, text: 'Hello' }],
      formattedText: 'Hello',
      savedAt: '2026-04-10T00:00:00Z',
      tags: [],
      folderId: null,
      notes: [],
      quotes: [],
      keywordMatches: {},
    };
    await saveTranscript(transcript);
    const result = await getTranscript('abc123');
    expect(result).toEqual(transcript);
  });

  it('returns null for a transcript that does not exist', async () => {
    const result = await getTranscript('nonexistent');
    expect(result).toBeNull();
  });

  it('lists all saved transcripts', async () => {
    await saveTranscript({ id: 'v1', title: 'V1' });
    await saveTranscript({ id: 'v2', title: 'V2' });
    const all = await getAllTranscripts();
    expect(all).toHaveLength(2);
    expect(all.map(t => t.id).sort()).toEqual(['v1', 'v2']);
  });

  it('deletes a transcript', async () => {
    await saveTranscript({ id: 'del1', title: 'Delete Me' });
    await deleteTranscript('del1');
    const result = await getTranscript('del1');
    expect(result).toBeNull();
  });

  it('overwrites a transcript with the same ID', async () => {
    await saveTranscript({ id: 'ow1', title: 'Original' });
    await saveTranscript({ id: 'ow1', title: 'Updated' });
    const result = await getTranscript('ow1');
    expect(result.title).toBe('Updated');
  });
});

describe('storage — folders', () => {
  beforeEach(() => {
    Object.keys(mockStore).forEach(k => delete mockStore[k]);
  });

  it('saves and retrieves folders', async () => {
    await saveFolder({ id: 'f1', name: 'Campaign Q2', createdAt: '2026-04-10' });
    const folders = await getFolders();
    expect(folders).toHaveLength(1);
    expect(folders[0].name).toBe('Campaign Q2');
  });

  it('deletes a folder by ID', async () => {
    await saveFolder({ id: 'f1', name: 'Delete Me', createdAt: '2026-04-10' });
    await deleteFolder('f1');
    const folders = await getFolders();
    expect(folders).toHaveLength(0);
  });
});

describe('storage — keywords', () => {
  beforeEach(() => {
    Object.keys(mockStore).forEach(k => delete mockStore[k]);
  });

  it('saves and retrieves keyword watchlist', async () => {
    const keywords = [
      { term: 'AI automation', color: '#ff6b6b', addedAt: '2026-04-10' },
    ];
    await saveKeywords(keywords);
    const result = await getKeywords();
    expect(result).toEqual(keywords);
  });

  it('returns empty array when no keywords saved', async () => {
    const result = await getKeywords();
    expect(result).toEqual([]);
  });
});

describe('storage — settings', () => {
  beforeEach(() => {
    Object.keys(mockStore).forEach(k => delete mockStore[k]);
  });

  it('returns default settings when none saved', async () => {
    const settings = await getSettings();
    expect(settings.autoScrape).toBe(false);
    expect(settings.sidebarWidth).toBe(400);
    expect(settings.autoScroll).toBe(true);
    expect(settings.defaultExportFormat).toBe('markdown');
  });

  it('merges saved settings with defaults', async () => {
    await saveSettings({ autoScrape: true });
    const settings = await getSettings();
    expect(settings.autoScrape).toBe(true);
    expect(settings.sidebarWidth).toBe(400);
  });
});
