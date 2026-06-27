/* global TabSnapSitemap, TabSnapTree */

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

const selected = new Set(); // selected page URLs

function renderPicker(urls) {
  urls.forEach(u => selected.add(u)); // default: all selected
  const root = TabSnapTree.buildTree(urls);
  const treeEl = document.getElementById('tree');
  treeEl.innerHTML = '';
  root.children.forEach(child => treeEl.appendChild(renderNode(child)));
  if (root.url) treeEl.prepend(renderNode({ segment: '/', path: '/', url: root.url, children: [], pages: 1 }));
  document.getElementById('discovering').hidden = true;
  document.getElementById('picker').hidden = false;
  updateTotal();
  wireOptions();
}

function renderNode(node) {
  const wrap = document.createElement('div');
  wrap.className = 'node';
  const row = document.createElement('label'); row.className = 'row';
  const cb = document.createElement('input'); cb.type = 'checkbox';
  const pages = TabSnapTree.pagesUnder(node);
  cb.checked = pages.every(u => selected.has(u));
  cb.indeterminate = !cb.checked && pages.some(u => selected.has(u));
  cb.addEventListener('change', () => {
    pages.forEach(u => cb.checked ? selected.add(u) : selected.delete(u));
    refreshChecks(); updateTotal();
  });
  cb.dataset.path = node.path;
  const label = document.createElement('span');
  label.textContent = node.children.length
    ? `${node.segment === '/' ? '/' : '/' + node.segment + '/'} (${node.pages})`
    : '/' + node.segment;
  row.append(cb, label); wrap.append(row);
  if (node.children.length) {
    const kids = document.createElement('div'); kids.className = 'children';
    node.children.forEach(c => kids.appendChild(renderNode(c)));
    wrap.append(kids);
  }
  cb._pages = pages; // for refreshChecks
  return wrap;
}

function refreshChecks() {
  document.querySelectorAll('#tree input[type=checkbox]').forEach(cb => {
    const pages = cb._pages || [];
    cb.checked = pages.length && pages.every(u => selected.has(u));
    cb.indeterminate = !cb.checked && pages.some(u => selected.has(u));
  });
}

function updateTotal() {
  const pages = selected.size;
  const shots = pages * viewportCount();
  document.getElementById('total').textContent = `Capture ${pages} pages → ${shots} shots.`;
  document.getElementById('start').disabled = pages === 0 || viewportCount() === 0;
}

const VIEWPORTS = { desktop: { name: 'desktop', width: 1440, mobile: false },
                    mobile:  { name: 'mobile',  width: 390,  mobile: true } };

function chosenViewports() {
  const out = [];
  if (document.getElementById('vp-desktop').checked) out.push(VIEWPORTS.desktop);
  if (document.getElementById('vp-mobile').checked) out.push(VIEWPORTS.mobile);
  return out;
}
function viewportCount() { return chosenViewports().length; }

function wireOptions() {
  document.getElementById('vp-desktop').addEventListener('change', updateTotal);
  document.getElementById('vp-mobile').addEventListener('change', updateTotal);
  document.getElementById('start').addEventListener('click', startCapture);
}

// Replaced in the next task (capture orchestration).
function startCapture() {
  document.getElementById('total').textContent = `Would capture ${selected.size} pages × ${viewportCount()} viewport(s).`;
}
