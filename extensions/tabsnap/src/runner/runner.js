/* global TabSnapSitemap, TabSnapTree, TabSnapNaming, TabSnapEngine */

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

let cancelled = false;
const failures = [];

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
  const row = document.createElement('div'); row.className = 'row';
  const hasKids = node.children.length > 0;

  // Caret toggles the folder's children (collapsed by default). Leaf nodes get
  // an invisible spacer so checkboxes stay aligned.
  const caret = document.createElement('button');
  caret.type = 'button';
  caret.className = hasKids ? 'caret' : 'caret caret-spacer';
  caret.textContent = hasKids ? '▸' : '';
  caret.disabled = !hasKids;
  row.appendChild(caret);

  // Checkbox lives in its own bare label so the name (next to it) can have its
  // own click behavior instead of always toggling the checkbox.
  const cbWrap = document.createElement('label'); cbWrap.className = 'cb-wrap';
  const cb = document.createElement('input'); cb.type = 'checkbox';
  const pages = TabSnapTree.pagesUnder(node);
  cb.checked = pages.every(u => selected.has(u));
  cb.indeterminate = !cb.checked && pages.some(u => selected.has(u));
  cb.addEventListener('change', () => {
    pages.forEach(u => cb.checked ? selected.add(u) : selected.delete(u));
    refreshChecks(); updateTotal();
  });
  cb._pages = pages; // for refreshChecks
  cbWrap.appendChild(cb);
  row.appendChild(cbWrap);

  const name = document.createElement('span');
  name.className = 'name';
  name.textContent = hasKids
    ? `${node.segment === '/' ? '/' : '/' + node.segment + '/'} (${node.pages})`
    : '/' + node.segment;
  row.appendChild(name);
  wrap.append(row);

  if (hasKids) {
    const kids = document.createElement('div'); kids.className = 'children';
    kids.hidden = true; // collapsed by default
    node.children.forEach(c => kids.appendChild(renderNode(c)));
    wrap.append(kids);
    const toggle = () => {
      kids.hidden = !kids.hidden;
      caret.textContent = kids.hidden ? '▸' : '▾';
    };
    caret.addEventListener('click', toggle);
    name.classList.add('folder-name');   // bold + clickable to expand/collapse
    name.addEventListener('click', toggle);
  } else {
    name.classList.add('page-name');      // clicking a page name toggles its checkbox
    name.addEventListener('click', () => { cb.checked = !cb.checked; cb.dispatchEvent(new Event('change')); });
  }
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
  document.getElementById('total').textContent = `Capture ${pages} page${pages === 1 ? '' : 's'}.`;
  document.getElementById('start').disabled = pages === 0;
}

// Desktop-only capture. Mobile emulation was removed: because each page is
// loaded at desktop width before the viewport is shrunk, it produced a narrowed
// desktop page rather than a true mobile render. A proper mobile mode would need
// to load each page under emulation (emulate → reload → capture).
const DESKTOP = { name: 'desktop', width: 1440, mobile: false };
function chosenViewports() { return [DESKTOP]; }
function viewportCount() { return 1; }

function wireOptions() {
  document.getElementById('start').addEventListener('click', startCapture);
}

async function startCapture() {
  cancelled = false;
  const folder = (document.getElementById('folder').value.trim() || 'tabsnap').replace(/[/\\]/g, '-');
  const viewports = chosenViewports();
  const pages = TabSnapNaming.assignUniqueSlugs([...selected]);
  const totalShots = pages.length * viewports.length;
  if (totalShots > 100 &&
      !confirm(`${totalShots} screenshots (~${Math.ceil(totalShots * 4 / 60)} min). Continue?`)) return;

  document.getElementById('picker').hidden = true;
  document.getElementById('progress').hidden = false;
  const line = document.getElementById('prog-line');
  const list = document.getElementById('prog-list');
  list.innerHTML = ''; // clear any rows from a previous run (e.g. retry)
  TabSnapEngine.setProgressSink((m) => { line.textContent = m; });
  document.getElementById('cancel').onclick = () => { cancelled = true; };

  let done = 0;
  let win;
  try {
    win = await chrome.windows.create({ url: 'about:blank', focused: false, width: 1500, height: 1000 });
    const tabId = win.tabs[0].id;
    for (const { url, slug } of pages) {
      if (cancelled) break;
      for (const vp of viewports) {
        if (cancelled) break;
        done++;
        line.textContent = `Capturing ${done}/${totalShots}: ${url} (${vp.name})`;
        try {
          await navigateAndSettle(tabId, url);
          const { downloadUrl, ext } = await TabSnapEngine.captureSingleShot(tabId, 'png', { width: vp.width, mobile: vp.mobile });
          await chrome.downloads.download({ url: downloadUrl, filename: `${folder}/${vp.name}/${slug}.${ext}` });
          addRow(list, `✓ ${vp.name}/${slug}.${ext}`);
        } catch (e) {
          failures.push({ url, viewport: vp.name, error: String(e && e.message || e) });
          addRow(list, `✗ ${vp.name} ${slug} — ${e.message || e}`);
        }
        await delay(500); // politeness
      }
    }
  } catch (e) {
    addRow(list, `✗ could not start capture — ${e && e.message || e}`);
  } finally {
    if (win) { try { await chrome.windows.remove(win.id); } catch (_) {} }
  }
  showSummary(done, totalShots);
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function addRow(list, text) {
  const li = document.createElement('li'); li.textContent = text; list.appendChild(li);
  li.scrollIntoView({ block: 'nearest' });
}

// Navigate the capture tab and wait for load (bounded) + a short settle.
function navigateAndSettle(tabId, url, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const onUpdated = (id, info) => {
      if (id === tabId && info.status === 'complete') { cleanup(); setTimeout(resolve, 600); }
    };
    const timer = setTimeout(() => { cleanup(); reject(new Error('load timeout')); }, timeoutMs);
    function cleanup() { if (settled) return; settled = true; clearTimeout(timer); chrome.tabs.onUpdated.removeListener(onUpdated); }
    chrome.tabs.onUpdated.addListener(onUpdated);
    chrome.tabs.update(tabId, { url }).catch(err => { cleanup(); reject(err); });
  });
}

function showSummary(done, total) {
  document.getElementById('progress').hidden = true;
  const el = document.getElementById('summary');
  el.hidden = false;
  const ok = done - failures.length;
  el.innerHTML = `<h2>Done</h2><p>${ok} captured, ${failures.length} failed${cancelled ? ' (cancelled)' : ''}.</p>`;
  if (failures.length) {
    const ul = document.createElement('ul');
    failures.forEach(f => { const li = document.createElement('li'); li.textContent = `${f.viewport} ${f.url} — ${f.error}`; ul.appendChild(li); });
    el.appendChild(ul);
    const retry = document.createElement('button'); retry.className = 'btn'; retry.textContent = 'Retry failed';
    retry.addEventListener('click', () => {
      const urls = [...new Set(failures.map(f => f.url))];
      selected.clear(); urls.forEach(u => selected.add(u));
      failures.length = 0; cancelled = false;
      document.getElementById('summary').hidden = true;
      startCapture();
    });
    el.appendChild(retry);
  }
}
