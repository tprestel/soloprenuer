/**
 * TabVault Service Worker
 * Handles keyboard shortcut, badge count updates, auto-save on window close
 */

const GROUPS_KEY = 'tabvault_groups';
const BACKUPS_KEY = 'tabvault_backups';
const PREMIUM_KEY = 'tabvault_premium';
const MAX_BACKUPS = 5;
const FILTERED_PREFIXES = ['chrome://', 'chrome-extension://', 'about:'];

// ── Keyboard Shortcut ───────────────────────────────────

chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'save-tabs') {
    const result = await chrome.storage.local.get(GROUPS_KEY);
    const groups = result[GROUPS_KEY] || [];

    const tabs = await chrome.tabs.query({ currentWindow: true });
    const filtered = tabs.filter(
      (t) => t.url && !FILTERED_PREFIXES.some((p) => t.url.startsWith(p))
    );

    if (filtered.length === 0) return;

    const now = Date.now();
    const group = {
      id: `group_${now}`,
      createdAt: now,
      title: `${filtered.length} tabs — ${new Date(now).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
      tabs: filtered.map((t) => ({
        url: t.url,
        title: t.title || t.url,
        favIconUrl: t.favIconUrl || '',
      })),
    };

    groups.unshift(group);
    await chrome.storage.local.set({ [GROUPS_KEY]: groups });

    // Auto-backup after save
    await createBackupInline(groups);

    // Update badge
    updateBadge(groups.length);
  }
});

// ── Auto-Save on Window Close (Premium) ────────────────

chrome.windows.onRemoved.addListener(async (windowId) => {
  // Check if premium
  const premiumResult = await chrome.storage.local.get(PREMIUM_KEY);
  if (premiumResult[PREMIUM_KEY] !== true) return;

  // Check if there are any remaining windows — if none, this was the last window
  const remainingWindows = await chrome.windows.getAll();
  if (remainingWindows.length > 0) return;

  // Get all tabs from all windows before they close
  // At this point the window is already gone, so we save what we had
  // We use the onRemoved event which fires after the window is closed
  // Instead, we track tabs proactively
});

// Track open tabs for auto-save — store a snapshot periodically
let tabSnapshot = [];

async function updateTabSnapshot() {
  try {
    const tabs = await chrome.tabs.query({});
    tabSnapshot = tabs.filter(
      (t) => t.url && !FILTERED_PREFIXES.some((p) => t.url.startsWith(p))
    );
  } catch {
    // Tabs API may fail during shutdown
  }
}

// Update snapshot on tab changes
chrome.tabs.onUpdated.addListener(() => updateTabSnapshot());
chrome.tabs.onRemoved.addListener(() => updateTabSnapshot());
chrome.tabs.onCreated.addListener(() => updateTabSnapshot());

// Auto-save when last window is closing
chrome.windows.onRemoved.addListener(async () => {
  const premiumResult = await chrome.storage.local.get(PREMIUM_KEY);
  if (premiumResult[PREMIUM_KEY] !== true) return;

  try {
    const remainingWindows = await chrome.windows.getAll();
    // If there are still windows open, don't auto-save
    if (remainingWindows.length > 0) {
      // Update snapshot since a window was removed
      await updateTabSnapshot();
      return;
    }
  } catch {
    // If getAll fails, browser is shutting down — proceed with save
  }

  // Save snapshot as auto-saved group
  if (tabSnapshot.length === 0) return;

  const result = await chrome.storage.local.get(GROUPS_KEY);
  const groups = result[GROUPS_KEY] || [];

  const now = Date.now();
  const group = {
    id: `group_${now}`,
    createdAt: now,
    title: `Auto-saved — ${new Date(now).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`,
    autoSaved: true,
    tabs: tabSnapshot.map((t) => ({
      url: t.url,
      title: t.title || t.url,
      favIconUrl: t.favIconUrl || '',
    })),
  };

  groups.unshift(group);
  await chrome.storage.local.set({ [GROUPS_KEY]: groups });
  await createBackupInline(groups);
});

// Initial snapshot
updateTabSnapshot();

// ── Badge Updates ───────────────────────────────────────

function updateBadge(count) {
  chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });
  chrome.action.setBadgeBackgroundColor({ color: '#3B82F6' });
}

chrome.runtime.onStartup.addListener(async () => {
  const result = await chrome.storage.local.get(GROUPS_KEY);
  const count = (result[GROUPS_KEY] || []).length;
  updateBadge(count);
  updateTabSnapshot();
});

chrome.runtime.onInstalled.addListener(() => {
  updateBadge(0);
});

// Listen for storage changes to keep badge in sync
chrome.storage.onChanged.addListener((changes) => {
  if (changes[GROUPS_KEY]) {
    const groups = changes[GROUPS_KEY].newValue || [];
    updateBadge(groups.length);
  }
});

// ── Inline Backup (can't import modules in service worker) ──

async function createBackupInline(groups) {
  const result = await chrome.storage.local.get(BACKUPS_KEY);
  const backups = result[BACKUPS_KEY] || [];

  const now = Date.now();
  backups.push({
    id: `backup_${now}`,
    createdAt: now,
    groups: JSON.parse(JSON.stringify(groups)),
  });

  while (backups.length > MAX_BACKUPS) {
    backups.shift();
  }

  await chrome.storage.local.set({ [BACKUPS_KEY]: backups });
}
