import { loadAllGroups, deleteGroup, restoreGroup } from '../lib/tabs.js';
import { createBackup } from '../lib/backup.js';
import { exportAsJSON, exportAsMarkdown, exportAsHTML } from '../lib/export.js';
import { searchGroups } from '../lib/search.js';
import { getCleanupSetting, setCleanupSetting, runCleanup } from '../lib/cleanup.js';
import { isPremium, setPremium } from '../lib/premium.js';

const groupsList = document.getElementById('groups-list');
const emptyState = document.getElementById('empty-state');
const exportBtn = document.getElementById('export-btn');
const exportMenu = document.getElementById('export-menu');
const importInput = document.getElementById('import-input');
const settingsBtn = document.getElementById('settings-btn');
const settingsPanel = document.getElementById('settings-panel');
const cleanupSelect = document.getElementById('cleanup-select');
const cleanupProBadge = document.getElementById('cleanup-pro-badge');
const autosaveProBadge = document.getElementById('autosave-pro-badge');
const autosaveToggle = document.getElementById('autosave-toggle');
const colorSortBar = document.getElementById('color-sort-bar');
const searchInput = document.getElementById('search-input');
const searchClear = document.getElementById('search-clear');
const searchProOverlay = document.getElementById('search-pro-overlay');
const noResults = document.getElementById('no-results');
const premiumToggle = document.getElementById('premium-toggle');
const toastContainer = document.getElementById('toast-container');

const GROUP_COLORS = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'gray'];
const COLOR_HEX = {
  red: '#EF4444',
  orange: '#F97316',
  yellow: '#EAB308',
  green: '#22C55E',
  blue: '#3B82F6',
  purple: '#8B5CF6',
  gray: '#6B7280',
};

const AUTOSAVE_KEY = 'tabsafe_autosave_enabled';

let allGroups = [];
let premium = false;
let activeColorFilter = 'all';
let activeSortOrder = 'newest';

// ── Render ──────────────────────────────────────────────

async function render(searchQuery = '') {
  allGroups = await loadAllGroups();

  if (allGroups.length === 0) {
    emptyState.classList.remove('hidden');
    noResults.classList.add('hidden');
    groupsList.innerHTML = '';
    return;
  }

  emptyState.classList.add('hidden');

  let displayGroups = allGroups;

  // Apply color filter (premium only)
  if (premium && activeColorFilter !== 'all') {
    if (activeColorFilter === 'none') {
      displayGroups = displayGroups.filter((g) => !g.color);
    } else {
      displayGroups = displayGroups.filter((g) => g.color === activeColorFilter);
    }
  }

  if (searchQuery.trim()) {
    displayGroups = searchGroups(displayGroups, searchQuery);
  }

  // Apply sort order
  if (activeSortOrder === 'oldest') {
    displayGroups = [...displayGroups].sort((a, b) => a.createdAt - b.createdAt);
  } else if (activeSortOrder === 'tabs') {
    displayGroups = [...displayGroups].sort((a, b) => b.tabs.length - a.tabs.length);
  } else {
    // newest (default)
    displayGroups = [...displayGroups].sort((a, b) => b.createdAt - a.createdAt);
  }

  // Always float starred groups to the top
  displayGroups = [
    ...displayGroups.filter((g) => g.starred),
    ...displayGroups.filter((g) => !g.starred),
  ];

  if (displayGroups.length === 0) {
    noResults.classList.remove('hidden');
    groupsList.innerHTML = '';
  } else {
    noResults.classList.add('hidden');
    groupsList.innerHTML = displayGroups.map((g) => groupCard(g, searchQuery)).join('');
    attachGroupListeners();
  }
}

function groupCard(group, searchQuery = '') {
  const displayTitle = group.customName || group.title;
  const colorDot = group.color
    ? `<span class="color-dot" data-group-id="${group.id}" style="background:${COLOR_HEX[group.color] || '#6B7280'}" title="Change color"></span>`
    : `<span class="color-dot color-dot-empty" data-group-id="${group.id}" title="Add color"></span>`;

  const autoSavedBadge = group.autoSaved
    ? '<span class="auto-saved-badge" title="Auto-saved on browser close">AUTO</span>'
    : '';

  const proColorBadge = !premium ? '<span class="pro-badge pro-badge-inline">PRO</span>' : '';
  const proRenameBadge = !premium ? '<span class="pro-badge pro-badge-inline">PRO</span>' : '';

  const tabsHTML = group.tabs
    .map((tab, index) => {
      const isHighlighted =
        searchQuery.trim() && group.matchingTabIndices && group.matchingTabIndices.includes(index);
      return `
    <a class="tab-item ${isHighlighted ? 'tab-highlighted' : ''}" href="${escapeAttr(tab.url)}" target="_blank" rel="noopener" title="${escapeAttr(tab.url)}">
      <img class="tab-favicon" src="${escapeAttr(tab.favIconUrl || '')}" alt="" onerror="this.style.visibility='hidden'">
      <span class="tab-title">${escapeHTML(tab.title)}</span>
      <span class="tab-url">${escapeHTML(new URL(tab.url).hostname)}</span>
    </a>`;
    })
    .join('');

  const deleteBtn = group.locked
    ? ''
    : `<button class="btn btn-danger btn-sm delete-btn" data-id="${group.id}">Delete</button>`;

  return `
  <div class="group-card" data-group-id="${group.id}">
    <div class="group-header">
      <div class="group-title-area">
        ${premium ? colorDot : `<span class="color-dot-wrapper">${colorDot}${proColorBadge}</span>`}
        ${autoSavedBadge}
        <span class="group-title ${premium ? 'editable' : ''}" data-group-id="${group.id}" title="${premium ? 'Click to rename' : ''}">${escapeHTML(displayTitle)}</span>
        ${!premium && !group.customName ? proRenameBadge : ''}
      </div>
      <div class="group-actions">
        <button class="btn btn-sm star-btn ${group.starred ? 'starred' : ''}" data-id="${group.id}" title="${group.starred ? 'Unstar' : 'Star'}">${group.starred ? '★' : '☆'}</button>
        <button class="btn btn-sm duplicate-btn" data-id="${group.id}" title="Duplicate group">⧉</button>
        <button class="btn btn-sm lock-btn ${group.locked ? 'locked' : ''}" data-id="${group.id}" title="${group.locked ? 'Unlock group' : 'Lock group'}">${group.locked ? '🔒' : '🔓'}</button>
        <button class="btn btn-primary btn-sm restore-btn" data-id="${group.id}">Restore All</button>
        ${deleteBtn}
      </div>
    </div>
    <div class="group-note-area">
      ${group.note
        ? `<div class="group-note ${premium ? 'group-note-editable' : ''}" data-group-id="${group.id}">${escapeHTML(group.note)}</div>`
        : premium
          ? `<div class="group-note-placeholder" data-group-id="${group.id}">+ Add note...</div>`
          : ''
      }
    </div>
    <div class="group-tabs hidden" data-tabs-for="${group.id}">
      ${tabsHTML}
    </div>
    <div class="color-picker hidden" data-picker-for="${group.id}">
      <button class="color-option color-option-none" data-color="" title="No color">&times;</button>
      ${GROUP_COLORS.map(
        (c) =>
          `<button class="color-option" data-color="${c}" style="background:${COLOR_HEX[c]}" title="${c}"></button>`
      ).join('')}
    </div>
  </div>`;
}

function attachGroupListeners() {
  // Toggle expand
  document.querySelectorAll('.group-header').forEach((header) => {
    header.addEventListener('click', (e) => {
      if (e.target.closest('button') || e.target.closest('.color-dot') || e.target.closest('.group-title.editable') || e.target.closest('.color-dot-wrapper')) return;
      const card = header.closest('.group-card');
      const tabs = card.querySelector('.group-tabs');
      tabs.classList.toggle('hidden');
    });
  });

  // Color dot click — show picker
  document.querySelectorAll('.color-dot').forEach((dot) => {
    dot.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!premium) return;
      const groupId = dot.dataset.groupId;
      const card = dot.closest('.group-card');
      const picker = card.querySelector('.color-picker');
      // Close all other pickers first
      document.querySelectorAll('.color-picker').forEach((p) => {
        if (p !== picker) p.classList.add('hidden');
      });
      picker.classList.toggle('hidden');
    });
  });

  // Color picker selection
  document.querySelectorAll('.color-option').forEach((opt) => {
    opt.addEventListener('click', async (e) => {
      e.stopPropagation();
      const picker = opt.closest('.color-picker');
      const groupId = picker.dataset.pickerFor;
      const color = opt.dataset.color || null;

      await updateGroupField(groupId, 'color', color);
      picker.classList.add('hidden');
      await render(searchInput.value);
    });
  });

  // Inline rename — click title to edit
  document.querySelectorAll('.group-title.editable').forEach((titleEl) => {
    titleEl.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!premium) return;
      const groupId = titleEl.dataset.groupId;
      const currentText = titleEl.textContent;
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'inline-rename';
      input.value = currentText;
      titleEl.replaceWith(input);
      input.focus();
      input.select();

      const save = async () => {
        const newName = input.value.trim();
        if (newName && newName !== currentText) {
          await updateGroupField(groupId, 'customName', newName);
        }
        await render(searchInput.value);
      };

      input.addEventListener('blur', save);
      input.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') {
          ev.preventDefault();
          input.blur();
        }
        if (ev.key === 'Escape') {
          input.value = currentText;
          input.blur();
        }
      });
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
        await render(searchInput.value);
        updateBadge();
      }
    });
  });

  // Star
  document.querySelectorAll('.star-btn').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      if (!premium) {
        showToast('Upgrade to PRO to star groups');
        return;
      }
      const group = allGroups.find((g) => g.id === id);
      if (group) {
        await updateGroupField(id, 'starred', !group.starred);
        await render(searchInput.value);
      }
    });
  });

  // Duplicate
  document.querySelectorAll('.duplicate-btn').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      if (!premium) {
        showToast('Upgrade to PRO to duplicate groups');
        return;
      }
      const result = await chrome.storage.local.get('tabsafe_groups');
      const groups = result.tabsafe_groups || [];
      const original = groups.find((g) => g.id === id);
      if (original) {
        const now = Date.now();
        const copy = {
          ...JSON.parse(JSON.stringify(original)),
          id: `group_${now}`,
          createdAt: now,
          title: `Copy of ${original.customName || original.title}`,
          customName: original.customName ? `Copy of ${original.customName}` : undefined,
          starred: false,
          locked: false,
        };
        if (!copy.customName) delete copy.customName;
        groups.unshift(copy);
        await chrome.storage.local.set({ tabsafe_groups: groups });
        await render(searchInput.value);
      }
    });
  });

  // Lock
  document.querySelectorAll('.lock-btn').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      if (!premium) {
        showToast('Upgrade to PRO to lock groups');
        return;
      }
      const group = allGroups.find((g) => g.id === id);
      if (group) {
        await updateGroupField(id, 'locked', !group.locked);
        await render(searchInput.value);
      }
    });
  });

  // Group notes — editable note and placeholder
  document.querySelectorAll('.group-note-editable, .group-note-placeholder').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const groupId = el.dataset.groupId;
      const currentNote = el.classList.contains('group-note-placeholder') ? '' : el.textContent;

      const textarea = document.createElement('textarea');
      textarea.className = 'group-note-input';
      textarea.value = currentNote;
      textarea.rows = 2;
      el.replaceWith(textarea);
      textarea.focus();

      const saveNote = async () => {
        const trimmed = textarea.value.trim() || null;
        await updateGroupField(groupId, 'note', trimmed);
        await render(searchInput.value);
      };

      textarea.addEventListener('blur', saveNote);
      textarea.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter' && !ev.shiftKey) {
          ev.preventDefault();
          textarea.blur();
        }
        if (ev.key === 'Escape') {
          textarea.value = currentNote;
          textarea.blur();
        }
      });
    });
  });
}

async function updateGroupField(groupId, field, value) {
  const result = await chrome.storage.local.get('tabsafe_groups');
  const groups = result.tabsafe_groups || [];
  const group = groups.find((g) => g.id === groupId);
  if (group) {
    if (value === null || value === undefined) {
      delete group[field];
    } else {
      group[field] = value;
    }
    await chrome.storage.local.set({ tabsafe_groups: groups });
  }
}

// ── Search ──────────────────────────────────────────────

searchInput.addEventListener('input', () => {
  const query = searchInput.value;
  searchClear.classList.toggle('hidden', !query);

  if (!premium && query.trim()) {
    searchProOverlay.classList.remove('hidden');
    return;
  }
  searchProOverlay.classList.add('hidden');
  render(query);
});

searchClear.addEventListener('click', () => {
  searchInput.value = '';
  searchClear.classList.add('hidden');
  searchProOverlay.classList.add('hidden');
  render();
});

// ── Settings ────────────────────────────────────────────

settingsBtn.addEventListener('click', () => {
  settingsPanel.classList.toggle('hidden');
});

cleanupSelect.addEventListener('change', async () => {
  if (!premium) {
    cleanupSelect.value = '0';
    showToast('Upgrade to PRO to enable auto-cleanup');
    return;
  }
  const days = parseInt(cleanupSelect.value, 10);
  await setCleanupSetting(days);
  showToast(days > 0 ? `Auto-cleanup set to ${days} days` : 'Auto-cleanup disabled');
});

// ── Auto-save Toggle ───────────────────────────────────

autosaveToggle.addEventListener('change', async () => {
  if (!premium) {
    autosaveToggle.checked = false;
    showToast('Upgrade to PRO to enable auto-save');
    return;
  }
  await chrome.storage.local.set({ [AUTOSAVE_KEY]: autosaveToggle.checked });
  showToast(autosaveToggle.checked ? 'Auto-save enabled' : 'Auto-save disabled');
});

// ── Color Filter ───────────────────────────────────────

document.querySelectorAll('.color-filter-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    activeColorFilter = btn.dataset.filter;
    document.querySelectorAll('.color-filter-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    render(searchInput.value);
  });
});

// ── Sort Bar ───────────────────────────────────────────

document.querySelectorAll('.sort-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    activeSortOrder = btn.dataset.sort;
    document.querySelectorAll('.sort-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    render(searchInput.value);
  });
});

// ── Premium Toggle (Dev) ────────────────────────────────

premiumToggle.addEventListener('change', async () => {
  await setPremium(premiumToggle.checked);
  premium = premiumToggle.checked;
  updatePremiumUI();
  await render(searchInput.value);
});

function updatePremiumUI() {
  // Update PRO badges visibility
  cleanupProBadge.classList.toggle('hidden', premium);
  autosaveProBadge.classList.toggle('hidden', premium);
  cleanupSelect.disabled = !premium;
  autosaveToggle.disabled = !premium;

  // Color sort bar — only show for premium
  colorSortBar.classList.toggle('hidden', !premium);

  // Reset color filter if not premium
  if (!premium) {
    autosaveToggle.checked = false;
    activeColorFilter = 'all';
    document.querySelectorAll('.color-filter-btn').forEach((b) => b.classList.remove('active'));
    document.querySelector('.color-filter-btn[data-filter="all"]').classList.add('active');
  }

  // Update search
  if (premium) {
    searchProOverlay.classList.add('hidden');
    searchInput.placeholder = 'Search tab groups...';
  } else {
    searchInput.placeholder = 'Search tab groups...';
    if (searchInput.value.trim()) {
      searchProOverlay.classList.remove('hidden');
    }
  }
}

// ── Export ───────────────────────────────────────────────

exportBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  exportMenu.classList.toggle('hidden');
});

document.addEventListener('click', (e) => {
  if (!e.target.closest('.dropdown')) {
    exportMenu.classList.add('hidden');
  }
  // Close color pickers when clicking outside
  if (!e.target.closest('.color-dot') && !e.target.closest('.color-picker')) {
    document.querySelectorAll('.color-picker').forEach((p) => p.classList.add('hidden'));
  }
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
    // Try JSON first (TabSafe format)
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
    const result = await chrome.storage.local.get('tabsafe_groups');
    const existing = result.tabsafe_groups || [];
    const merged = [...importedGroups, ...existing];
    await chrome.storage.local.set({ tabsafe_groups: merged });
    await createBackup();
    await render(searchInput.value);
    updateBadge();
  }

  // Reset input so same file can be re-imported
  importInput.value = '';
});

// ── Toast ───────────────────────────────────────────────

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  toastContainer.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => toast.classList.add('toast-visible'));

  setTimeout(() => {
    toast.classList.remove('toast-visible');
    toast.addEventListener('transitionend', () => toast.remove());
  }, 3000);
}

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

async function init() {
  premium = await isPremium();
  premiumToggle.checked = premium;
  updatePremiumUI();

  // Load cleanup setting
  const cleanupDays = await getCleanupSetting();
  cleanupSelect.value = String(cleanupDays);

  // Load auto-save setting
  const autosaveResult = await chrome.storage.local.get(AUTOSAVE_KEY);
  autosaveToggle.checked = premium && autosaveResult[AUTOSAVE_KEY] === true;

  // Run cleanup on load if premium
  if (premium && cleanupDays > 0) {
    const removed = await runCleanup();
    if (removed > 0) {
      showToast(`Cleaned up ${removed} old tab group${removed > 1 ? 's' : ''}`);
    }
  }

  await render();
}

init();
