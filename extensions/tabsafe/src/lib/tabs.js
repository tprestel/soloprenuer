/**
 * Tab group CRUD — save, load, delete, restore tab groups
 */

const STORAGE_KEY = 'tabsafe_groups';

const FILTERED_PREFIXES = ['chrome://', 'chrome-extension://', 'about:'];

function isAllowedUrl(url) {
  if (!url) return false;
  return !FILTERED_PREFIXES.some((prefix) => url.startsWith(prefix));
}

export async function saveCurrentTabs() {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  const filtered = tabs.filter((t) => isAllowedUrl(t.url));

  if (filtered.length === 0) return null;

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

  const result = await chrome.storage.local.get(STORAGE_KEY);
  const groups = result[STORAGE_KEY] || [];
  groups.unshift(group);
  await chrome.storage.local.set({ [STORAGE_KEY]: groups });

  return group;
}

export async function loadAllGroups() {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const groups = result[STORAGE_KEY] || [];
  return groups.sort((a, b) => b.createdAt - a.createdAt);
}

export async function deleteGroup(groupId) {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const groups = result[STORAGE_KEY] || [];
  const updated = groups.filter((g) => g.id !== groupId);
  await chrome.storage.local.set({ [STORAGE_KEY]: updated });
}

export async function restoreGroup(groupId) {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const groups = result[STORAGE_KEY] || [];
  const group = groups.find((g) => g.id === groupId);
  return group ? group.tabs : null;
}

/**
 * Check if the tabs being saved are duplicates of an existing group.
 * Returns an array of group names where >50% of the tabs match by URL.
 */
export function checkForDuplicates(tabs, existingGroups) {
  const incomingUrls = new Set(tabs.map((t) => t.url).filter(Boolean));
  if (incomingUrls.size === 0) return [];

  const matches = [];
  for (const group of existingGroups) {
    const groupUrls = (group.tabs || []).map((t) => t.url).filter(Boolean);
    if (groupUrls.length === 0) continue;
    const overlap = groupUrls.filter((url) => incomingUrls.has(url)).length;
    const overlapRatio = overlap / incomingUrls.size;
    if (overlapRatio > 0.5) {
      matches.push(group.customName || group.title);
    }
  }
  return matches;
}
