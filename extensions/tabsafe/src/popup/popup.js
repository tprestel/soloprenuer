import { saveCurrentTabs, loadAllGroups, checkForDuplicates } from '../lib/tabs.js';
import { createBackup } from '../lib/backup.js';

const saveBtn = document.getElementById('save-btn');
const saveCloseBtn = document.getElementById('save-close-btn');
const status = document.getElementById('status');
const groupCount = document.getElementById('group-count');
const openVault = document.getElementById('open-vault');

// Load group count on open
async function updateCount() {
  const groups = await loadAllGroups();
  const count = groups.length;
  groupCount.textContent = count === 1 ? '1 tab group saved' : `${count} tab groups saved`;
}

// Shared save logic with duplicate detection
async function performSave() {
  // Check for duplicates before saving
  const currentTabs = await chrome.tabs.query({ currentWindow: true });
  const existingGroups = await loadAllGroups();
  const duplicateNames = checkForDuplicates(currentTabs, existingGroups);

  if (duplicateNames.length > 0) {
    const label = duplicateNames[0];
    showStatus(`Warning: similar to "${label}" — saving anyway`);
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  const group = await saveCurrentTabs();

  if (group) {
    await createBackup();
    const groups = await loadAllGroups();
    chrome.action.setBadgeText({ text: String(groups.length) });
    chrome.action.setBadgeBackgroundColor({ color: '#3B82F6' });
    return group;
  }
  return null;
}

// Save all tabs
saveBtn.addEventListener('click', async () => {
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';

  try {
    const group = await performSave();
    if (group) {
      showStatus(`Saved ${group.tabs.length} tabs!`);
    } else {
      showStatus('No saveable tabs found.');
    }
  } catch (err) {
    showStatus('Error saving tabs.');
    console.error(err);
  }

  saveBtn.disabled = false;
  saveBtn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M8 1v10M4 7l4 4 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M2 13h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>
    Save All Tabs
  `;

  await updateCount();
});

// Save & Close
saveCloseBtn.addEventListener('click', async () => {
  saveCloseBtn.disabled = true;
  saveCloseBtn.textContent = 'Saving...';

  try {
    const group = await performSave();
    if (group) {
      showStatus(`Saved & closed ${group.tabs.length} tabs!`);
      await updateCount();
      // Close all tabs in the current window
      const tabs = await chrome.tabs.query({ currentWindow: true });
      const tabIds = tabs.map((t) => t.id);
      chrome.tabs.remove(tabIds);
      setTimeout(() => window.close(), 600);
    } else {
      showStatus('No saveable tabs found.');
      saveCloseBtn.disabled = false;
      saveCloseBtn.textContent = 'Save & Close';
    }
  } catch (err) {
    showStatus('Error saving tabs.');
    console.error(err);
    saveCloseBtn.disabled = false;
    saveCloseBtn.textContent = 'Save & Close';
  }
});

// Open vault page
openVault.addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('src/pages/vault.html') });
  window.close();
});

function showStatus(message) {
  status.textContent = message;
  status.classList.remove('hidden');
  setTimeout(() => status.classList.add('hidden'), 3000);
}

// Init
updateCount();
