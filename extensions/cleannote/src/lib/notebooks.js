import { storageGet, storageSet } from './storage.js';

export const NOTEBOOKS_KEY = 'cleannote_notebooks';
const OLD_NOTE_KEY = 'cleannote_content';

function generateId() {
  return 'nb_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function createDefaultNotebook(content = '') {
  const id = generateId();
  return {
    notebooks: [
      { id, name: 'Notes', content, updatedAt: Date.now() }
    ],
    activeNotebookId: id
  };
}

export async function loadNotebooks() {
  const saved = await storageGet(NOTEBOOKS_KEY);
  if (saved && saved.notebooks && saved.notebooks.length > 0) {
    return saved;
  }
  const data = createDefaultNotebook();
  await storageSet(NOTEBOOKS_KEY, data);
  return data;
}

export async function saveNotebooks(data) {
  await storageSet(NOTEBOOKS_KEY, data);
  return data;
}

export async function migrateFromSingleNote() {
  const existing = await storageGet(NOTEBOOKS_KEY);
  if (existing && existing.notebooks && existing.notebooks.length > 0) {
    return existing;
  }
  const oldContent = await storageGet(OLD_NOTE_KEY);
  const data = createDefaultNotebook(oldContent || '');
  await storageSet(NOTEBOOKS_KEY, data);
  return data;
}

export async function createNotebook(name) {
  const data = await loadNotebooks();
  const nb = {
    id: generateId(),
    name,
    content: '',
    updatedAt: Date.now()
  };
  data.notebooks.push(nb);
  data.activeNotebookId = nb.id;
  await saveNotebooks(data);
  return data;
}

export async function renameNotebook(id, newName) {
  const data = await loadNotebooks();
  const nb = data.notebooks.find(n => n.id === id);
  if (!nb) throw new Error('Notebook not found');
  nb.name = newName;
  nb.updatedAt = Date.now();
  await saveNotebooks(data);
  return data;
}

export async function deleteNotebook(id) {
  const data = await loadNotebooks();
  const idx = data.notebooks.findIndex(n => n.id === id);
  if (idx === -1) throw new Error('Notebook not found');
  if (data.notebooks.length <= 1) throw new Error('Cannot delete the last notebook');
  data.notebooks.splice(idx, 1);
  if (data.activeNotebookId === id) {
    data.activeNotebookId = data.notebooks[0].id;
  }
  await saveNotebooks(data);
  return data;
}

export async function getActiveNotebook() {
  const data = await loadNotebooks();
  const nb = data.notebooks.find(n => n.id === data.activeNotebookId);
  return nb || data.notebooks[0];
}

export async function setActiveNotebook(id) {
  const data = await loadNotebooks();
  const nb = data.notebooks.find(n => n.id === id);
  if (!nb) throw new Error('Notebook not found');
  data.activeNotebookId = id;
  await saveNotebooks(data);
  return data;
}

export async function updateNotebookContent(id, content) {
  const data = await loadNotebooks();
  const nb = data.notebooks.find(n => n.id === id);
  if (!nb) throw new Error('Notebook not found');
  nb.content = content;
  nb.updatedAt = Date.now();
  await saveNotebooks(data);
  return data;
}

export async function searchNotebooks(query) {
  const data = await loadNotebooks();
  const q = query.toLowerCase();
  const results = [];

  for (const nb of data.notebooks) {
    const nameMatch = nb.name.toLowerCase().includes(q);
    const contentLower = nb.content.toLowerCase();
    const contentIdx = contentLower.indexOf(q);
    const contentMatch = contentIdx !== -1;

    if (nameMatch || contentMatch) {
      let snippet = '';
      if (contentMatch) {
        const start = Math.max(0, contentIdx - 30);
        const end = Math.min(nb.content.length, contentIdx + query.length + 30);
        snippet = (start > 0 ? '...' : '') +
          nb.content.slice(start, end) +
          (end < nb.content.length ? '...' : '');
      }
      results.push({
        notebook: nb,
        matchType: nameMatch ? 'name' : 'content',
        snippet
      });
    }
  }

  return results;
}
