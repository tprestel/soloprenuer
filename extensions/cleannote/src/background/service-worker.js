// Open CleanNote in a dedicated tab when the extension icon is clicked.
// If a CleanNote tab already exists, switch to it instead of opening a duplicate.
chrome.action.onClicked.addListener(async () => {
  const noteUrl = chrome.runtime.getURL('src/newtab/newtab.html');
  const tabs = await chrome.tabs.query({});
  const existing = tabs.find(t => t.url === noteUrl);

  if (existing) {
    chrome.tabs.update(existing.id, { active: true });
    chrome.windows.update(existing.windowId, { focused: true });
  } else {
    chrome.tabs.create({ url: noteUrl });
  }
});
