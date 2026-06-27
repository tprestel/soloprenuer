/* global TabSnapSitemap */

async function init() {
  const { tabsnap_runner_origin: origin } = await chrome.storage.session.get('tabsnap_runner_origin');
  document.getElementById('origin').textContent = origin || '';
  document.getElementById('folder').value = origin ? new URL(origin).hostname.replace(/^www\./, '') : 'tabsnap';
  const fetchText = async (u) => { try { const r = await fetch(u); return r.ok ? await r.text() : null; } catch (_) { return null; } };
  const res = await TabSnapSitemap.discoverSitemapUrls(origin, fetchText);
  if (!res.found) { document.getElementById('discovering').textContent = 'No sitemap found for this site.'; return; }
  window.__urls = res.urls;
  renderPicker(res.urls);
}
init();

// Replaced in Task 6 (path-tree picker).
function renderPicker(urls) {
  document.getElementById('discovering').textContent = `Found ${urls.length} pages (picker coming next).`;
}
