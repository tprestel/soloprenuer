const TRANSCRIPTS_KEY = 'tsb_transcripts';
const FOLDERS_KEY = 'tsb_folders';
const KEYWORDS_KEY = 'tsb_keywords';
const SETTINGS_KEY = 'tsb_settings';

const DEFAULT_SETTINGS = {
  autoScrape: false,
  sidebarWidth: 400,
  autoScroll: true,
  defaultExportFormat: 'markdown',
};

async function getRaw(key) {
  const result = await chrome.storage.local.get(key);
  return result[key];
}

export async function saveTranscript(transcript) {
  const map = (await getRaw(TRANSCRIPTS_KEY)) || {};
  map[transcript.id] = transcript;
  await chrome.storage.local.set({ [TRANSCRIPTS_KEY]: map });
}

export async function getTranscript(id) {
  const map = (await getRaw(TRANSCRIPTS_KEY)) || {};
  return map[id] || null;
}

export async function getAllTranscripts() {
  const map = (await getRaw(TRANSCRIPTS_KEY)) || {};
  return Object.values(map);
}

export async function deleteTranscript(id) {
  const map = (await getRaw(TRANSCRIPTS_KEY)) || {};
  delete map[id];
  await chrome.storage.local.set({ [TRANSCRIPTS_KEY]: map });
}

export async function saveFolder(folder) {
  const folders = (await getRaw(FOLDERS_KEY)) || [];
  const idx = folders.findIndex(f => f.id === folder.id);
  if (idx >= 0) {
    folders[idx] = folder;
  } else {
    folders.push(folder);
  }
  await chrome.storage.local.set({ [FOLDERS_KEY]: folders });
}

export async function getFolders() {
  return (await getRaw(FOLDERS_KEY)) || [];
}

export async function deleteFolder(id) {
  const folders = (await getRaw(FOLDERS_KEY)) || [];
  await chrome.storage.local.set({
    [FOLDERS_KEY]: folders.filter(f => f.id !== id),
  });
}

export async function saveKeywords(keywords) {
  await chrome.storage.local.set({ [KEYWORDS_KEY]: keywords });
}

export async function getKeywords() {
  return (await getRaw(KEYWORDS_KEY)) || [];
}

export async function getSettings() {
  const saved = (await getRaw(SETTINGS_KEY)) || {};
  return { ...DEFAULT_SETTINGS, ...saved };
}

export async function saveSettings(partial) {
  const current = await getSettings();
  await chrome.storage.local.set({
    [SETTINGS_KEY]: { ...current, ...partial },
  });
}
