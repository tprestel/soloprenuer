/**
 * Backup module — automatic local JSON backups of tab groups
 */

const GROUPS_KEY = 'tabsafe_groups';
const BACKUPS_KEY = 'tabsafe_backups';
const MAX_BACKUPS = 5;

export async function createBackup() {
  const groupsResult = await chrome.storage.local.get(GROUPS_KEY);
  const groups = groupsResult[GROUPS_KEY] || [];

  const backupsResult = await chrome.storage.local.get(BACKUPS_KEY);
  const backups = backupsResult[BACKUPS_KEY] || [];

  const now = Date.now();
  const backup = {
    id: `backup_${now}`,
    createdAt: now,
    groups: JSON.parse(JSON.stringify(groups)),
  };

  backups.push(backup);

  // Keep only the last 5
  while (backups.length > MAX_BACKUPS) {
    backups.shift();
  }

  await chrome.storage.local.set({ [BACKUPS_KEY]: backups });
  return backup;
}

export async function listBackups() {
  const result = await chrome.storage.local.get(BACKUPS_KEY);
  const backups = result[BACKUPS_KEY] || [];
  return backups.sort((a, b) => b.createdAt - a.createdAt);
}

export async function restoreFromBackup(backupId) {
  const result = await chrome.storage.local.get(BACKUPS_KEY);
  const backups = result[BACKUPS_KEY] || [];
  const backup = backups.find((b) => b.id === backupId);

  if (!backup) return false;

  await chrome.storage.local.set({ [GROUPS_KEY]: JSON.parse(JSON.stringify(backup.groups)) });
  return true;
}
