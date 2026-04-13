/* global jspdf */

// ── jsPDF ──────────────────────────────────────────────────────────────────
const { jsPDF } = window.jspdf;

// ── DOM refs ───────────────────────────────────────────────────────────────
const idleView      = document.getElementById('idle-view');
const capturingView = document.getElementById('capturing-view');
const doneView      = document.getElementById('done-view');
const errorView     = document.getElementById('error-view');
const progressBar   = document.getElementById('progress-bar');
const progressText  = document.getElementById('progress-text');
const filenameText  = document.getElementById('filename-text');
const errorText     = document.getElementById('error-text');

// ── UI state ───────────────────────────────────────────────────────────────
function showIdle() {
  idleView.hidden      = false;
  capturingView.hidden = true;
  doneView.hidden      = true;
  errorView.hidden     = true;
}
function showCapturing() {
  idleView.hidden      = true;
  capturingView.hidden = false;
  doneView.hidden      = true;
  errorView.hidden     = true;
  progressBar.style.width = '0%';
  progressText.textContent = 'Preparing…';
}
function showDone(filename) {
  idleView.hidden      = true;
  capturingView.hidden = true;
  doneView.hidden      = false;
  errorView.hidden     = true;
  filenameText.textContent = filename;
}
function showError(msg) {
  idleView.hidden      = true;
  capturingView.hidden = true;
  doneView.hidden      = true;
  errorView.hidden     = false;
  errorText.textContent = msg;
}

// ── Event listeners ────────────────────────────────────────────────────────
document.getElementById('btn-png').addEventListener('click', () => capture('png'));
document.getElementById('btn-jpg').addEventListener('click', () => capture('jpg'));
document.getElementById('btn-pdf').addEventListener('click', () => capture('pdf'));
document.getElementById('btn-again').addEventListener('click', showIdle);
document.getElementById('btn-retry').addEventListener('click', showIdle);

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
  return `${yyyy}-${mo}-${dd}-${hh}${mm}`;
}

// ── Capture ────────────────────────────────────────────────────────────────
async function capture(format) {
  showCapturing();

  try {
    // 1. Active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // 2. Page dimensions + current scroll position
    const [{ result: dims }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
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

    // 3. Canvas size guard (browser canvas limit ~16384px in either dimension)
    if (scrollHeight * dpr > 16384 || scrollWidth * dpr > 16384) {
      showError(`Page dimensions exceed canvas limits (${scrollWidth}×${scrollHeight}px @${dpr}x). Try zooming out the page first.`);
      return;
    }

    // 4. Stitching canvas
    const canvas = document.createElement('canvas');
    canvas.width  = scrollWidth  * dpr;
    canvas.height = scrollHeight * dpr;
    const ctx = canvas.getContext('2d');

    // 5. Scroll-capture loop
    const steps = Math.ceil(scrollHeight / viewportHeight);

    for (let i = 0; i < steps; i++) {
      const targetY = i * viewportHeight;

      // Scroll and get the actual scroll position (browser clamps at bottom)
      const [{ result: actualY }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (x, y) => { window.scrollTo(x, y); return window.scrollY; },
        args:  [0, targetY],
      });

      // Wait for layout / lazy-load settle
      await delay(150);

      // Capture visible area
      const dataUrl = await chrome.tabs.captureVisibleTab({ format: 'png' });

      // Draw chunk at the actual scroll position, clipping to canvas bounds
      const img  = await loadImage(dataUrl);
      const drawY = actualY * dpr;
      const srcH  = Math.min(img.naturalHeight, canvas.height - drawY);
      ctx.drawImage(img, 0, 0, img.naturalWidth, srcH, 0, drawY, img.naturalWidth, srcH);

      // Update progress bar
      const pct = Math.round(((i + 1) / steps) * 100);
      progressBar.style.width = pct + '%';
      progressText.textContent = `Capturing… ${i + 1} of ${steps}`;
    }

    // 6. Restore original scroll position
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func:   (x, y) => window.scrollTo(x, y),
      args:   [origX, origY],
    });

    // 7. Export — yield to browser to repaint before blocking toDataURL/jsPDF calls
    progressText.textContent = 'Encoding…';
    await delay(0);
    const ts = formatTimestamp();
    let downloadUrl, filename;

    if (format === 'png') {
      downloadUrl = canvas.toDataURL('image/png');
      filename    = `tabsnap-${ts}.png`;

    } else if (format === 'jpg') {
      downloadUrl = canvas.toDataURL('image/jpeg', 0.92);
      filename    = `tabsnap-${ts}.jpg`;

    } else {
      // PDF — orient by aspect ratio, fit image to page
      const orientation = scrollHeight > scrollWidth ? 'portrait' : 'landscape';
      const pdf = new jsPDF({
        orientation,
        unit:   'px',
        format: [scrollWidth, scrollHeight],
        hotfixes: ['px_scaling'],
      });
      const jpegUrl = canvas.toDataURL('image/jpeg', 0.92);
      pdf.addImage(jpegUrl, 'JPEG', 0, 0, scrollWidth, scrollHeight);
      downloadUrl = pdf.output('datauristring');
      filename    = `tabsnap-${ts}.pdf`;
    }

    // 8. Download
    await chrome.downloads.download({ url: downloadUrl, filename });

    showDone(filename);

  } catch (err) {
    showError(err.message || 'Something went wrong. Try reloading the page.');
  }
}
