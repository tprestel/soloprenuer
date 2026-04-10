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

import { loadNote, saveNote, getLastSaved, NOTE_KEY } from '../src/lib/notes.js';

describe('notes', () => {
  beforeEach(() => {
    Object.keys(mockStore).forEach(k => delete mockStore[k]);
  });

  it('returns empty string when no note is saved', async () => {
    const content = await loadNote();
    expect(content).toBe('');
  });

  it('saves and loads a note', async () => {
    await saveNote('Hello, world!');
    const content = await loadNote();
    expect(content).toBe('Hello, world!');
  });

  it('overwrites existing note on save', async () => {
    await saveNote('First draft');
    await saveNote('Second draft');
    const content = await loadNote();
    expect(content).toBe('Second draft');
  });

  it('saves a timestamp with the note', async () => {
    const before = Date.now();
    await saveNote('Timestamped note');
    const after = Date.now();
    const lastSaved = await getLastSaved();
    expect(lastSaved).toBeGreaterThanOrEqual(before);
    expect(lastSaved).toBeLessThanOrEqual(after);
  });

  it('handles large content', async () => {
    const largeText = 'a'.repeat(100000);
    await saveNote(largeText);
    const content = await loadNote();
    expect(content).toBe(largeText);
    expect(content.length).toBe(100000);
  });

  it('preserves whitespace and newlines', async () => {
    const text = '  Line 1\n\n  Line 3\n\tTabbed  ';
    await saveNote(text);
    const content = await loadNote();
    expect(content).toBe(text);
  });

  it('exports NOTE_KEY as a string', () => {
    expect(typeof NOTE_KEY).toBe('string');
    expect(NOTE_KEY.length).toBeGreaterThan(0);
  });
});
