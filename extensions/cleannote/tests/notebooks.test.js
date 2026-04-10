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

import {
  loadNotebooks,
  saveNotebooks,
  createNotebook,
  renameNotebook,
  deleteNotebook,
  getActiveNotebook,
  setActiveNotebook,
  updateNotebookContent,
  searchNotebooks,
  migrateFromSingleNote,
  NOTEBOOKS_KEY
} from '../src/lib/notebooks.js';

describe('notebooks', () => {
  beforeEach(() => {
    Object.keys(mockStore).forEach(k => delete mockStore[k]);
  });

  describe('loadNotebooks', () => {
    it('returns default structure when no data exists', async () => {
      const data = await loadNotebooks();
      expect(data.notebooks).toHaveLength(1);
      expect(data.notebooks[0].name).toBe('Notes');
      expect(data.notebooks[0].content).toBe('');
      expect(data.notebooks[0].id).toMatch(/^nb_/);
      expect(data.activeNotebookId).toBe(data.notebooks[0].id);
    });

    it('returns saved data when it exists', async () => {
      const saved = {
        notebooks: [
          { id: 'nb_1', name: 'Test', content: 'hello', updatedAt: 123 }
        ],
        activeNotebookId: 'nb_1'
      };
      mockStore[NOTEBOOKS_KEY] = saved;
      const data = await loadNotebooks();
      expect(data).toEqual(saved);
    });
  });

  describe('migrateFromSingleNote', () => {
    it('migrates existing single note to notebooks format', async () => {
      mockStore['cleannote_content'] = 'My old note content';
      const data = await migrateFromSingleNote();
      expect(data.notebooks).toHaveLength(1);
      expect(data.notebooks[0].name).toBe('Notes');
      expect(data.notebooks[0].content).toBe('My old note content');
      expect(data.activeNotebookId).toBe(data.notebooks[0].id);
    });

    it('does nothing if notebooks data already exists', async () => {
      const existing = {
        notebooks: [{ id: 'nb_1', name: 'Existing', content: 'keep', updatedAt: 1 }],
        activeNotebookId: 'nb_1'
      };
      mockStore[NOTEBOOKS_KEY] = existing;
      mockStore['cleannote_content'] = 'Old content';
      const data = await migrateFromSingleNote();
      expect(data.notebooks[0].name).toBe('Existing');
      expect(data.notebooks[0].content).toBe('keep');
    });

    it('creates default notebook if no single note exists either', async () => {
      const data = await migrateFromSingleNote();
      expect(data.notebooks).toHaveLength(1);
      expect(data.notebooks[0].content).toBe('');
    });
  });

  describe('createNotebook', () => {
    it('adds a new notebook', async () => {
      await loadNotebooks(); // initialize defaults
      const data = await createNotebook('Ideas');
      expect(data.notebooks).toHaveLength(2);
      expect(data.notebooks[1].name).toBe('Ideas');
      expect(data.notebooks[1].content).toBe('');
      expect(data.notebooks[1].id).toMatch(/^nb_/);
      expect(data.notebooks[1].updatedAt).toBeTypeOf('number');
    });

    it('sets new notebook as active', async () => {
      await loadNotebooks();
      const data = await createNotebook('Work');
      expect(data.activeNotebookId).toBe(data.notebooks[1].id);
    });
  });

  describe('renameNotebook', () => {
    it('renames an existing notebook', async () => {
      const initial = await loadNotebooks();
      const id = initial.notebooks[0].id;
      const data = await renameNotebook(id, 'My Journal');
      expect(data.notebooks[0].name).toBe('My Journal');
    });

    it('throws if notebook not found', async () => {
      await loadNotebooks();
      await expect(renameNotebook('nb_nonexistent', 'Nope')).rejects.toThrow('Notebook not found');
    });
  });

  describe('deleteNotebook', () => {
    it('deletes a notebook when more than one exists', async () => {
      await loadNotebooks();
      const data1 = await createNotebook('Temp');
      const tempId = data1.notebooks[1].id;
      const data2 = await deleteNotebook(tempId);
      expect(data2.notebooks).toHaveLength(1);
      expect(data2.notebooks.find(nb => nb.id === tempId)).toBeUndefined();
    });

    it('throws if trying to delete the last notebook', async () => {
      const initial = await loadNotebooks();
      const id = initial.notebooks[0].id;
      await expect(deleteNotebook(id)).rejects.toThrow('Cannot delete the last notebook');
    });

    it('switches active to first notebook if active is deleted', async () => {
      await loadNotebooks();
      const data1 = await createNotebook('Second');
      // active is now 'Second'
      const secondId = data1.notebooks[1].id;
      const firstId = data1.notebooks[0].id;
      expect(data1.activeNotebookId).toBe(secondId);
      const data2 = await deleteNotebook(secondId);
      expect(data2.activeNotebookId).toBe(firstId);
    });

    it('throws if notebook not found', async () => {
      await loadNotebooks();
      await expect(deleteNotebook('nb_ghost')).rejects.toThrow('Notebook not found');
    });
  });

  describe('getActiveNotebook', () => {
    it('returns the active notebook', async () => {
      await loadNotebooks();
      const nb = await getActiveNotebook();
      expect(nb.name).toBe('Notes');
    });

    it('returns first notebook if activeId is invalid', async () => {
      const data = await loadNotebooks();
      // corrupt active id
      data.activeNotebookId = 'nb_invalid';
      await saveNotebooks(data);
      const nb = await getActiveNotebook();
      expect(nb.name).toBe('Notes');
    });
  });

  describe('setActiveNotebook', () => {
    it('sets the active notebook id', async () => {
      await loadNotebooks();
      const data1 = await createNotebook('Other');
      const otherId = data1.notebooks[1].id;
      const data2 = await setActiveNotebook(data1.notebooks[0].id);
      expect(data2.activeNotebookId).toBe(data1.notebooks[0].id);
    });

    it('throws if notebook not found', async () => {
      await loadNotebooks();
      await expect(setActiveNotebook('nb_nope')).rejects.toThrow('Notebook not found');
    });
  });

  describe('updateNotebookContent', () => {
    it('updates content of a specific notebook', async () => {
      const initial = await loadNotebooks();
      const id = initial.notebooks[0].id;
      const data = await updateNotebookContent(id, 'Updated content');
      expect(data.notebooks[0].content).toBe('Updated content');
      expect(data.notebooks[0].updatedAt).toBeTypeOf('number');
    });

    it('throws if notebook not found', async () => {
      await loadNotebooks();
      await expect(updateNotebookContent('nb_missing', 'text')).rejects.toThrow('Notebook not found');
    });
  });

  describe('searchNotebooks', () => {
    it('finds matches in notebook names', async () => {
      await loadNotebooks();
      await createNotebook('Shopping List');
      const results = await searchNotebooks('shopping');
      expect(results).toHaveLength(1);
      expect(results[0].notebook.name).toBe('Shopping List');
    });

    it('finds matches in notebook content', async () => {
      const initial = await loadNotebooks();
      await updateNotebookContent(initial.notebooks[0].id, 'Buy groceries tomorrow');
      const results = await searchNotebooks('groceries');
      expect(results).toHaveLength(1);
      expect(results[0].snippet).toContain('groceries');
    });

    it('returns empty array for no matches', async () => {
      await loadNotebooks();
      const results = await searchNotebooks('nonexistent');
      expect(results).toEqual([]);
    });

    it('searches case-insensitively', async () => {
      const initial = await loadNotebooks();
      await updateNotebookContent(initial.notebooks[0].id, 'HELLO world');
      const results = await searchNotebooks('hello');
      expect(results).toHaveLength(1);
    });

    it('returns snippets around the match', async () => {
      const initial = await loadNotebooks();
      const longText = 'The quick brown fox jumps over the lazy dog near the river';
      await updateNotebookContent(initial.notebooks[0].id, longText);
      const results = await searchNotebooks('lazy');
      expect(results[0].snippet).toContain('lazy');
    });
  });
});
