/**
 * Version history — saves snapshots of notebook content (premium only)
 */

const HISTORY_KEY = 'tabquill_history';
const MAX_SNAPSHOTS = 10;

export async function saveSnapshot(notebookId, content) {
  const result = await chrome.storage.local.get(HISTORY_KEY);
  const history = result[HISTORY_KEY] || {};

  if (!history[notebookId]) history[notebookId] = [];

  const snapshots = history[notebookId];

  // Don't save if content is identical to last snapshot
  if (snapshots.length > 0 && snapshots[snapshots.length - 1].content === content) return;

  snapshots.push({ savedAt: Date.now(), content });

  // Keep only last MAX_SNAPSHOTS
  while (snapshots.length > MAX_SNAPSHOTS) snapshots.shift();

  history[notebookId] = snapshots;
  await chrome.storage.local.set({ [HISTORY_KEY]: history });
}

export async function getSnapshots(notebookId) {
  const result = await chrome.storage.local.get(HISTORY_KEY);
  const history = result[HISTORY_KEY] || {};
  return (history[notebookId] || []).slice().reverse(); // newest first
}

export async function clearHistory(notebookId) {
  const result = await chrome.storage.local.get(HISTORY_KEY);
  const history = result[HISTORY_KEY] || {};
  delete history[notebookId];
  await chrome.storage.local.set({ [HISTORY_KEY]: history });
}
