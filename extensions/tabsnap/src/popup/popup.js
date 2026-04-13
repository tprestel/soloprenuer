/* global jspdf */

// ── jsPDF ──────────────────────────────────────────────────────────────────
const { jsPDF } = window.jspdf;

// ── Storage key ────────────────────────────────────────────────────────────
const SHOOT_KEY     = 'tabsnap_shoot_folder';
const SHOOT_SEQ_KEY = 'tabsnap_shoot_seq';

// ── DOM refs ───────────────────────────────────────────────────────────────
const idleView       = document.getElementById('idle-view');
const shootSetupView = document.getElementById('shoot-setup-view');
const capturingView  = document.getElementById('capturing-view');
const doneView       = document.getElementById('done-view');
const errorView      = document.getElementById('error-view');
const shootBar       = document.getElementById('shoot-bar');
const shootBarLabel  = document.getElementById('shoot-bar-label');
const progressBar    = document.getElementById('progress-bar');
const progressText   = document.getElementById('progress-text');
const filenameText   = document.getElementById('filename-text');
const errorText      = document.getElementById('error-text');
const folderInput    = document.getElementById('folder-input');

// ── View helpers ───────────────────────────────────────────────────────────
function hideAll() {
  idleView.hidden       = true;
  shootSetupView.hidden = true;
  capturingView.hidden  = true;
  doneView.hidden       = true;
  errorView.hidden      = true;
}

async function showIdle() {
  hideAll();
  idleView.hidden = false;
  await refreshShootBar();
}

function showSetup() {
  hideAll();
  shootSetupView.hidden = false;
  folderInput.value = '';
  setTimeout(() => folderInput.focus(), 50);
}

function showCapturing() {
  hideAll();
  capturingView.hidden = false;
  progressBar.style.width = '0%';
  progressText.textContent = 'Preparing…';
}

function showDone(label) {
  hideAll();
  doneView.hidden = false;
  filenameText.textContent = label;
}

function showError(msg) {
  hideAll();
  errorView.hidden = false;
  errorText.textContent = msg;
}

// ── Photo Shoot session ────────────────────────────────────────────────────
async function getShootFolder() {
  const result = await chrome.storage.session.get(SHOOT_KEY);
  return result[SHOOT_KEY] || null;
}

async function startSession(folderName) {
  await chrome.storage.session.set({ [SHOOT_KEY]: folderName, [SHOOT_SEQ_KEY]: 0 });
}

async function nextSeq() {
  const result = await chrome.storage.session.get(SHOOT_SEQ_KEY);
  const next = (result[SHOOT_SEQ_KEY] || 0) + 1;
  await chrome.storage.session.set({ [SHOOT_SEQ_KEY]: next });
  return next;
}

async function endSession() {
  await chrome.storage.session.remove(SHOOT_KEY);
}

async function refreshShootBar() {
  const folder = await getShootFolder();
  if (folder) {
    shootBarLabel.textContent = `📁 ${folder}`;
    shootBar.hidden = false;
    document.getElementById('btn-start-shoot').hidden = true;
  } else {
    shootBar.hidden = true;
    document.getElementById('btn-start-shoot').hidden = false;
  }
}

// ── Event listeners ────────────────────────────────────────────────────────
document.getElementById('btn-png').addEventListener('click', () => capture('png'));
document.getElementById('btn-jpg').addEventListener('click', () => capture('jpg'));
document.getElementById('btn-pdf').addEventListener('click', () => capture('pdf'));
document.getElementById('btn-again').addEventListener('click', showIdle);
document.getElementById('btn-retry').addEventListener('click', showIdle);

document.getElementById('btn-start-shoot').addEventListener('click', showSetup);
document.getElementById('btn-cancel-shoot').addEventListener('click', showIdle);

document.getElementById('btn-end-session').addEventListener('click', async () => {
  await endSession();
  await showIdle();
});

document.getElementById('btn-confirm-shoot').addEventListener('click', async () => {
  const raw = folderInput.value.trim();
  if (!raw) { folderInput.focus(); return; }
  // Sanitize: strip path separators and leading dots
  const safe = raw.replace(/[/\\]/g, '-').replace(/^\.+/, '');
  if (!safe) { folderInput.focus(); return; }
  await startSession(safe);
  await showIdle();
});

// Allow Enter key in folder input
folderInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('btn-confirm-shoot').click();
});

// ── Helpers ────────────────────────────────────────────────────────────────
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function formatTimestamp() {
  const d    = new Date();
  const yyyy = String(d.getFullYear());
  const mo   = String(d.getMonth() + 1).padStart(2, '0');
  const dd   = String(d.getDate()).padStart(2, '0');
  const hh   = String(d.getHours()).padStart(2, '0');
  const mm   = String(d.getMinutes()).padStart(2, '0');
  const ss   = String(d.getSeconds()).padStart(2, '0');
  return `${yyyy}-${mo}-${dd}-${hh}${mm}${ss}`;
}

// Hide all position:fixed and position:sticky elements so they don't repeat
// in each stitched chunk. Saves original visibility on a data attribute.
async function hideFixedElements(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        document.querySelectorAll('*').forEach(el => {
          const pos = window.getComputedStyle(el).position;
          if (pos === 'fixed' || pos === 'sticky') {
            el.dataset.tabsnapVis = el.style.visibility || '';
            el.style.setProperty('visibility', 'hidden', 'important');
          }
        });
      },
    });
    await delay(60); // let browser repaint without the fixed elements
  } catch (_) {
    // Page may not allow scripting (e.g. chrome:// pages) — proceed anyway
  }
}

// Restore visibility on all elements hidden by hideFixedElements.
async function restoreFixedElements(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        document.querySelectorAll('[data-tabsnap-vis]').forEach(el => {
          el.style.visibility = el.dataset.tabsnapVis;
          delete el.dataset.tabsnapVis;
        });
      },
    });
  } catch (_) { /* ignore */ }
}

// ── Capture ────────────────────────────────────────────────────────────────
async function capture(format) {
  showCapturing();

  let tabId;
  try {
    // 1. Active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    tabId = tab.id;

    // 2. Page dimensions + current scroll position
    const [{ result: dims }] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => ({
        scrollWidth:    Math.max(document.body.scrollWidth,    document.documentElement.scrollWidth),
        scrollHeight:   Math.max(document.body.scrollHeight,   document.documentElement.scrollHeight),
        viewportWidth:  window.innerWidth,
        viewportHeight: window.innerHeight,
        dpr:            window.devicePixelRatio || 1,
        origX:          window.scrollX,
        origY:          window.scrollY,
      }),
    });

    const { scrollWidth, scrollHeight, viewportHeight, dpr, origX, origY } = dims;

    // 3. Canvas size guard (Chrome limit: 32767px per dimension, ~268M total pixels)
    const canvasW = scrollWidth * dpr;
    const canvasH = scrollHeight * dpr;
    if (canvasW > 32767 || canvasH > 32767 || canvasW * canvasH > 268_000_000) {
      showError(`Page is too large to capture (${scrollWidth}×${scrollHeight}px @${dpr}x). Try zooming out the page first.`);
      return;
    }

    // 4. Stitching canvas
    const canvas = document.createElement('canvas');
    canvas.width  = canvasW;
    canvas.height = canvasH;
    const ctx = canvas.getContext('2d');

    // 5. Hide fixed/sticky elements so they don't appear in every chunk
    await hideFixedElements(tabId);

    try {
      // 6. Scroll-capture loop
      const steps = Math.ceil(scrollHeight / viewportHeight);

      for (let i = 0; i < steps; i++) {
        const targetY = i * viewportHeight;

        // Scroll and read back actual position (browser clamps near bottom)
        const [{ result: actualY }] = await chrome.scripting.executeScript({
          target: { tabId },
          func: (x, y) => { window.scrollTo(x, y); return window.scrollY; },
          args:  [0, targetY],
        });

        // Wait for lazy-load / layout settle
        await delay(150);

        // Capture visible area
        const dataUrl = await chrome.tabs.captureVisibleTab({ format: 'png' });

        // Stitch chunk — clip src height so we never overdraw the canvas bottom
        const img   = await loadImage(dataUrl);
        const drawY = actualY * dpr;
        const srcH  = Math.min(img.naturalHeight, canvas.height - drawY);
        ctx.drawImage(img, 0, 0, img.naturalWidth, srcH, 0, drawY, img.naturalWidth, srcH);

        // Progress
        const pct = Math.round(((i + 1) / steps) * 100);
        progressBar.style.width = pct + '%';
        progressText.textContent = `Capturing… ${i + 1} of ${steps}`;
      }
    } finally {
      // Always restore fixed elements, even if the loop threw
      await restoreFixedElements(tabId);
    }

    // 7. Restore original scroll position
    await chrome.scripting.executeScript({
      target: { tabId },
      func:   (x, y) => window.scrollTo(x, y),
      args:   [origX, origY],
    });

    // 8. Export — yield before blocking toDataURL / jsPDF calls
    progressText.textContent = 'Encoding…';
    await delay(0);

    const ts = formatTimestamp();
    let downloadUrl, ext;

    if (format === 'png') {
      downloadUrl = canvas.toDataURL('image/png');
      ext = 'png';
    } else if (format === 'jpg') {
      downloadUrl = canvas.toDataURL('image/jpeg', 0.92);
      ext = 'jpg';
    } else {
      const orientation = scrollHeight > scrollWidth ? 'portrait' : 'landscape';
      const pdf = new jsPDF({
        orientation,
        unit:     'px',
        format:   [scrollWidth, scrollHeight],
        hotfixes: ['px_scaling'],
      });
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, scrollWidth, scrollHeight);
      downloadUrl = pdf.output('datauristring');
      ext = 'pdf';
    }

    // 9. Build filename
    const shootFolder = await getShootFolder();
    let baseName, filename;
    if (shootFolder) {
      const seq  = await nextSeq();
      const date = ts.slice(0, 10); // YYYY-MM-DD only
      const n    = String(seq).padStart(3, '0');
      baseName   = `${shootFolder}-${date}-${n}.${ext}`;
      filename   = `${shootFolder}/${baseName}`;
    } else {
      baseName = `tabsnap-${ts}.${ext}`;
      filename = baseName;
    }
    const displayLabel = shootFolder
      ? `Saved to Downloads/${shootFolder}/\n${baseName}`
      : baseName;

    // 10. Download
    await chrome.downloads.download({ url: downloadUrl, filename });

    showDone(displayLabel);

  } catch (err) {
    showError(err.message || 'Something went wrong. Try reloading the page.');
  }
}

// ── Init ───────────────────────────────────────────────────────────────────
showIdle();
