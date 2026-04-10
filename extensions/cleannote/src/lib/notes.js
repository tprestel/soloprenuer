import { storageGet, storageSet } from './storage.js';

export const NOTE_KEY = 'cleannote_content';
const TIMESTAMP_KEY = 'cleannote_lastSaved';

export async function loadNote() {
  const content = await storageGet(NOTE_KEY);
  return content || '';
}

export async function saveNote(content) {
  await storageSet(NOTE_KEY, content);
  await storageSet(TIMESTAMP_KEY, Date.now());
}

export async function getLastSaved() {
  return storageGet(TIMESTAMP_KEY);
}
