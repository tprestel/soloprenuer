/**
 * TabVault Service Worker
 * Handles keyboard shortcut, badge count updates
 */

const GROUPS_KEY = 'tabvault_groups';
const BACKUPS_KEY = 'tabvault_backups';
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

// ── Badge Updates ───────────────────────────────────────

function updateBadge(count) {
  chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });
  chrome.action.setBadgeBackgroundColor({ color: '#3B82F6' });
}

chrome.runtime.onStartup.addListener(async () => {
  const result = await chrome.storage.local.get(GROUPS_KEY);
  const count = (result[GROUPS_KEY] || []).length;
  updateBadge(count);
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
