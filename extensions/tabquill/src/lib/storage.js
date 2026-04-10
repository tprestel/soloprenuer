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
