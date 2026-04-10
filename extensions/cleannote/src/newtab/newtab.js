import { loadSettings, saveSettings } from '../lib/settings.js';
import { isPremium, setPremium } from '../lib/premium.js';
import {
  migrateFromSingleNote,
  loadNotebooks,
  saveNotebooks,
  createNotebook,
  renameNotebook,
  deleteNotebook,
  getActiveNotebook,
  setActiveNotebook,
  updateNotebookContent,
  searchNotebooks
} from '../lib/notebooks.js';
import { parseMarkdown } from '../lib/markdown.js';

// DOM elements
const editor = document.getElementById('editor');
const markdownPreview = document.getElementById('markdown-preview');
const saveStatus = document.getElementById('save-status');
const btnSettings = document.getElementById('btn-settings');
const settingsPanel = document.getElementById('settings-panel');
const btnCloseSettings = document.getElementById('btn-close-settings');
const settingFont = document.getElementById('setting-font');
const settingSize = document.getElementById('setting-size');
const settingSizeValue = document.getElementById('setting-size-value');
const settingTheme = document.getElementById('setting-theme');
const settingPremium = document.getElementById('setting-premium');
const wordCount = document.getElementById('word-count');
const btnImport = document.getElementById('btn-import');
const importFile = document.getElementById('import-file');
const btnExport = document.getElementById('btn-export');
const exportMenu = document.getElementById('export-menu');
const exportTxt = document.getElementById('export-txt');
const exportMd = document.getElementById('export-md');

// Sidebar elements
const sidebar = document.getElementById('sidebar');
const btnOpenSidebar = document.getElementById('btn-open-sidebar');
const btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
const notebookList = document.getElementById('notebook-list');
const btnNewNotebook = document.getElementById('btn-new-notebook');

// Search elements
const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');
const searchProBadge = document.getElementById('search-pro-badge');

// Markdown toggle
const btnMdToggle = document.getElementById('btn-md-toggle');
const mdProBadge = document.getElementById('md-pro-badge');
const mdToggleLabel = btnMdToggle.querySelector('.md-toggle-label');

// Custom theme elements
const customThemeOptions = document.getElementById('custom-theme-options');
const customBg = document.getElementById('custom-bg');
const customText = document.getElementById('custom-text');
const customAccent = document.getElementById('custom-accent');
const themeProBadge = document.getElementById('theme-pro-badge');
const newNbProBadge = document.getElementById('new-nb-pro-badge');

let saveTimeout = null;
let overlay = null;
let currentNotebookId = null;
let premium = false;
let previewMode = false;

// --- Premium Gating ---
function updateProBadges() {
  const show = !premium;
  searchProBadge.classList.toggle('hidden', !show);
  mdProBadge.classList.toggle('hidden', !show);
  themeProBadge.classList.toggle('hidden', !show);
  newNbProBadge.classList.toggle('hidden', !show);
}

function requirePremium(featureName) {
  if (premium) return true;
  saveStatus.textContent = `${featureName} requires PRO`;
  setTimeout(() => { saveStatus.textContent = 'Ready'; }, 2000);
  return false;
}

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

document.addEventListener('click', () => {
  exportMenu.classList.add('hidden');
});

exportTxt.addEventListener('click', () => {
  const text = editor.innerText;
  downloadFile(text, `cleannote-${dateStamp()}.txt`, 'text/plain');
  exportMenu.classList.add('hidden');
});

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
    if (currentNotebookId) {
      await updateNotebookContent(currentNotebookId, content);
    }
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
    if (currentNotebookId) {
      await updateNotebookContent(currentNotebookId, editor.innerText);
    }
    const now = new Date();
    saveStatus.textContent = `Saved at ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }, 500);
}

editor.addEventListener('input', scheduleSave);

window.addEventListener('blur', async () => {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
    if (currentNotebookId) {
      await updateNotebookContent(currentNotebookId, editor.innerText);
    }
    saveStatus.textContent = 'Saved';
  }
});

document.addEventListener('keydown', async (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    if (saveTimeout) clearTimeout(saveTimeout);
    if (currentNotebookId) {
      await updateNotebookContent(currentNotebookId, editor.innerText);
    }
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

  // Also apply to markdown preview
  markdownPreview.style.fontFamily = settings.fontFamily;
  markdownPreview.style.fontSize = settings.fontSize + 'px';
  markdownPreview.style.lineHeight = settings.lineHeight;
  markdownPreview.style.maxWidth = settings.maxWidth + 'px';

  // Theme
  document.body.className = '';
  if (settings.theme === 'custom' && settings.customTheme) {
    document.body.classList.add('theme-custom');
    document.body.style.setProperty('--bg', settings.customTheme.bg);
    document.body.style.setProperty('--text', settings.customTheme.text);
    document.body.style.setProperty('--accent', settings.customTheme.accent);
    // Derive other variables from custom colors
    document.body.style.setProperty('--text-muted', settings.customTheme.text + '99');
    document.body.style.setProperty('--border', settings.customTheme.text + '22');
    document.body.style.setProperty('--status-bg', settings.customTheme.bg);
    document.body.style.setProperty('--panel-bg', settings.customTheme.bg);
    document.body.style.setProperty('--sidebar-bg', settings.customTheme.bg);
    document.body.style.setProperty('--sidebar-hover', settings.customTheme.text + '0d');
    document.body.style.setProperty('--sidebar-active', settings.customTheme.text + '1a');
    customBg.value = settings.customTheme.bg;
    customText.value = settings.customTheme.text;
    customAccent.value = settings.customTheme.accent;
  } else {
    // Remove custom properties
    const customProps = ['--bg','--text','--accent','--text-muted','--border','--status-bg','--panel-bg','--sidebar-bg','--sidebar-hover','--sidebar-active'];
    customProps.forEach(p => document.body.style.removeProperty(p));
    if (settings.theme !== 'light') {
      document.body.classList.add(`theme-${settings.theme}`);
    }
  }

  // Sync form controls
  settingFont.value = settings.fontFamily;
  settingSize.value = settings.fontSize;
  settingSizeValue.textContent = settings.fontSize + 'px';
  settingTheme.value = settings.theme;

  // Show/hide custom theme options
  const showCustom = settings.theme === 'custom';
  customThemeOptions.classList.toggle('hidden', !showCustom);
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
  const val = settingTheme.value;
  if (val === 'custom' && !requirePremium('Custom themes')) {
    const settings = await loadSettings();
    settingTheme.value = settings.theme;
    return;
  }
  const partial = { theme: val };
  if (val === 'custom') {
    partial.customTheme = {
      bg: customBg.value,
      text: customText.value,
      accent: customAccent.value
    };
  }
  const updated = await saveSettings(partial);
  applySettings(updated);
});

// Custom color pickers
async function onCustomColorChange() {
  const updated = await saveSettings({
    customTheme: {
      bg: customBg.value,
      text: customText.value,
      accent: customAccent.value
    }
  });
  applySettings(updated);
}

customBg.addEventListener('input', onCustomColorChange);
customText.addEventListener('input', onCustomColorChange);
customAccent.addEventListener('input', onCustomColorChange);

// Premium toggle
settingPremium.addEventListener('change', async () => {
  premium = settingPremium.checked;
  await setPremium(premium);
  updateProBadges();
  renderNotebookList();
});

// --- Tab handling ---
editor.addEventListener('keydown', (e) => {
  if (e.key === 'Tab') {
    e.preventDefault();
    document.execCommand('insertText', false, '  ');
  }
});

// --- Sidebar ---
function toggleSidebar() {
  sidebar.classList.toggle('collapsed');
}

btnOpenSidebar.addEventListener('click', toggleSidebar);
btnToggleSidebar.addEventListener('click', toggleSidebar);

// --- Notebook List ---
async function renderNotebookList() {
  const data = await loadNotebooks();
  notebookList.innerHTML = '';

  data.notebooks.forEach(nb => {
    const item = document.createElement('div');
    item.className = 'notebook-item' + (nb.id === data.activeNotebookId ? ' active' : '');
    item.dataset.id = nb.id;

    const nameSpan = document.createElement('span');
    nameSpan.className = 'notebook-item-name';
    nameSpan.textContent = nb.name;

    const actions = document.createElement('div');
    actions.className = 'notebook-item-actions';

    // Rename button
    const renameBtn = document.createElement('button');
    renameBtn.className = 'notebook-action-btn';
    renameBtn.title = 'Rename';
    renameBtn.innerHTML = '&#9998;'; // pencil
    renameBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      startRename(nb.id, nameSpan);
    });

    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'notebook-action-btn';
    deleteBtn.title = 'Delete';
    deleteBtn.innerHTML = '&times;';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      confirmDelete(nb.id, nb.name);
    });

    actions.appendChild(renameBtn);
    actions.appendChild(deleteBtn);
    item.appendChild(nameSpan);
    item.appendChild(actions);

    item.addEventListener('click', () => switchNotebook(nb.id));
    notebookList.appendChild(item);
  });
}

function startRename(id, nameSpan) {
  nameSpan.contentEditable = 'true';
  nameSpan.focus();

  // Select all text
  const range = document.createRange();
  range.selectNodeContents(nameSpan);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);

  const finish = async () => {
    nameSpan.contentEditable = 'false';
    const newName = nameSpan.textContent.trim();
    if (newName) {
      await renameNotebook(id, newName);
    }
    await renderNotebookList();
  };

  nameSpan.addEventListener('blur', finish, { once: true });
  nameSpan.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      nameSpan.blur();
    }
    if (e.key === 'Escape') {
      nameSpan.contentEditable = 'false';
      renderNotebookList();
    }
  });
}

function confirmDelete(id, name) {
  const overlay = document.createElement('div');
  overlay.className = 'confirm-overlay';

  const dialog = document.createElement('div');
  dialog.className = 'confirm-dialog';
  dialog.innerHTML = `
    <p>Delete "<strong>${name}</strong>"?<br>This cannot be undone.</p>
    <div class="confirm-actions">
      <button class="btn-confirm-cancel">Cancel</button>
      <button class="btn-confirm-delete">Delete</button>
    </div>
  `;

  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  dialog.querySelector('.btn-confirm-cancel').addEventListener('click', () => {
    overlay.remove();
  });

  dialog.querySelector('.btn-confirm-delete').addEventListener('click', async () => {
    overlay.remove();
    try {
      const data = await deleteNotebook(id);
      currentNotebookId = data.activeNotebookId;
      const nb = data.notebooks.find(n => n.id === currentNotebookId);
      editor.innerText = nb ? nb.content : '';
      updateWordCount();
      await renderNotebookList();
    } catch (err) {
      saveStatus.textContent = err.message;
    }
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
}

async function switchNotebook(id) {
  // Save current notebook first
  if (currentNotebookId) {
    await updateNotebookContent(currentNotebookId, editor.innerText);
  }

  await setActiveNotebook(id);
  currentNotebookId = id;

  const nb = await getActiveNotebook();
  editor.innerText = nb.content;
  updateWordCount();

  // Update preview if in preview mode
  if (previewMode) {
    markdownPreview.innerHTML = parseMarkdown(nb.content);
  }

  await renderNotebookList();
  saveStatus.textContent = 'Ready';
}

// New notebook
btnNewNotebook.addEventListener('click', async () => {
  // Check if user already has more than 1 notebook and is not premium
  const data = await loadNotebooks();
  if (data.notebooks.length >= 1 && !requirePremium('Multiple notebooks')) {
    // Free users only get 1 notebook
    if (data.notebooks.length >= 1 && !premium) return;
  }

  // Save current notebook content first
  if (currentNotebookId) {
    await updateNotebookContent(currentNotebookId, editor.innerText);
  }

  const result = await createNotebook('Untitled');
  currentNotebookId = result.activeNotebookId;
  editor.innerText = '';
  updateWordCount();
  await renderNotebookList();

  // Start rename on the new notebook
  const lastItem = notebookList.lastElementChild;
  if (lastItem) {
    const nameSpan = lastItem.querySelector('.notebook-item-name');
    startRename(currentNotebookId, nameSpan);
  }
});

// --- Markdown Preview Toggle ---
btnMdToggle.addEventListener('click', () => {
  if (!requirePremium('Markdown preview')) return;

  previewMode = !previewMode;
  btnMdToggle.classList.toggle('active', previewMode);
  mdToggleLabel.textContent = previewMode ? 'Edit' : 'Preview';

  if (previewMode) {
    const content = editor.innerText;
    markdownPreview.innerHTML = parseMarkdown(content);
    editor.classList.add('hidden');
    markdownPreview.classList.remove('hidden');
  } else {
    editor.classList.remove('hidden');
    markdownPreview.classList.add('hidden');
    editor.focus();
  }
});

// --- Search ---
let searchDebounce = null;

searchInput.addEventListener('input', () => {
  if (!premium) {
    searchResults.classList.add('hidden');
    requirePremium('Search');
    return;
  }

  if (searchDebounce) clearTimeout(searchDebounce);

  const query = searchInput.value.trim();
  if (!query) {
    searchResults.classList.add('hidden');
    return;
  }

  searchDebounce = setTimeout(async () => {
    const results = await searchNotebooks(query);
    renderSearchResults(results);
  }, 200);
});

searchInput.addEventListener('focus', () => {
  if (!premium) {
    requirePremium('Search');
  }
});

function renderSearchResults(results) {
  searchResults.innerHTML = '';

  if (results.length === 0) {
    searchResults.innerHTML = '<div class="search-result-item"><span class="search-result-snippet">No results found</span></div>';
    searchResults.classList.remove('hidden');
    return;
  }

  results.forEach(r => {
    const item = document.createElement('div');
    item.className = 'search-result-item';

    const name = document.createElement('div');
    name.className = 'search-result-name';
    name.textContent = r.notebook.name;

    const snippet = document.createElement('div');
    snippet.className = 'search-result-snippet';
    snippet.textContent = r.snippet || (r.matchType === 'name' ? 'Name match' : '');

    item.appendChild(name);
    item.appendChild(snippet);

    item.addEventListener('click', async () => {
      searchResults.classList.add('hidden');
      searchInput.value = '';
      await switchNotebook(r.notebook.id);
    });

    searchResults.appendChild(item);
  });

  searchResults.classList.remove('hidden');
}

// Close search results on outside click
document.addEventListener('click', (e) => {
  if (!e.target.closest('.sidebar-search')) {
    searchResults.classList.add('hidden');
  }
});

// --- Initialize ---
async function init() {
  // Load premium status
  premium = await isPremium();
  settingPremium.checked = premium;
  updateProBadges();

  // Load settings
  const settings = await loadSettings();
  applySettings(settings);

  // Migrate single-note to notebooks format
  await migrateFromSingleNote();

  // Load notebooks and set active
  const nb = await getActiveNotebook();
  currentNotebookId = nb.id;
  editor.innerText = nb.content;

  // Render notebook list
  await renderNotebookList();

  editor.focus();
  updateWordCount();
  saveStatus.textContent = 'Ready';
}

init();
