import { loadAllGroups, deleteGroup, restoreGroup } from '../lib/tabs.js';
import { createBackup } from '../lib/backup.js';
import { exportAsJSON, exportAsMarkdown, exportAsHTML } from '../lib/export.js';

const groupsList = document.getElementById('groups-list');
const emptyState = document.getElementById('empty-state');
const exportBtn = document.getElementById('export-btn');
const exportMenu = document.getElementById('export-menu');
const importInput = document.getElementById('import-input');

let allGroups = [];

// ── Render ──────────────────────────────────────────────

async function render() {
  allGroups = await loadAllGroups();

  if (allGroups.length === 0) {
    emptyState.classList.remove('hidden');
    groupsList.innerHTML = '';
    return;
  }

  emptyState.classList.add('hidden');
  groupsList.innerHTML = allGroups.map(groupCard).join('');
  attachGroupListeners();
}

function groupCard(group) {
  const tabsHTML = group.tabs
    .map(
      (tab) => `
    <a class="tab-item" href="${escapeAttr(tab.url)}" target="_blank" rel="noopener" title="${escapeAttr(tab.url)}">
      <img class="tab-favicon" src="${escapeAttr(tab.favIconUrl || '')}" alt="" onerror="this.style.visibility='hidden'">
      <span class="tab-title">${escapeHTML(tab.title)}</span>
      <span class="tab-url">${escapeHTML(new URL(tab.url).hostname)}</span>
    </a>`
    )
    .join('');

  return `
  <div class="group-card" data-group-id="${group.id}">
    <div class="group-header">
      <span class="group-title">${escapeHTML(group.title)}</span>
      <div class="group-actions">
        <button class="btn btn-primary btn-sm restore-btn" data-id="${group.id}">Restore All</button>
        <button class="btn btn-danger btn-sm delete-btn" data-id="${group.id}">Delete</button>
      </div>
    </div>
    <div class="group-tabs hidden" data-tabs-for="${group.id}">
      ${tabsHTML}
    </div>
  </div>`;
}

function attachGroupListeners() {
  // Toggle expand
  document.querySelectorAll('.group-header').forEach((header) => {
    header.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      const card = header.closest('.group-card');
      const tabs = card.querySelector('.group-tabs');
      tabs.classList.toggle('hidden');
    });
  });

  // Restore
  document.querySelectorAll('.restore-btn').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const tabs = await restoreGroup(id);
      if (tabs) {
        for (const tab of tabs) {
          chrome.tabs.create({ url: tab.url, active: false });
        }
      }
    });
  });

  // Delete
  document.querySelectorAll('.delete-btn').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const confirmed = await showConfirm('Delete this tab group? This cannot be undone.');
      if (confirmed) {
        await deleteGroup(id);
        await createBackup();
        await render();
        updateBadge();
      }
    });
  });
}

// ── Export ───────────────────────────────────────────────

exportBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  exportMenu.classList.toggle('hidden');
});

document.addEventListener('click', () => {
  exportMenu.classList.add('hidden');
});

exportMenu.querySelectorAll('button').forEach((btn) => {
  btn.addEventListener('click', () => {
    const format = btn.dataset.format;
    let content, filename, type;

    if (format === 'json') {
      content = exportAsJSON(allGroups);
      filename = 'tabvault-export.json';
      type = 'application/json';
    } else if (format === 'markdown') {
      content = exportAsMarkdown(allGroups);
      filename = 'tabvault-export.md';
      type = 'text/markdown';
    } else if (format === 'html') {
      content = exportAsHTML(allGroups);
      filename = 'tabvault-export.html';
      type = 'text/html';
    }

    downloadFile(content, filename, type);
    exportMenu.classList.add('hidden');
  });
});

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Import ──────────────────────────────────────────────

importInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const text = await file.text();
  let importedGroups = [];

  try {
    // Try JSON first (TabVault format)
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      importedGroups = parsed;
    }
  } catch {
    // Fall back to OneTab format: one URL per line, optional " | title"
    const lines = text.split('\n').filter((l) => l.trim());
    const tabs = [];

    for (const line of lines) {
      const parts = line.split(' | ');
      const url = parts[0].trim();
      const title = parts[1]?.trim() || url;

      if (url.startsWith('http://') || url.startsWith('https://')) {
        tabs.push({ url, title, favIconUrl: '' });
      }
    }

    if (tabs.length > 0) {
      const now = Date.now();
      importedGroups = [
        {
          id: `group_${now}`,
          createdAt: now,
          title: `${tabs.length} tabs — Imported ${new Date(now).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
          tabs,
        },
      ];
    }
  }

  if (importedGroups.length > 0) {
    // Merge with existing
    const result = await chrome.storage.local.get('tabvault_groups');
    const existing = result.tabvault_groups || [];
    const merged = [...importedGroups, ...existing];
    await chrome.storage.local.set({ tabvault_groups: merged });
    await createBackup();
    await render();
    updateBadge();
  }

  // Reset input so same file can be re-imported
  importInput.value = '';
});

// ── Confirm Dialog ──────────────────────────────────────

function showConfirm(message) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    overlay.innerHTML = `
      <div class="confirm-dialog">
        <p>${escapeHTML(message)}</p>
        <div class="confirm-actions">
          <button class="btn btn-sm cancel-btn">Cancel</button>
          <button class="btn btn-danger btn-sm confirm-btn">Delete</button>
        </div>
      </div>
    `;

    overlay.querySelector('.cancel-btn').addEventListener('click', () => {
      overlay.remove();
      resolve(false);
    });

    overlay.querySelector('.confirm-btn').addEventListener('click', () => {
      overlay.remove();
      resolve(true);
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
        resolve(false);
      }
    });

    document.body.appendChild(overlay);
  });
}

// ── Badge ───────────────────────────────────────────────

function updateBadge() {
  const count = allGroups.length;
  chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });
  chrome.action.setBadgeBackgroundColor({ color: '#3B82F6' });
}

// ── Helpers ─────────────────────────────────────────────

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function escapeAttr(str) {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── Init ────────────────────────────────────────────────

render();
