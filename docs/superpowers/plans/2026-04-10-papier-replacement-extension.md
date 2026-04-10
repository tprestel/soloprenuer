# Papier Replacement (New Tab Notepad) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a clean, minimal new-tab notepad Chrome extension that replaces the dead Papier extension. Free tier for basic note-taking, premium for markdown, cloud sync, and multiple notebooks.

**Architecture:** Manifest V3 extension that overrides the new tab page with a distraction-free text editor. Notes persist in chrome.storage.local. Premium features gated via ExtensionPay. No backend needed for MVP — everything runs client-side.

**Tech Stack:** Manifest V3, vanilla JS, CSS, ExtensionPay (Stripe), Vitest for unit tests.

---

## File Structure

```
extensions/cleannote/
  manifest.json                 — MV3 manifest, new tab override
  src/
    newtab/
      newtab.html               — The new tab page (replaces Chrome default)
      newtab.js                 — Editor logic: load/save/autosave, formatting
      newtab.css                — Editor styles: minimal, distraction-free
    lib/
      storage.js                — Chrome storage wrapper (get/set/clear)
      notes.js                  — Note CRUD operations, autosave logic
      settings.js               — User preferences (font, theme, etc.)
  icons/
    icon16.png
    icon32.png
    icon48.png
    icon128.png
  tests/
    notes.test.js               — Note save/load/autosave tests
    settings.test.js            — Settings persistence tests
  package.json                  — Dev dependencies (vitest)
```

---

## Task 1: Project Scaffold + Manifest

**Files:**
- Create: `extensions/cleannote/manifest.json`
- Create: `extensions/cleannote/package.json`

- [ ] **Step 1: Create the project directory structure**

```bash
mkdir -p extensions/cleannote/src/{newtab,lib}
mkdir -p extensions/cleannote/{icons,tests}
```

- [ ] **Step 2: Create package.json**

Create `extensions/cleannote/package.json`:
```json
{
  "name": "cleannote-extension",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "vitest": "^3.1.0"
  }
}
```

- [ ] **Step 3: Install dependencies**

Run: `cd extensions/cleannote && npm install`
Expected: `node_modules/` created, vitest installed.

- [ ] **Step 4: Create manifest.json**

Create `extensions/cleannote/manifest.json`:
```json
{
  "manifest_version": 3,
  "name": "CleanNote — New Tab Notepad",
  "version": "0.1.0",
  "description": "Replace your new tab with a beautiful, distraction-free notepad. Your notes save automatically and never leave your browser.",
  "permissions": [
    "storage"
  ],
  "chrome_url_overrides": {
    "newtab": "src/newtab/newtab.html"
  },
  "action": {
    "default_icon": {
      "16": "icons/icon16.png",
      "32": "icons/icon32.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "icons": {
    "16": "icons/icon16.png",
    "32": "icons/icon32.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

- [ ] **Step 5: Create placeholder icon files**

Generate simple colored square PNGs at 16x16, 32x32, 48x48, and 128x128. A warm amber/gold (#F5A623) on white works well for a notepad. These are dev placeholders — final icons come before publishing.

- [ ] **Step 6: Commit**

```bash
git add extensions/cleannote/manifest.json extensions/cleannote/package.json extensions/cleannote/icons/
git commit -m "feat: scaffold CleanNote extension with MV3 manifest"
```

---

## Task 2: Chrome Storage Wrapper

**Files:**
- Create: `extensions/cleannote/src/lib/storage.js`

This is a thin wrapper around chrome.storage.local — identical pattern to the ReFormat extension. No separate test file; it's tested implicitly through notes.test.js and settings.test.js.

- [ ] **Step 1: Write the storage wrapper**

Create `extensions/cleannote/src/lib/storage.js`:
```js
export async function storageGet(key) {
  const result = await chrome.storage.local.get(key);
  return result[key];
}

export async function storageSet(key, value) {
  await chrome.storage.local.set({ [key]: value });
}

export async function storageRemove(key) {
  await chrome.storage.local.remove(key);
}

export async function storageGetAll() {
  return chrome.storage.local.get(null);
}
```

- [ ] **Step 2: Commit**

```bash
git add extensions/cleannote/src/lib/storage.js
git commit -m "feat: add chrome.storage.local wrapper"
```

---

## Task 3: Notes Module (CRUD + Autosave)

**Files:**
- Create: `extensions/cleannote/src/lib/notes.js`
- Test: `extensions/cleannote/tests/notes.test.js`

- [ ] **Step 1: Write the failing tests**

Create `extensions/cleannote/tests/notes.test.js`:
```js
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd extensions/cleannote && npx vitest run tests/notes.test.js`
Expected: FAIL — cannot find module `../src/lib/notes.js`

- [ ] **Step 3: Write the implementation**

Create `extensions/cleannote/src/lib/notes.js`:
```js
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd extensions/cleannote && npx vitest run tests/notes.test.js`
Expected: 7 tests PASS

- [ ] **Step 5: Commit**

```bash
git add extensions/cleannote/src/lib/notes.js extensions/cleannote/tests/notes.test.js
git commit -m "feat: add notes module with save, load, and timestamp tracking"
```

---

## Task 4: Settings Module (User Preferences)

**Files:**
- Create: `extensions/cleannote/src/lib/settings.js`
- Test: `extensions/cleannote/tests/settings.test.js`

- [ ] **Step 1: Write the failing tests**

Create `extensions/cleannote/tests/settings.test.js`:
```js
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

import { loadSettings, saveSettings, DEFAULTS } from '../src/lib/settings.js';

describe('settings', () => {
  beforeEach(() => {
    Object.keys(mockStore).forEach(k => delete mockStore[k]);
  });

  it('returns defaults when no settings saved', async () => {
    const settings = await loadSettings();
    expect(settings).toEqual(DEFAULTS);
  });

  it('saves and loads settings', async () => {
    await saveSettings({ fontFamily: 'Georgia' });
    const settings = await loadSettings();
    expect(settings.fontFamily).toBe('Georgia');
  });

  it('merges partial updates with existing settings', async () => {
    await saveSettings({ fontSize: 20 });
    const settings = await loadSettings();
    expect(settings.fontSize).toBe(20);
    expect(settings.fontFamily).toBe(DEFAULTS.fontFamily);
    expect(settings.theme).toBe(DEFAULTS.theme);
  });

  it('has correct default values', () => {
    expect(DEFAULTS.fontFamily).toBe('Georgia');
    expect(DEFAULTS.fontSize).toBe(18);
    expect(DEFAULTS.theme).toBe('light');
    expect(DEFAULTS.lineHeight).toBe(1.7);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd extensions/cleannote && npx vitest run tests/settings.test.js`
Expected: FAIL — cannot find module `../src/lib/settings.js`

- [ ] **Step 3: Write the implementation**

Create `extensions/cleannote/src/lib/settings.js`:
```js
import { storageGet, storageSet } from './storage.js';

const SETTINGS_KEY = 'cleannote_settings';

export const DEFAULTS = {
  fontFamily: 'Georgia',
  fontSize: 18,
  lineHeight: 1.7,
  theme: 'light',
  maxWidth: 700
};

export async function loadSettings() {
  const saved = await storageGet(SETTINGS_KEY);
  return { ...DEFAULTS, ...(saved || {}) };
}

export async function saveSettings(partial) {
  const current = await loadSettings();
  const updated = { ...current, ...partial };
  await storageSet(SETTINGS_KEY, updated);
  return updated;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd extensions/cleannote && npx vitest run tests/settings.test.js`
Expected: 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add extensions/cleannote/src/lib/settings.js extensions/cleannote/tests/settings.test.js
git commit -m "feat: add settings module with defaults and partial updates"
```

---

## Task 5: New Tab Page — HTML + CSS

**Files:**
- Create: `extensions/cleannote/src/newtab/newtab.html`
- Create: `extensions/cleannote/src/newtab/newtab.css`

- [ ] **Step 1: Create the HTML**

Create `extensions/cleannote/src/newtab/newtab.html`:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="newtab.css">
  <title>New Tab</title>
</head>
<body>
  <div class="editor-wrap">
    <div
      id="editor"
      contenteditable="true"
      spellcheck="true"
      data-placeholder="Start typing..."
    ></div>
  </div>

  <footer class="status-bar">
    <span id="save-status">Ready</span>
    <div class="status-right">
      <button id="btn-settings" class="icon-btn" title="Settings" aria-label="Settings">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="8" cy="8" r="2.5"/>
          <path d="M8 1v2M8 13v2M1 8h2M13 8h2M2.93 2.93l1.41 1.41M11.66 11.66l1.41 1.41M2.93 13.07l1.41-1.41M11.66 4.34l1.41-1.41"/>
        </svg>
      </button>
    </div>
  </footer>

  <!-- Settings panel (hidden by default) -->
  <div id="settings-panel" class="settings-panel hidden">
    <h2>Settings</h2>
    <div class="setting-row">
      <label for="setting-font">Font</label>
      <select id="setting-font">
        <option value="Georgia">Georgia</option>
        <option value="'Times New Roman', serif">Times New Roman</option>
        <option value="system-ui, sans-serif">System UI</option>
        <option value="'Courier New', monospace">Courier New</option>
        <option value="'Charter', Georgia, serif">Charter</option>
      </select>
    </div>
    <div class="setting-row">
      <label for="setting-size">Size</label>
      <input id="setting-size" type="range" min="14" max="28" step="1" value="18">
      <span id="setting-size-value">18px</span>
    </div>
    <div class="setting-row">
      <label for="setting-theme">Theme</label>
      <select id="setting-theme">
        <option value="light">Light</option>
        <option value="dark">Dark</option>
        <option value="sepia">Sepia</option>
      </select>
    </div>
    <button id="btn-close-settings" class="btn-close">Done</button>
  </div>

  <script type="module" src="newtab.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create the CSS**

Create `extensions/cleannote/src/newtab/newtab.css`:
```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  height: 100%;
  overflow: hidden;
}

/* Theme variables */
body {
  --bg: #ffffff;
  --text: #1a1a1a;
  --text-muted: #999;
  --border: #e8e8e8;
  --status-bg: #fafafa;
  --panel-bg: #ffffff;
  --panel-shadow: rgba(0, 0, 0, 0.1);
}

body.theme-dark {
  --bg: #1a1a1a;
  --text: #e0e0e0;
  --text-muted: #666;
  --border: #333;
  --status-bg: #222;
  --panel-bg: #252525;
  --panel-shadow: rgba(0, 0, 0, 0.4);
}

body.theme-sepia {
  --bg: #f4ecd8;
  --text: #433422;
  --text-muted: #8a7a66;
  --border: #d4c9b0;
  --status-bg: #efe6d0;
  --panel-bg: #f4ecd8;
  --panel-shadow: rgba(67, 52, 34, 0.1);
}

body {
  background: var(--bg);
  color: var(--text);
  transition: background 0.2s, color 0.2s;
}

.editor-wrap {
  height: calc(100vh - 36px);
  overflow-y: auto;
  display: flex;
  justify-content: center;
  padding: 60px 24px 40px;
}

#editor {
  width: 100%;
  max-width: 700px;
  font-family: Georgia, serif;
  font-size: 18px;
  line-height: 1.7;
  color: var(--text);
  outline: none;
  white-space: pre-wrap;
  word-wrap: break-word;
  min-height: 200px;
}

#editor:empty::before {
  content: attr(data-placeholder);
  color: var(--text-muted);
  pointer-events: none;
}

/* Status bar */
.status-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 36px;
  background: var(--status-bg);
  border-top: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  font-size: 12px;
  color: var(--text-muted);
}

.status-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.icon-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-muted);
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  transition: color 0.15s;
}

.icon-btn:hover {
  color: var(--text);
}

/* Settings panel */
.settings-panel {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: var(--panel-bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 24px;
  width: 320px;
  box-shadow: 0 8px 30px var(--panel-shadow);
  z-index: 100;
}

.settings-panel h2 {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
  color: var(--text);
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.setting-row label {
  font-size: 14px;
  color: var(--text);
  min-width: 50px;
}

.setting-row select,
.setting-row input[type="range"] {
  flex: 1;
  margin-left: 12px;
}

.setting-row select {
  padding: 4px 8px;
  font-size: 13px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg);
  color: var(--text);
}

#setting-size-value {
  min-width: 36px;
  text-align: right;
  font-size: 13px;
  color: var(--text-muted);
}

.btn-close {
  width: 100%;
  margin-top: 8px;
  padding: 8px;
  background: var(--text);
  color: var(--bg);
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.btn-close:hover {
  opacity: 0.85;
}

.hidden {
  display: none !important;
}

/* Overlay behind settings */
.settings-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 99;
}
```

- [ ] **Step 3: Commit**

```bash
git add extensions/cleannote/src/newtab/newtab.html extensions/cleannote/src/newtab/newtab.css
git commit -m "feat: add new tab page HTML and CSS with light/dark/sepia themes"
```

---

## Task 6: New Tab Page — JavaScript (Editor Logic)

**Files:**
- Create: `extensions/cleannote/src/newtab/newtab.js`

- [ ] **Step 1: Write the editor logic**

Create `extensions/cleannote/src/newtab/newtab.js`:
```js
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

let saveTimeout = null;
let overlay = null;

// --- Autosave ---
function scheduleSave() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveStatus.textContent = 'Typing...';

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
  saveStatus.textContent = 'Ready';
}

init();
```

- [ ] **Step 2: Load extension in Chrome and test manually**

1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select `extensions/cleannote/`
4. Open a new tab
5. Verify: editor appears with placeholder text, typing works
6. Type some text, wait 1 second — verify "Saved at HH:MM" appears in status bar
7. Close the tab, open a new tab — verify the text is still there
8. Click the gear icon — verify settings panel opens
9. Change font, size, and theme — verify they apply immediately
10. Close settings — verify editor refocuses

Expected: Full editor flow works. Autosave persists across new tabs.

- [ ] **Step 3: Commit**

```bash
git add extensions/cleannote/src/newtab/newtab.js
git commit -m "feat: add editor logic with autosave, settings, and keyboard shortcuts"
```

---

## Task 7: Polish + Export Feature

**Files:**
- Modify: `extensions/cleannote/src/newtab/newtab.html`
- Modify: `extensions/cleannote/src/newtab/newtab.js`
- Modify: `extensions/cleannote/src/newtab/newtab.css`

- [ ] **Step 1: Add export and word count to the status bar**

Add to the status bar in `newtab.html`, inside `.status-right`, before the settings button:
```html
<span id="word-count">0 words</span>
<button id="btn-export" class="icon-btn" title="Download as .txt" aria-label="Download as text file">
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
    <path d="M8 2v8M5 7l3 3 3-3M3 12h10"/>
  </svg>
</button>
```

- [ ] **Step 2: Add word count CSS**

Add to `newtab.css`:
```css
#word-count {
  font-size: 12px;
  color: var(--text-muted);
  margin-right: 8px;
}
```

- [ ] **Step 3: Add word count and export logic to newtab.js**

Add to `newtab.js` after the DOM element declarations:
```js
const wordCount = document.getElementById('word-count');
const btnExport = document.getElementById('btn-export');
```

Add the word count updater (call it from `scheduleSave` and `init`):
```js
function updateWordCount() {
  const text = editor.innerText.trim();
  const count = text ? text.split(/\s+/).length : 0;
  wordCount.textContent = `${count} word${count !== 1 ? 's' : ''}`;
}
```

Add `updateWordCount()` call inside `scheduleSave` (before the setTimeout) and at the end of `init()`.

Add the export handler:
```js
btnExport.addEventListener('click', () => {
  const text = editor.innerText;
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cleannote-${new Date().toISOString().split('T')[0]}.txt`;
  a.click();
  URL.revokeObjectURL(url);
});
```

- [ ] **Step 4: Test manually**

1. Reload extension in `chrome://extensions/`
2. Open new tab, type several words — verify word count updates
3. Click export button — verify .txt file downloads with correct content
4. Open the file — verify content matches what was in the editor

Expected: Word count live-updates, export downloads correctly.

- [ ] **Step 5: Commit**

```bash
git add extensions/cleannote/src/newtab/
git commit -m "feat: add word count display and export-to-txt"
```

---

## Task 8: Final QA + Icon Creation

**Files:**
- Modify: `extensions/cleannote/icons/` (replace placeholders with final icons)

- [ ] **Step 1: Create final extension icons**

Create a simple, clean icon that represents a notepad. A minimal design: rounded square in warm amber (#F5A623) with a white pencil/pen stroke, or a simple page icon with lines. Generate at 128x128 and resize to 48, 32, and 16. Save to `extensions/cleannote/icons/`.

- [ ] **Step 2: Full QA pass**

Test the following scenarios:
1. Fresh install — new tab shows empty editor with placeholder
2. Type text — autosaves after 500ms pause
3. Close tab, reopen — text persists
4. Change all 3 settings (font, size, theme) — each applies immediately and persists
5. Ctrl+S — saves immediately
6. Tab key — inserts spaces, does not change focus
7. Export — downloads correct .txt file
8. Word count — accurate for 0, 1, and many words
9. Large text (paste 10K+ characters) — editor remains responsive
10. Dark mode — all elements visible and styled correctly
11. Sepia mode — all elements visible and styled correctly

- [ ] **Step 3: Commit**

```bash
git add extensions/cleannote/icons/
git commit -m "feat: add final extension icons"
```

---

## Task 9: Chrome Web Store Publishing

**Files:** No code changes — publishing workflow.

- [ ] **Step 1: Create store listing assets**

Create:
- Promo images: 1280x800 marquee and 440x280 small tile
- At least 2 screenshots showing light and dark themes
- Description (first 132 characters):

```
A beautiful, distraction-free notepad in every new tab. Your notes autosave locally and never leave your browser. Free forever.
```

Full description:
```
CleanNote replaces your new tab with a clean writing space.

- Just open a new tab and start writing
- Notes autosave every time you pause
- Your data stays in your browser — nothing is sent anywhere
- Light, dark, and sepia themes
- Customizable font, size, and line height
- Export your notes as .txt anytime
- Word count in the status bar
- Keyboard shortcuts: Ctrl+S to save, Tab for indent

CleanNote is built for writers, note-takers, and anyone who wants a calm space to think. No accounts. No sign-ups. No distractions.
```

- [ ] **Step 2: Package the extension**

```bash
cd extensions/cleannote
zip -r cleannote-v0.1.0.zip manifest.json src/ icons/ -x "*/node_modules/*" "*/tests/*"
```

- [ ] **Step 3: Upload to Chrome Web Store**

1. Go to https://chrome.google.com/webstore/devconsole/
2. Click "New item" and upload the zip
3. Fill in listing details, screenshots, and description
4. Category: "Productivity" (consider also testing "Just Fun" or another less crowded category)
5. Permission justification: storage (to save notes locally)
6. Submit for review

Typical review: 1-3 business days.

- [ ] **Step 4: Commit final state**

```bash
git add -A extensions/cleannote/
git commit -m "feat: CleanNote v0.1.0 ready for Chrome Web Store submission"
```

---

## Run All Tests

At any point during development:

```bash
cd extensions/cleannote && npx vitest run
```

Expected: All tests pass (notes: 7, settings: 4 = 11 total).
