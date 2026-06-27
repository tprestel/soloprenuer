/* global jspdf, TabSnapEngine */

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

// ── Engine progress sink ────────────────────────────────────────────────────
TabSnapEngine.setProgressSink((msg) => { progressText.textContent = msg; });

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
  await chrome.storage.session.remove([SHOOT_KEY, SHOOT_SEQ_KEY]);
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

// Force instant scrolling during capture. Many sites set
// `scroll-behavior: smooth`, which turns window.scrollTo into a ~1s animation —
// the capture loop would then read a scroll position that lags the pixels it
// captures, producing misaligned chunks and black gaps. An injected !important
// style overrides it for the duration of the capture.
async function forceInstantScroll(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        if (!document.getElementById('tabsnap-scroll-style')) {
          const s = document.createElement('style');
          s.id = 'tabsnap-scroll-style';
          s.textContent = 'html,body{scroll-behavior:auto !important;}';
          document.documentElement.appendChild(s);
        }
      },
    });
  } catch (_) { /* ignore */ }
}

// Remove the instant-scroll override added by forceInstantScroll.
async function restoreScrollBehavior(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const s = document.getElementById('tabsnap-scroll-style');
        if (s) s.remove();
      },
    });
  } catch (_) { /* ignore */ }
}

// Extract a filename-safe site root (domain) from a tab URL, e.g.
// "https://www.newo.ai/pricing" → "newo.ai". Returns '' if unavailable
// (e.g. chrome:// or file:// pages with no hostname).
function siteRootFromUrl(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    return host.replace(/[^a-z0-9.-]/gi, '-');
  } catch (_) {
    return '';
  }
}

// ── Filename + download (shared by both engines) ─────────────────────────────
async function finalizeDownload(format, ext, downloadUrl, siteRoot) {
  const ts = formatTimestamp();
  const shootFolder = await getShootFolder();
  let baseName, filename;
  if (shootFolder) {
    const seq  = await nextSeq();
    const date = ts.slice(0, 10); // YYYY-MM-DD only
    const n    = String(seq).padStart(3, '0');
    const site = siteRoot ? `${siteRoot}-` : '';
    baseName   = `${shootFolder}-${site}${date}-${n}.${ext}`;
    filename   = `${shootFolder}/${baseName}`;
  } else {
    baseName = `${siteRoot || 'tabsnap'}-${ts}.${ext}`;
    filename = baseName;
  }
  const displayLabel = shootFolder
    ? `Saved to Downloads/${shootFolder}/\n${baseName}`
    : baseName;

  await chrome.downloads.download({ url: downloadUrl, filename });
  showDone(displayLabel);
}

// ── Stitch engine (fallback) ─────────────────────────────────────────────────
// Scrolls the page in viewport-height steps and stitches each captureVisibleTab
// chunk onto one canvas. Used when the single-shot engine can't attach. Cannot
// faithfully capture animated / parallax content (chunks are taken at different
// moments), which is why single-shot is preferred.
async function captureStitch(tabId, format) {
    // Page dimensions + current scroll position
    const [{ result: dims }] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => ({
        scrollWidth:    Math.max(document.body.scrollWidth,    document.documentElement.scrollWidth),
        scrollHeight:   Math.max(document.body.scrollHeight,   document.documentElement.scrollHeight),
        clientWidth:    document.documentElement.clientWidth,
        viewportWidth:  window.innerWidth,
        viewportHeight: window.innerHeight,
        dpr:            window.devicePixelRatio || 1,
        origX:          window.scrollX,
        origY:          window.scrollY,
      }),
    });

    const { scrollHeight, clientWidth, viewportHeight, dpr, origX, origY } = dims;

    // Width is the viewport (clientWidth), not scrollWidth: captureVisibleTab only
    // ever returns the visible viewport, and we never scroll horizontally, so any
    // horizontal overflow (e.g. parallax images) would just become an undrawn
    // black strip on the right. Capture exactly what each chunk can contain.
    const captureWidth = clientWidth;

    // 3. Canvas size guard (Chrome limit: 32767px per dimension, ~268M total pixels)
    const canvasW = captureWidth * dpr;
    const canvasH = scrollHeight * dpr;
    if (canvasW > 32767 || canvasH > 32767 || canvasW * canvasH > 268_000_000) {
      throw new Error(`Page is too large to capture (${captureWidth}×${scrollHeight}px @${dpr}x). Try zooming out the page first.`);
    }

    // 4. Stitching canvas
    const canvas = document.createElement('canvas');
    canvas.width  = canvasW;
    canvas.height = canvasH;
    const ctx = canvas.getContext('2d');

    // 5. Override smooth scrolling so scrollTo is synchronous (see helper).
    await forceInstantScroll(tabId);

    // Track how far down the canvas we actually painted, so we can crop any
    // trailing blank space (canvas is sized from the reported scrollHeight,
    // which can exceed the height that is actually scrollable/painted).
    let maxDrawnY    = 0;
    let fixedHidden  = false;

    try {
      // 6. Scroll-capture loop
      const steps = Math.ceil(scrollHeight / viewportHeight);
      let prevActualY = -1;

      for (let i = 0; i < steps; i++) {
        const targetY = i * viewportHeight;

        // Scroll. behavior:'instant' (plus the injected style above) defeats any
        // page-level `scroll-behavior: smooth`, which would otherwise animate the
        // scroll and leave window.scrollY lagging behind the captured pixels.
        await chrome.scripting.executeScript({
          target: { tabId },
          func: (x, y) => window.scrollTo({ left: x, top: y, behavior: 'instant' }),
          args:  [0, targetY],
        });

        // Wait for the scroll to land + lazy-load / layout settle
        await delay(150);

        // Read the ACTUAL scroll position at capture time (browser clamps near
        // the bottom). Reading AFTER the settle guarantees drawY matches the
        // pixels we are about to capture.
        const [{ result: actualY }] = await chrome.scripting.executeScript({
          target: { tabId },
          func: () => window.scrollY,
        });

        // Bottom reached: no further progress means the previous chunk already
        // painted the end of the page. Stop before redrawing it.
        if (i > 0 && actualY <= prevActualY) break;

        // Capture visible area. The first (top) chunk is captured with fixed/
        // sticky elements visible so the header/nav appears once; they are then
        // hidden so they don't repeat in every subsequent chunk.
        const dataUrl = await chrome.tabs.captureVisibleTab({ format: 'png' });

        // Stitch chunk — clip src height so we never overdraw the canvas bottom
        const img   = await loadImage(dataUrl);
        const drawY = Math.round(actualY * dpr);
        const srcH  = Math.min(img.naturalHeight, canvas.height - drawY);
        if (srcH > 0) {
          ctx.drawImage(img, 0, 0, img.naturalWidth, srcH, 0, drawY, img.naturalWidth, srcH);
          maxDrawnY = Math.max(maxDrawnY, drawY + srcH);
        }

        // Hide fixed/sticky elements now that the top chunk is captured.
        if (!fixedHidden) {
          await hideFixedElements(tabId);
          fixedHidden = true;
        }

        prevActualY = actualY;

        // Progress
        const pct = Math.round(((i + 1) / steps) * 100);
        progressBar.style.width = pct + '%';
        progressText.textContent = `Capturing… ${i + 1} of ${steps}`;
      }
    } finally {
      // Always restore page state, even if the loop threw
      if (fixedHidden) await restoreFixedElements(tabId);
      await restoreScrollBehavior(tabId);
    }

    // 7. Restore original scroll position
    await chrome.scripting.executeScript({
      target: { tabId },
      func:   (x, y) => window.scrollTo(x, y),
      args:   [origX, origY],
    });

    // 7b. Crop trailing blank space down to what we actually painted, so the
    //     image has no black tail when scrollHeight overestimates real content.
    let outCanvas    = canvas;
    let outHeightCss = scrollHeight;
    if (maxDrawnY > 0 && maxDrawnY < canvas.height - 1) {
      outCanvas = document.createElement('canvas');
      outCanvas.width  = canvas.width;
      outCanvas.height = maxDrawnY;
      outCanvas.getContext('2d').drawImage(canvas, 0, 0);
      outHeightCss = Math.round(maxDrawnY / dpr);
    }

    // 8. Export — yield before blocking toDataURL / jsPDF calls
    progressText.textContent = 'Encoding…';
    await delay(0);

    let downloadUrl, ext;

    if (format === 'png') {
      downloadUrl = outCanvas.toDataURL('image/png');
      ext = 'png';
    } else if (format === 'jpg') {
      downloadUrl = outCanvas.toDataURL('image/jpeg', 0.92);
      ext = 'jpg';
    } else {
      const orientation = outHeightCss > captureWidth ? 'portrait' : 'landscape';
      const pdf = new jsPDF({
        orientation,
        unit:     'px',
        format:   [captureWidth, outHeightCss],
        hotfixes: ['px_scaling'],
      });
      pdf.addImage(outCanvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, captureWidth, outHeightCss);
      downloadUrl = pdf.output('datauristring');
      ext = 'pdf';
    }

    return { downloadUrl, ext };
}

// ── Capture orchestrator ─────────────────────────────────────────────────────
async function capture(format) {
  showCapturing();
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const tabId = tab.id;
    const siteRoot = siteRootFromUrl(tab.url || '');

    let result;
    try {
      // Preferred: single-shot full-page render (handles animation/parallax/video).
      result = await TabSnapEngine.captureSingleShot(tabId, format, { mobile: false });
    } catch (e) {
      // Pages the debugger can't attach to (chrome://, Web Store, DevTools open)
      // or any single-shot failure fall back to the scroll-and-stitch engine.
      console.warn('TabSnap: single-shot capture failed, using stitch fallback:', e);
      showCapturing();
      result = await captureStitch(tabId, format);
    }

    await finalizeDownload(format, result.ext, result.downloadUrl, siteRoot);
  } catch (err) {
    showError(err.message || 'Something went wrong. Try reloading the page.');
  }
}

// ── Init ───────────────────────────────────────────────────────────────────
showIdle();
