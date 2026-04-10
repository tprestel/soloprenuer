import { loadNote, saveNote } from '../lib/notes.js';
import { loadSettings, saveSettings } from '../lib/settings.js';

// DOM elements
const editor = document.getElementById('editor');
const saveStatus = document.getElementById('save-status');
const btnSettings = document.getElementById('btn-settings');
const settingsPanel = document.getElementById('settings-panel');
const btnCloseSettings = document.getElementById('btn-close-settings');
const settingFont = document.getElementById('setting-font');
const settingSize = document.getElementById('setting-size');
const settingSizeValue = document.getElementById('setting-size-value');
const settingTheme = document.getElementById('setting-theme');
const wordCount = document.getElementById('word-count');
const btnImport = document.getElementById('btn-import');
const importFile = document.getElementById('import-file');
const btnExport = document.getElementById('btn-export');
const exportMenu = document.getElementById('export-menu');
const exportTxt = document.getElementById('export-txt');
const exportMd = document.getElementById('export-md');

let saveTimeout = null;
let overlay = null;

// --- Word Count ---
function updateWordCount() {
  const text = editor.innerText.trim();
  const count = text ? text.split(/\s+/).length : 0;
  wordCount.textContent = `${count} word${count !== 1 ? 's' : ''}`;
}

// --- Export dropdown toggle ---
btnExport.addEventListener('click', (e) => {
  e.stopPropagation();
  exportMenu.classList.toggle('hidden');
});

// Close dropdown when clicking elsewhere
document.addEventListener('click', () => {
  exportMenu.classList.add('hidden');
});

// Export as .txt
exportTxt.addEventListener('click', () => {
  const text = editor.innerText;
  downloadFile(text, `cleannote-${dateStamp()}.txt`, 'text/plain');
  exportMenu.classList.add('hidden');
});

// Export as .md
exportMd.addEventListener('click', () => {
  const text = editor.innerText;
  downloadFile(text, `cleannote-${dateStamp()}.md`, 'text/markdown');
  exportMenu.classList.add('hidden');
});

// --- Import ---
btnImport.addEventListener('click', () => {
  importFile.click();
});

importFile.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (event) => {
    const content = event.target.result;
    editor.innerText = content;
    await saveNote(content);
    updateWordCount();
    saveStatus.textContent = `Imported ${file.name}`;
  };
  reader.readAsText(file);
  importFile.value = '';
});

// --- Helpers ---
function dateStamp() {
  return new Date().toISOString().split('T')[0];
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// --- Autosave ---
function scheduleSave() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveStatus.textContent = 'Typing...';
  updateWordCount();

  saveTimeout = setTimeout(async () => {
    await saveNote(editor.innerText);
    const now = new Date();
    saveStatus.textContent = `Saved at ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }, 500);
}

editor.addEventListener('input', scheduleSave);

// Save on blur (switching tabs)
window.addEventListener('blur', async () => {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
    await saveNote(editor.innerText);
    saveStatus.textContent = 'Saved';
  }
});

// Keyboard shortcut: Ctrl/Cmd+S to force save
document.addEventListener('keydown', async (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    if (saveTimeout) clearTimeout(saveTimeout);
    await saveNote(editor.innerText);
    saveStatus.textContent = 'Saved';
  }
});

// --- Settings Panel ---
function openSettings() {
  overlay = document.createElement('div');
  overlay.className = 'settings-overlay';
  overlay.addEventListener('click', closeSettings);
  document.body.appendChild(overlay);
  settingsPanel.classList.remove('hidden');
}

function closeSettings() {
  settingsPanel.classList.add('hidden');
  if (overlay) {
    overlay.remove();
    overlay = null;
  }
  editor.focus();
}

btnSettings.addEventListener('click', openSettings);
btnCloseSettings.addEventListener('click', closeSettings);

// Escape to close settings
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !settingsPanel.classList.contains('hidden')) {
    closeSettings();
  }
});

// --- Apply Settings ---
function applySettings(settings) {
  editor.style.fontFamily = settings.fontFamily;
  editor.style.fontSize = settings.fontSize + 'px';
  editor.style.lineHeight = settings.lineHeight;
  editor.style.maxWidth = settings.maxWidth + 'px';

  // Theme
  document.body.className = '';
  if (settings.theme !== 'light') {
    document.body.classList.add(`theme-${settings.theme}`);
  }

  // Sync form controls
  settingFont.value = settings.fontFamily;
  settingSize.value = settings.fontSize;
  settingSizeValue.textContent = settings.fontSize + 'px';
  settingTheme.value = settings.theme;
}

// Setting change handlers
settingFont.addEventListener('change', async () => {
  const updated = await saveSettings({ fontFamily: settingFont.value });
  applySettings(updated);
});

settingSize.addEventListener('input', async () => {
  settingSizeValue.textContent = settingSize.value + 'px';
  const updated = await saveSettings({ fontSize: parseInt(settingSize.value) });
  applySettings(updated);
});

settingTheme.addEventListener('change', async () => {
  const updated = await saveSettings({ theme: settingTheme.value });
  applySettings(updated);
});

// --- Tab handling ---
// Override Tab key to insert spaces instead of changing focus
editor.addEventListener('keydown', (e) => {
  if (e.key === 'Tab') {
    e.preventDefault();
    document.execCommand('insertText', false, '  ');
  }
});

// --- Initialize ---
async function init() {
  const settings = await loadSettings();
  applySettings(settings);

  const content = await loadNote();
  if (content) {
    editor.innerText = content;
  }

  editor.focus();
  updateWordCount();
  saveStatus.textContent = 'Ready';
}

init();
