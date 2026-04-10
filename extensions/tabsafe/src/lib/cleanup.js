/**
 * Cleanup module — auto-delete old tab groups based on user setting
 */

const GROUPS_KEY = 'tabsafe_groups';
const CLEANUP_KEY = 'tabsafe_cleanup_days';

export const CLEANUP_OPTIONS = [
  { label: 'Off', days: 0 },
  { label: '7 days', days: 7 },
  { label: '14 days', days: 14 },
  { label: '30 days', days: 30 },
  { label: '60 days', days: 60 },
  { label: '90 days', days: 90 },
];

/**
 * Get the current cleanup threshold in days (0 = off)
 */
export async function getCleanupSetting() {
  const result = await chrome.storage.local.get(CLEANUP_KEY);
  return result[CLEANUP_KEY] ?? 0;
}

/**
 * Set the cleanup threshold in days (0 = off)
 */
export async function setCleanupSetting(days) {
  await chrome.storage.local.set({ [CLEANUP_KEY]: days });
}

/**
 * Run cleanup — delete groups older than the threshold.
 * Skips auto-saved groups (autoSaved: true).
 * @returns {number} number of groups removed
 */
export async function runCleanup() {
  const days = await getCleanupSetting();
  if (days === 0) return 0;

  const result = await chrome.storage.local.get(GROUPS_KEY);
  const groups = result[GROUPS_KEY] || [];
  if (groups.length === 0) return 0;

  const now = Date.now();
  const threshold = now - days * 24 * 60 * 60 * 1000;

  const kept = groups.filter((group) => {
    // Never auto-delete auto-saved groups
    if (group.autoSaved) return true;
    return group.createdAt > threshold;
  });

  const removed = groups.length - kept.length;

  if (removed > 0) {
    await chrome.storage.local.set({ [GROUPS_KEY]: kept });
  }

  return removed;
}
