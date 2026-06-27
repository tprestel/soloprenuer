(function (global) {
  function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  // Scan rows from the bottom and return the y of the last row that has real
  // (non-near-white) content. A row needs a few non-white pixels to count, so 1px
  // noise/antialiasing doesn't block the trim but a real footer/line always does.
  // Early-exits, so it only scans the trailing blank region.
  function findContentBottomPx(ctx, w, h) {
    const minHits = Math.max(2, Math.floor(w / 200));
    for (let y = h - 1; y >= 0; y--) {
      const row = ctx.getImageData(0, y, w, 1).data;
      let hits = 0;
      for (let x = 0; x < w; x++) {
        const i = x * 4;
        if (row[i + 3] > 8 && (row[i] < 245 || row[i + 1] < 245 || row[i + 2] < 245)) {
          if (++hits >= minHits) return y + 1; // this row contains content
        }
      }
    }
    return h;
  }

  // Scroll the page top→bottom→top to trigger lazy-load / scroll-reveal so the
  // single-shot capture isn't missing below-the-fold content. Best-effort.
  async function preloadByScrolling(tabId) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        func: async () => {
          const sleep = ms => new Promise(r => setTimeout(r, ms));
          const docH  = () => Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
          const vh    = window.innerHeight || 800;

          // Scroll through so lazy images / scroll-reveal animations trigger.
          let H = docH();
          for (let y = 0; y < H; y += Math.round(vh * 0.85)) {
            window.scrollTo({ top: y, left: 0, behavior: 'instant' });
            await sleep(90);
            H = docH(); // page can grow as content loads
          }
          window.scrollTo({ top: docH(), left: 0, behavior: 'instant' });

          // Wait for lazily-injected embeds (HubSpot meetings, Calendly, etc.) to
          // create AND load their iframes before we capture.
          const embedSel = '.meetings-iframe-container,[class*="hubspot"],[class*="meeting"],[class*="calendly"],[data-src*="embed"]';
          const containers = [...document.querySelectorAll(embedSel)];
          if (containers.length) {
            // Best-effort: give same-origin / fast embeds a moment to inject and
            // size their iframe. Lazy cross-origin embeds (e.g. HubSpot meetings)
            // may still not render in a single-shot capture — that's accepted.
            const deadline = Date.now() + 2000;
            while (Date.now() < deadline) {
              const pending = containers.filter(c => {
                const f = c.querySelector('iframe');
                return !f || f.getBoundingClientRect().height < 80;
              }).length;
              if (pending === 0) break;
              await sleep(250);
            }
            await sleep(500); // let embed contents paint
          }

          window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
          await sleep(200);
        },
      });
    } catch (_) { /* page may block scripting — proceed */ }
  }

  let progressFn = () => {};
  function setProgressSink(fn) { progressFn = fn || (() => {}); }
  function progress(msg) { progressFn(msg); }

  // opts: { width?:number, mobile?:boolean }
  //  - width omitted  -> use the page's live clientWidth (popup "as you see it")
  //  - width provided -> force that CSS width (batch desktop/mobile)
  async function captureSingleShot(tabId, format, opts = {}) {
    await chrome.debugger.attach({ tabId }, '1.3');
    try {
      progress('Loading page…');
      await preloadByScrolling(tabId);

      const [{ result: dims }] = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => ({
          clientWidth: document.documentElement.clientWidth,
          vpHeight: window.innerHeight,
          dpr: window.devicePixelRatio || 1,
        }),
      });
      const width = opts.width || dims.clientWidth;
      const dprBase = dims.dpr;

      await chrome.debugger.sendCommand({ tabId }, 'Emulation.setDefaultBackgroundColorOverride',
        { color: { r: 255, g: 255, b: 255, a: 1 } });

      if (opts.mobile) {
        await chrome.debugger.sendCommand({ tabId }, 'Emulation.setUserAgentOverride', {
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        });
      }

      let dsf = dprBase;
      await chrome.debugger.sendCommand({ tabId }, 'Emulation.setDeviceMetricsOverride',
        { width, height: dims.vpHeight, deviceScaleFactor: dsf, mobile: !!opts.mobile });
      await delay(250);

      const [{ result: height }] = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => document.documentElement.scrollHeight,
      });

      const tooBig = s => (width * s > 32767 || height * s > 32767 || width * s * height * s > 268000000);
      while (dsf > 1 && tooBig(dsf)) dsf = Math.max(1, dsf - 0.5);
      if (tooBig(dsf)) throw new Error(`Page too large (${width}x${height}).`);
      if (dsf !== dprBase) {
        await chrome.debugger.sendCommand({ tabId }, 'Emulation.setDeviceMetricsOverride',
          { width, height: dims.vpHeight, deviceScaleFactor: dsf, mobile: !!opts.mobile });
      }

      progress('Capturing…');
      const cdpFormat = format === 'png' ? 'png' : 'jpeg';
      const params = { format: cdpFormat, captureBeyondViewport: true, clip: { x: 0, y: 0, width, height, scale: 1 } };
      if (cdpFormat === 'jpeg') params.quality = 92;
      const shot = await chrome.debugger.sendCommand({ tabId }, 'Page.captureScreenshot', params);
      const rawUrl = `data:image/${cdpFormat};base64,${shot.data}`;

      progress('Encoding…');
      await delay(0);
      return await encodeTrimmed(rawUrl, dsf, format);
    } finally {
      try { await chrome.debugger.sendCommand({ tabId }, 'Emulation.clearDeviceMetricsOverride'); } catch (_) {}
      try { await chrome.debugger.sendCommand({ tabId }, 'Emulation.setUserAgentOverride', { userAgent: '' }); } catch (_) {}
      try { await chrome.debugger.detach({ tabId }); } catch (_) {}
    }
  }

  async function encodeTrimmed(rawUrl, dsf, format) {
    const img = await loadImage(rawUrl);
    let canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const bottom = findContentBottomPx(ctx, canvas.width, canvas.height);
    const pad = Math.round(16 * dsf);
    const trimmedH = Math.min(canvas.height, bottom + pad);
    if (trimmedH > 0 && trimmedH < canvas.height - 1) {
      const c2 = document.createElement('canvas');
      c2.width = canvas.width; c2.height = trimmedH;
      c2.getContext('2d').drawImage(canvas, 0, 0);
      canvas = c2;
    }
    const cssW = Math.round(canvas.width / dsf), cssH = Math.round(canvas.height / dsf);
    if (format === 'pdf') {
      const { jsPDF } = global.jspdf;
      const orientation = cssH > cssW ? 'portrait' : 'landscape';
      const pdf = new jsPDF({ orientation, unit: 'px', format: [cssW, cssH], hotfixes: ['px_scaling'] });
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, cssW, cssH);
      return { downloadUrl: pdf.output('datauristring'), ext: 'pdf' };
    }
    if (format === 'jpg') return { downloadUrl: canvas.toDataURL('image/jpeg', 0.92), ext: 'jpg' };
    return { downloadUrl: canvas.toDataURL('image/png'), ext: 'png' };
  }

  global.TabSnapEngine = { captureSingleShot, setProgressSink, findContentBottomPx };
  if (typeof module !== 'undefined' && module.exports) module.exports = global.TabSnapEngine;
})(typeof self !== 'undefined' ? self : globalThis);
