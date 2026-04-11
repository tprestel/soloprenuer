/* TubeScrapeBoogie — Dashboard Application (IIFE) */
/* No ES modules — extension page consistent with sidebar pattern */
(function () {
  'use strict';

  // ─── Storage Keys ─────────────────────────────────────────────
  const KEYS = {
    transcripts: 'tsb_transcripts',
    folders:     'tsb_folders',
    keywords:    'tsb_keywords',
    settings:    'tsb_settings',
  };

  // ─── Stop Words (for analytics word frequency) ─────────────────
  const STOP_WORDS = new Set([
    'a','an','the','and','or','but','in','on','at','to','for','of','with',
    'by','from','as','is','was','are','were','be','been','being','have',
    'has','had','do','does','did','will','would','could','should','may',
    'might','shall','can','need','dare','ought','used','i','me','my',
    'myself','we','our','ours','ourselves','you','your','yours','yourself',
    'yourselves','he','him','his','himself','she','her','hers','herself',
    'it','its','itself','they','them','their','theirs','themselves','what',
    'which','who','whom','this','that','these','those','am','not','no',
    'nor','so','yet','both','either','neither','each','few','more','most',
    'other','some','such','than','too','very','just','because','if','when',
    'where','how','all','any','both','much','now','up','out','also','then',
    'into','about','over','after','before','like','get','got','go','going',
    'one','two','three','there','here','really','actually','just','even',
    'still','back','well','know','think','ve','re','ll','don','isn','aren',
    'wasn','weren','won','wouldn','couldn','didn','doesn','hadn','hasn','em',
  ]);

  // ─── App State ────────────────────────────────────────────────
  const state = {
    transcripts: {},       // videoId → transcript object
    folders:     [],       // [{id, name}]
    keywords:    [],       // [{id, term, color}]
    settings:    {},
    activeView:  'library',
    activeFolder: 'all',
    libSearch:   '',
    libSort:     'date_saved',
    detailId:    null,
    prevView:    'library',
    batchRunning: false,
    toastTimer:  null,
    notes:       {},       // videoId → [{id, timestamp, text}]
  };

  // ─── Helpers ──────────────────────────────────────────────────
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
      });
    } catch { return dateStr; }
  }

  function formatViews(n) {
    if (!n) return '';
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M views';
    if (n >= 1_000)     return Math.round(n / 1_000) + 'K views';
    return n.toLocaleString() + ' views';
  }

  function formatTimestamp(seconds) {
    const t = Math.floor(seconds);
    const h = Math.floor(t / 3600);
    const m = Math.floor((t % 3600) / 60);
    const s = t % 60;
    if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    return `${m}:${String(s).padStart(2,'0')}`;
  }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function hex2rgba(hex, alpha = 0.18) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  function extractVideoId(url) {
    try {
      const u = new URL(url);
      if (u.hostname === 'youtu.be') return u.pathname.slice(1);
      return u.searchParams.get('v') || null;
    } catch { return null; }
  }

  function extractPlaylistId(url) {
    try {
      return new URL(url).searchParams.get('list') || null;
    } catch { return null; }
  }

  function isChannelUrl(url) {
    return /youtube\.com\/@|youtube\.com\/channel\/|youtube\.com\/user\/|youtube\.com\/c\//.test(url);
  }

  function countKeywordsInTranscript(transcript, keywords) {
    if (!transcript.segments || !keywords.length) return 0;
    const text = transcript.segments.map(s => s.text).join(' ').toLowerCase();
    return keywords.reduce((sum, kw) => {
      const re = new RegExp(escapeRegex(kw.term.toLowerCase()), 'g');
      const matches = text.match(re);
      return sum + (matches ? matches.length : 0);
    }, 0);
  }

  function getTranscriptText(transcript) {
    if (!transcript || !transcript.segments) return '';
    return transcript.segments.map(s => s.text).join(' ');
  }

  // ─── Toast ────────────────────────────────────────────────────
  function toast(msg, type = '') {
    const el = document.getElementById('tsb-dash-toast');
    el.textContent = msg;
    el.className = 'tsb-toast-show' + (type ? ` tsb-toast-${type}` : '');
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => {
      el.className = '';
    }, 3000);
  }

  // ─── Storage ──────────────────────────────────────────────────
  // chromeGet / chromeSet are safe wrappers — gracefully degrade when
  // the chrome extension APIs are not available (e.g. during local preview).
  function chromeGet(keys) {
    if (typeof chrome === 'undefined' || !chrome.storage) return Promise.resolve({});
    return chrome.storage.local.get(keys);
  }

  function chromeSet(obj) {
    if (typeof chrome === 'undefined' || !chrome.storage) return Promise.resolve();
    return chrome.storage.local.set(obj);
  }

  async function loadAll() {
    const result = await chromeGet([
      KEYS.transcripts, KEYS.folders, KEYS.keywords, KEYS.settings,
    ]);
    state.transcripts = result[KEYS.transcripts] || {};
    state.folders     = result[KEYS.folders]     || [];
    state.keywords    = result[KEYS.keywords]    || [];
    state.settings    = result[KEYS.settings]    || {};

    // Load notes (stored under a separate key)
    const noteResult = await chromeGet('tsb_notes');
    state.notes = noteResult['tsb_notes'] || {};
  }

  async function saveTranscripts() {
    await chromeSet({ [KEYS.transcripts]: state.transcripts });
  }

  async function saveFolders() {
    await chromeSet({ [KEYS.folders]: state.folders });
  }

  async function saveKeywords() {
    await chromeSet({ [KEYS.keywords]: state.keywords });
  }

  async function saveNotes() {
    await chromeSet({ 'tsb_notes': state.notes });
  }

  // ─── View Navigation ──────────────────────────────────────────
  function switchView(viewId, pushHistory = true) {
    // Hide all views
    document.querySelectorAll('.tsb-view').forEach(v => {
      v.classList.add('tsb-hidden');
      v.classList.remove('tsb-view-active');
    });
    // Show target
    const target = document.getElementById(`tsb-view-${viewId}`);
    if (target) {
      target.classList.remove('tsb-hidden');
      target.classList.add('tsb-view-active');
    }
    // Update tabs (not for detail view)
    if (viewId !== 'detail') {
      document.querySelectorAll('.tsb-tab').forEach(tab => {
        const active = tab.dataset.view === viewId;
        tab.classList.toggle('tsb-tab-active', active);
        tab.setAttribute('aria-selected', active);
      });
      state.prevView = state.activeView !== 'detail' ? state.activeView : state.prevView;
    }
    state.activeView = viewId;
  }

  // ─── Folder Sidebar ───────────────────────────────────────────
  function renderFolders() {
    const list = document.getElementById('tsb-folder-list');
    const transcriptList = Object.values(state.transcripts);

    // Update "All" count
    const allCount = document.getElementById('tsb-folder-all-count');
    if (allCount) allCount.textContent = transcriptList.length;

    // Remove existing user folder items
    list.querySelectorAll('[data-folder-id]:not([data-folder-id="all"])').forEach(el => el.remove());

    state.folders.forEach(folder => {
      const count = transcriptList.filter(t => (t.folders || []).includes(folder.id)).length;
      const li = document.createElement('li');
      li.className = 'tsb-folder-item' + (state.activeFolder === folder.id ? ' tsb-folder-active' : '');
      li.dataset.folderId = folder.id;
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', state.activeFolder === folder.id);
      li.innerHTML = `
        <svg class="tsb-folder-icon" viewBox="0 0 24 24">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
        </svg>
        <span>${escapeHtml(folder.name)}</span>
        <span class="tsb-folder-count">${count}</span>
        <button class="tsb-folder-delete" data-folder-id="${folder.id}" title="Delete collection" aria-label="Delete ${escapeHtml(folder.name)}">
          <svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      `;
      li.addEventListener('click', (e) => {
        if (e.target.closest('.tsb-folder-delete')) return;
        setActiveFolder(folder.id);
      });
      li.querySelector('.tsb-folder-delete').addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!confirm(`Delete collection "${folder.name}"?`)) return;
        state.folders = state.folders.filter(f => f.id !== folder.id);
        await saveFolders();
        if (state.activeFolder === folder.id) setActiveFolder('all');
        else renderFolders();
        toast('Collection deleted');
      });
      list.appendChild(li);
    });

    // Sync active state on "All"
    const allItem = list.querySelector('[data-folder-id="all"]');
    if (allItem) {
      allItem.classList.toggle('tsb-folder-active', state.activeFolder === 'all');
      allItem.setAttribute('aria-selected', state.activeFolder === 'all');
    }
  }

  function setActiveFolder(folderId) {
    state.activeFolder = folderId;
    renderFolders();
    renderLibrary();
  }

  // ─── Library View ─────────────────────────────────────────────
  function getFilteredTranscripts() {
    let list = Object.values(state.transcripts);

    // Folder filter
    if (state.activeFolder !== 'all') {
      list = list.filter(t => (t.folders || []).includes(state.activeFolder));
    }

    // Search filter
    if (state.libSearch) {
      const q = state.libSearch.toLowerCase();
      list = list.filter(t => {
        const title   = (t.metadata?.title   || '').toLowerCase();
        const channel = (t.metadata?.channel || '').toLowerCase();
        const tags    = (t.tags || []).join(' ').toLowerCase();
        const text    = getTranscriptText(t).toLowerCase();
        return title.includes(q) || channel.includes(q) || tags.includes(q) || text.includes(q);
      });
    }

    // Sort
    list.sort((a, b) => {
      switch (state.libSort) {
        case 'date_saved':
          return (b.savedAt || 0) - (a.savedAt || 0);
        case 'date_published':
          return new Date(b.metadata?.publishDate || 0) - new Date(a.metadata?.publishDate || 0);
        case 'channel':
          return (a.metadata?.channel || '').localeCompare(b.metadata?.channel || '');
        case 'keyword_matches':
          return countKeywordsInTranscript(b, state.keywords) - countKeywordsInTranscript(a, state.keywords);
        default:
          return 0;
      }
    });

    return list;
  }

  function renderLibrary() {
    const grid  = document.getElementById('tsb-lib-grid');
    const empty = document.getElementById('tsb-lib-empty');
    const list  = getFilteredTranscripts();

    // Update nav count
    const countEl = document.getElementById('tsb-dash-count');
    if (countEl) {
      const total = Object.keys(state.transcripts).length;
      countEl.textContent = `${total} transcript${total !== 1 ? 's' : ''}`;
    }

    grid.innerHTML = '';

    if (list.length === 0) {
      empty.classList.remove('tsb-hidden');
      return;
    }
    empty.classList.add('tsb-hidden');

    list.forEach((transcript, i) => {
      const card = buildTranscriptCard(transcript, i);
      grid.appendChild(card);
    });
  }

  function buildTranscriptCard(transcript, animIndex = 0) {
    const meta      = transcript.metadata || {};
    const tags      = transcript.tags || [];
    const kwCount   = countKeywordsInTranscript(transcript, state.keywords);
    const savedDate = transcript.savedAt ? formatDate(new Date(transcript.savedAt).toISOString()) : '';
    const pubDate   = meta.publishDate ? formatDate(meta.publishDate) : '';

    const card = document.createElement('div');
    card.className = 'tsb-transcript-card';
    card.style.animationDelay = `${animIndex * 40}ms`;
    card.dataset.id = transcript.id;

    card.innerHTML = `
      <div class="tsb-card-title">${escapeHtml(meta.title || transcript.id)}</div>
      <div class="tsb-card-channel">${escapeHtml(meta.channel || 'Unknown channel')}</div>
      <div class="tsb-card-meta">
        ${savedDate ? `<span class="tsb-card-date">Saved ${escapeHtml(savedDate)}</span>` : ''}
        ${pubDate ? `<span class="tsb-card-date">${escapeHtml(pubDate)}</span>` : ''}
        ${kwCount > 0 ? `<span class="tsb-card-keywords"><span class="tsb-card-kw-badge">${kwCount} keyword${kwCount !== 1 ? 's' : ''}</span></span>` : ''}
      </div>
      ${tags.length ? `<div class="tsb-card-tags">${tags.map(t => `<span class="tsb-tag-chip">${escapeHtml(t)}</span>`).join('')}</div>` : ''}
    `;

    card.addEventListener('click', () => openDetail(transcript.id));
    return card;
  }

  // ─── Detail View ──────────────────────────────────────────────
  function openDetail(videoId) {
    state.detailId = videoId;
    state.prevView = state.activeView;
    renderDetail();
    switchView('detail', false);
  }

  function renderDetail() {
    const id = state.detailId;
    if (!id) return;

    const transcript = state.transcripts[id];
    if (!transcript) {
      toast('Transcript not found', 'error');
      return;
    }

    const meta = transcript.metadata || {};

    // Title
    document.getElementById('tsb-detail-title').textContent = meta.title || id;

    // Info line
    const infoEl = document.getElementById('tsb-detail-info');
    const infoParts = [];
    if (meta.channel) infoParts.push(`<span class="tsb-channel">${escapeHtml(meta.channel)}</span>`);
    if (meta.publishDate) infoParts.push(escapeHtml(formatDate(meta.publishDate)));
    if (meta.viewCount)   infoParts.push(escapeHtml(formatViews(meta.viewCount)));
    infoEl.innerHTML = infoParts.join('<span style="opacity:0.3"> · </span>');

    // Tags
    renderDetailTags();

    // Word count
    const text = getTranscriptText(transcript);
    const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
    const wcEl = document.getElementById('tsb-detail-word-count');
    if (wcEl) wcEl.textContent = wordCount.toLocaleString() + ' words';

    // Transcript
    renderDetailTranscript(transcript);

    // Notes
    renderNotes(id);
  }

  function renderDetailTags() {
    const id = state.detailId;
    const transcript = state.transcripts[id];
    if (!transcript) return;

    const tags    = transcript.tags || [];
    const listEl  = document.getElementById('tsb-detail-tags');
    listEl.innerHTML = '';

    tags.forEach(tag => {
      const span = document.createElement('span');
      span.className = 'tsb-tag-item';
      span.innerHTML = `${escapeHtml(tag)}<button class="tsb-tag-remove" data-tag="${escapeHtml(tag)}" title="Remove tag">×</button>`;
      span.querySelector('.tsb-tag-remove').addEventListener('click', async () => {
        transcript.tags = (transcript.tags || []).filter(t => t !== tag);
        await saveTranscripts();
        renderDetailTags();
        renderLibrary();
        toast('Tag removed');
      });
      listEl.appendChild(span);
    });
  }

  function renderDetailTranscript(transcript) {
    const container = document.getElementById('tsb-detail-transcript');
    container.innerHTML = '';

    const segments = transcript.segments || [];
    if (!segments.length) {
      container.textContent = 'No transcript segments available.';
      return;
    }

    const keywords = state.keywords;

    segments.forEach(seg => {
      const row = document.createElement('div');
      row.className = 'tsb-transcript-segment';

      const ts = document.createElement('span');
      ts.className = 'tsb-segment-ts';
      ts.textContent = formatTimestamp(seg.start || 0);

      const textEl = document.createElement('span');
      textEl.className = 'tsb-segment-text';

      // Apply keyword highlighting
      let html = escapeHtml(seg.text || '');
      if (keywords.length) {
        keywords.forEach(kw => {
          const re = new RegExp(`(${escapeRegex(escapeHtml(kw.term))})`, 'gi');
          const bg = hex2rgba(kw.color, 0.25);
          html = html.replace(re, `<mark class="tsb-kw-highlight" style="background:${bg};color:${kw.color}">$1</mark>`);
        });
      }
      textEl.innerHTML = html;

      row.appendChild(ts);
      row.appendChild(textEl);
      container.appendChild(row);
    });
  }

  function renderNotes(videoId) {
    const notes  = state.notes[videoId] || [];
    const listEl = document.getElementById('tsb-notes-list');
    listEl.innerHTML = '';

    if (!notes.length) {
      listEl.innerHTML = '<p class="tsb-notes-empty">No notes yet. Add your first note below.</p>';
      return;
    }

    notes.forEach((note, i) => {
      const item = document.createElement('div');
      item.className = 'tsb-note-item';
      item.innerHTML = `
        ${note.timestamp ? `<div class="tsb-note-ts">@ ${escapeHtml(note.timestamp)}</div>` : ''}
        <div class="tsb-note-text">${escapeHtml(note.text)}</div>
        <button class="tsb-note-delete" data-index="${i}" title="Delete note">×</button>
      `;
      item.querySelector('.tsb-note-delete').addEventListener('click', async () => {
        const list = state.notes[videoId] || [];
        list.splice(i, 1);
        state.notes[videoId] = list;
        await saveNotes();
        renderNotes(videoId);
        toast('Note deleted');
      });
      listEl.appendChild(item);
    });
  }

  // ─── Batch View ───────────────────────────────────────────────
  function parseBatchUrls(raw) {
    return raw.split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map(url => {
        const videoId   = extractVideoId(url);
        const playlistId = extractPlaylistId(url);
        const isChannel  = isChannelUrl(url);

        let type = 'unknown';
        if (videoId) type = 'video';
        else if (playlistId) type = 'playlist';
        else if (isChannel) type = 'channel';

        return { url, type, videoId, playlistId, status: 'pending', label: url };
      });
  }

  function renderBatchRow(item) {
    const row = document.createElement('div');
    row.className = 'tsb-batch-result-row';
    row.dataset.url = item.url;
    row.innerHTML = `
      <span class="tsb-batch-status tsb-pending"></span>
      <span class="tsb-batch-result-type">${escapeHtml(item.type)}</span>
      <span class="tsb-batch-label">${escapeHtml(item.label)}</span>
      <span class="tsb-batch-url">${escapeHtml(item.url)}</span>
    `;
    return row;
  }

  function updateBatchRowStatus(row, status, label) {
    const dot = row.querySelector('.tsb-batch-status');
    dot.className = `tsb-batch-status tsb-${status}`;
    if (label) {
      const labelEl = row.querySelector('.tsb-batch-label');
      if (labelEl) labelEl.textContent = label;
    }
  }

  async function runBatch() {
    if (state.batchRunning) return;
    const textarea = document.getElementById('tsb-batch-input');
    const raw = textarea.value.trim();
    if (!raw) {
      toast('Paste at least one URL', 'error');
      return;
    }

    const items = parseBatchUrls(raw);
    if (!items.length) {
      toast('No valid URLs found', 'error');
      return;
    }

    // Filter to video items only (playlist/channel support is a future enhancement)
    const videoItems = items.filter(item => item.type === 'video' && item.videoId);
    const unsupported = items.filter(item => item.type !== 'video' || !item.videoId);

    state.batchRunning = true;
    const scrapeBtn = document.getElementById('tsb-batch-scrape-btn');
    scrapeBtn.disabled = true;
    scrapeBtn.textContent = 'Running…';

    const resultsEl = document.getElementById('tsb-batch-results');
    resultsEl.innerHTML = '';

    // Render all rows first
    const rowMap = new Map();
    [...videoItems, ...unsupported].forEach(item => {
      const row = renderBatchRow(item);
      resultsEl.appendChild(row);
      rowMap.set(item.url, row);
    });

    // Mark unsupported
    unsupported.forEach(item => {
      const row = rowMap.get(item.url);
      updateBatchRowStatus(row, 'error', `Unsupported: ${item.type} URLs coming soon`);
    });

    // Show progress
    const progressEl = document.getElementById('tsb-batch-progress');
    const fillEl     = document.getElementById('tsb-batch-progress-fill');
    const textEl     = document.getElementById('tsb-batch-progress-text');
    progressEl.classList.remove('tsb-hidden');

    let done = 0;
    const total = videoItems.length;

    function updateProgress() {
      const pct = total ? Math.round((done / total) * 100) : 0;
      fillEl.style.width = pct + '%';
      textEl.textContent = `${done} / ${total}`;
    }
    updateProgress();

    for (const item of videoItems) {
      const row = rowMap.get(item.url);
      updateBatchRowStatus(row, 'loading', 'Fetching…');

      try {
        // Fetch video metadata + caption tracks
        const videoData = await new Promise((resolve, reject) => {
          chrome.runtime.sendMessage({ type: 'FETCH_VIDEO_DATA', videoId: item.videoId }, res => {
            if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
            if (res?.error) return reject(new Error(res.error));
            resolve(res);
          });
        });

        const captionTracks = videoData.captionTracks || [];
        // Prefer English, fallback to first track
        const track = captionTracks.find(t => t.languageCode === 'en' && !t.isAutoGenerated)
          || captionTracks.find(t => t.languageCode === 'en')
          || captionTracks[0];

        if (!track) {
          updateBatchRowStatus(row, 'error', `No captions: ${videoData.metadata?.title || item.videoId}`);
          done++;
          updateProgress();
          continue;
        }

        // Fetch transcript segments
        const transcriptRes = await new Promise((resolve, reject) => {
          chrome.runtime.sendMessage({ type: 'FETCH_TRANSCRIPT', captionUrl: track.url }, res => {
            if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
            if (res?.error) return reject(new Error(res.error));
            resolve(res);
          });
        });

        // Save transcript
        const transcript = {
          id: item.videoId,
          metadata: videoData.metadata,
          segments: transcriptRes.segments,
          captionTracks,
          tags: [],
          folders: [],
          savedAt: Date.now(),
        };
        state.transcripts[item.videoId] = transcript;
        await saveTranscripts();

        updateBatchRowStatus(row, 'success', videoData.metadata?.title || item.videoId);
      } catch (err) {
        updateBatchRowStatus(row, 'error', `Error: ${err.message}`);
      }

      done++;
      updateProgress();
    }

    // Re-render library so new cards appear
    renderLibrary();
    renderFolders();

    state.batchRunning = false;
    scrapeBtn.disabled = false;
    scrapeBtn.innerHTML = `
      <svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
      Scrape All
    `;
    toast(`Completed: ${done} / ${total} videos`, done === total ? 'success' : '');
  }

  // ─── Keywords View ─────────────────────────────────────────────
  function renderKeywords() {
    renderKeywordChips();
    renderKeywordChart();
    const empty = document.getElementById('tsb-keywords-empty');
    if (empty) {
      empty.classList.toggle('tsb-hidden', state.keywords.length > 0);
    }
  }

  function renderKeywordChips() {
    const container = document.getElementById('tsb-keyword-chips');
    container.innerHTML = '';

    state.keywords.forEach(kw => {
      const chip = document.createElement('span');
      chip.className = 'tsb-keyword-chip';
      chip.style.background = hex2rgba(kw.color, 0.15);
      chip.style.color       = kw.color;
      chip.style.borderColor = hex2rgba(kw.color, 0.3);
      chip.innerHTML = `
        ${escapeHtml(kw.term)}
        <button class="tsb-keyword-chip-remove" data-id="${kw.id}" title="Remove keyword" aria-label="Remove ${escapeHtml(kw.term)}">×</button>
      `;
      chip.querySelector('.tsb-keyword-chip-remove').addEventListener('click', async () => {
        state.keywords = state.keywords.filter(k => k.id !== kw.id);
        await saveKeywords();
        renderKeywords();
        toast(`Removed "${kw.term}"`);
      });
      container.appendChild(chip);
    });
  }

  function renderKeywordChart() {
    const container = document.getElementById('tsb-keyword-chart');
    container.innerHTML = '';

    if (!state.keywords.length) return;

    const transcripts = Object.values(state.transcripts);
    if (!transcripts.length) return;

    const allText = transcripts.map(t => getTranscriptText(t)).join(' ').toLowerCase();

    const counts = state.keywords.map(kw => {
      const re = new RegExp(escapeRegex(kw.term.toLowerCase()), 'g');
      const matches = allText.match(re);
      return { kw, count: matches ? matches.length : 0 };
    }).sort((a, b) => b.count - a.count);

    const max = counts[0]?.count || 1;

    counts.forEach(({ kw, count }, i) => {
      const row = document.createElement('div');
      row.className = 'tsb-freq-row';
      row.style.animationDelay = `${i * 50}ms`;
      row.innerHTML = `
        <span class="tsb-freq-label">${escapeHtml(kw.term)}</span>
        <div class="tsb-freq-bar-wrap">
          <div class="tsb-freq-bar tsb-keyword-bar" style="--tsb-keyword-color:${kw.color}"></div>
        </div>
        <span class="tsb-freq-count">${count.toLocaleString()}</span>
      `;
      container.appendChild(row);

      // Animate after paint
      requestAnimationFrame(() => {
        const bar = row.querySelector('.tsb-freq-bar');
        bar.style.width = (max > 0 ? (count / max) * 100 : 0) + '%';
      });
    });
  }

  // ─── Analytics View ───────────────────────────────────────────
  function renderAnalytics() {
    renderTopWords();
    renderChannelDensity();
  }

  function getWordFrequency(text, topN = 30) {
    const words = text.toLowerCase().match(/[a-z']{3,}/g) || [];
    const freq = {};
    words.forEach(w => {
      if (STOP_WORDS.has(w)) return;
      freq[w] = (freq[w] || 0) + 1;
    });
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN)
      .map(([word, count]) => ({ word, count }));
  }

  function renderTopWords() {
    const container = document.getElementById('tsb-top-words-chart');
    const emptyEl   = document.getElementById('tsb-analytics-empty');
    container.innerHTML = '';

    const transcripts = Object.values(state.transcripts);
    if (!transcripts.length) {
      if (emptyEl) emptyEl.classList.remove('tsb-hidden');
      return;
    }
    if (emptyEl) emptyEl.classList.add('tsb-hidden');

    const allText = transcripts.map(t => getTranscriptText(t)).join(' ');
    const topWords = getWordFrequency(allText, 25);
    const max = topWords[0]?.count || 1;

    topWords.forEach(({ word, count }, i) => {
      const row = document.createElement('div');
      row.className = 'tsb-freq-row';
      row.style.animationDelay = `${i * 30}ms`;
      row.innerHTML = `
        <span class="tsb-freq-label">${escapeHtml(word)}</span>
        <div class="tsb-freq-bar-wrap">
          <div class="tsb-freq-bar"></div>
        </div>
        <span class="tsb-freq-count">${count.toLocaleString()}</span>
      `;
      container.appendChild(row);

      requestAnimationFrame(() => {
        const bar = row.querySelector('.tsb-freq-bar');
        bar.style.width = ((count / max) * 100) + '%';
      });
    });
  }

  function renderChannelDensity() {
    const container = document.getElementById('tsb-channel-density');
    container.innerHTML = '';

    if (!state.keywords.length) {
      container.innerHTML = '<p class="tsb-notes-empty" style="color:var(--tsb-text-muted);font-size:12px;padding:16px;">Add keywords to see density by channel.</p>';
      return;
    }

    const transcripts = Object.values(state.transcripts);
    if (!transcripts.length) return;

    // Group by channel
    const byChannel = {};
    transcripts.forEach(t => {
      const channel = t.metadata?.channel || 'Unknown';
      if (!byChannel[channel]) byChannel[channel] = [];
      byChannel[channel].push(t);
    });

    Object.entries(byChannel).forEach(([channel, channelTranscripts], i) => {
      const allText = channelTranscripts.map(t => getTranscriptText(t)).join(' ').toLowerCase();

      const kwCounts = state.keywords.map(kw => {
        const re = new RegExp(escapeRegex(kw.term.toLowerCase()), 'g');
        const matches = allText.match(re);
        return { kw, count: matches ? matches.length : 0 };
      }).filter(x => x.count > 0).sort((a, b) => b.count - a.count);

      const card = document.createElement('div');
      card.className = 'tsb-channel-density-card';
      card.style.animationDelay = `${i * 50}ms`;

      let rowsHtml = kwCounts.length
        ? kwCounts.map(({ kw, count }) => `
            <div class="tsb-channel-kw-row">
              <span class="tsb-channel-kw-name" style="color:${kw.color}">${escapeHtml(kw.term)}</span>
              <span class="tsb-channel-kw-count">${count.toLocaleString()}</span>
            </div>
          `).join('')
        : '<p style="font-size:11px;color:var(--tsb-text-muted)">No keyword matches</p>';

      card.innerHTML = `
        <div class="tsb-channel-density-name">${escapeHtml(channel)}</div>
        <div>${rowsHtml}</div>
      `;
      container.appendChild(card);
    });
  }

  // ─── Export ────────────────────────────────────────────────────
  function exportTranscript(format) {
    const transcript = state.transcripts[state.detailId];
    if (!transcript) return;
    const meta = transcript.metadata || {};
    const segments = transcript.segments || [];

    let content = '';
    let mimeType = 'text/plain';
    let ext = 'txt';

    if (format === 'markdown') {
      const lines = [
        `# ${meta.title || transcript.id}`,
        '',
        `**Channel:** ${meta.channel || 'Unknown'}`,
        meta.publishDate ? `**Published:** ${formatDate(meta.publishDate)}` : '',
        meta.viewCount ? `**Views:** ${formatViews(meta.viewCount)}` : '',
        '',
        '---',
        '',
        '## Transcript',
        '',
        ...segments.map(s => `**${formatTimestamp(s.start || 0)}** — ${s.text}`),
      ].filter(l => l !== null);
      content = lines.join('\n');
      mimeType = 'text/markdown';
      ext = 'md';
    } else if (format === 'txt') {
      content = segments.map(s => `[${formatTimestamp(s.start || 0)}] ${s.text}`).join('\n');
    } else if (format === 'json') {
      content = JSON.stringify(transcript, null, 2);
      mimeType = 'application/json';
      ext = 'json';
    } else if (format === 'csv') {
      const rows = [['timestamp_seconds', 'timestamp', 'text']];
      segments.forEach(s => {
        rows.push([s.start || 0, formatTimestamp(s.start || 0), `"${(s.text || '').replace(/"/g, '""')}"`]);
      });
      content = rows.map(r => r.join(',')).join('\n');
      mimeType = 'text/csv';
      ext = 'csv';
    }

    const blob = new Blob([content], { type: mimeType });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${(meta.title || transcript.id).replace(/[^a-z0-9]+/gi, '-')}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    toast(`Exported as .${ext}`, 'success');
  }

  // ─── Wire Up Events ────────────────────────────────────────────
  function bindEvents() {
    // Tab navigation
    document.querySelectorAll('.tsb-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        switchView(view);
        if (view === 'library')   renderLibrary();
        if (view === 'keywords')  renderKeywords();
        if (view === 'analytics') renderAnalytics();
      });
    });

    // Folder: All
    const allFolderItem = document.querySelector('[data-folder-id="all"]');
    if (allFolderItem) {
      allFolderItem.addEventListener('click', () => setActiveFolder('all'));
    }

    // Add folder button
    document.getElementById('tsb-add-folder-btn').addEventListener('click', () => {
      const form = document.getElementById('tsb-add-folder-form');
      form.classList.toggle('tsb-hidden');
      if (!form.classList.contains('tsb-hidden')) {
        document.getElementById('tsb-folder-name-input').focus();
      }
    });

    document.getElementById('tsb-folder-save-btn').addEventListener('click', async () => {
      const input = document.getElementById('tsb-folder-name-input');
      const name  = input.value.trim();
      if (!name) return;
      const folder = { id: generateId(), name };
      state.folders.push(folder);
      await saveFolders();
      input.value = '';
      document.getElementById('tsb-add-folder-form').classList.add('tsb-hidden');
      renderFolders();
      toast(`Collection "${name}" created`, 'success');
    });

    document.getElementById('tsb-folder-cancel-btn').addEventListener('click', () => {
      document.getElementById('tsb-add-folder-form').classList.add('tsb-hidden');
      document.getElementById('tsb-folder-name-input').value = '';
    });

    document.getElementById('tsb-folder-name-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('tsb-folder-save-btn').click();
      if (e.key === 'Escape') document.getElementById('tsb-folder-cancel-btn').click();
    });

    // Library search
    document.getElementById('tsb-lib-search').addEventListener('input', (e) => {
      state.libSearch = e.target.value;
      renderLibrary();
    });

    // Library sort
    document.getElementById('tsb-lib-sort').addEventListener('change', (e) => {
      state.libSort = e.target.value;
      renderLibrary();
    });

    // Batch scrape
    document.getElementById('tsb-batch-scrape-btn').addEventListener('click', runBatch);

    // Keywords: add
    document.getElementById('tsb-keyword-add-btn').addEventListener('click', addKeyword);
    document.getElementById('tsb-keyword-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') addKeyword();
    });

    // Detail: back
    document.getElementById('tsb-detail-back').addEventListener('click', () => {
      switchView(state.prevView);
      if (state.prevView === 'library')   renderLibrary();
      if (state.prevView === 'keywords')  renderKeywords();
      if (state.prevView === 'analytics') renderAnalytics();
    });

    // Detail: add tag
    document.getElementById('tsb-detail-add-tag-btn').addEventListener('click', () => {
      document.getElementById('tsb-tag-input-wrap').classList.toggle('tsb-hidden');
      document.getElementById('tsb-tag-input').focus();
    });

    document.getElementById('tsb-tag-add-confirm').addEventListener('click', async () => {
      await addTag();
    });

    document.getElementById('tsb-tag-input').addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') await addTag();
      if (e.key === 'Escape') {
        document.getElementById('tsb-tag-input-wrap').classList.add('tsb-hidden');
      }
    });

    document.getElementById('tsb-tag-cancel').addEventListener('click', () => {
      document.getElementById('tsb-tag-input-wrap').classList.add('tsb-hidden');
    });

    // Detail: export
    document.getElementById('tsb-detail-export-btn').addEventListener('click', () => {
      // Simple format picker via a quick dropdown
      showExportMenu();
    });

    // Detail: delete
    document.getElementById('tsb-detail-delete-btn').addEventListener('click', async () => {
      if (!confirm('Delete this transcript from your library?')) return;
      const id = state.detailId;
      delete state.transcripts[id];
      await saveTranscripts();
      switchView(state.prevView);
      renderLibrary();
      renderFolders();
      toast('Transcript deleted');
    });

    // Notes form
    document.getElementById('tsb-note-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const tsInput   = document.getElementById('tsb-note-timestamp');
      const textInput = document.getElementById('tsb-note-text');
      const text = textInput.value.trim();
      if (!text) return;

      const id = state.detailId;
      if (!state.notes[id]) state.notes[id] = [];
      state.notes[id].push({ id: generateId(), timestamp: tsInput.value.trim(), text });
      await saveNotes();
      tsInput.value = '';
      textInput.value = '';
      renderNotes(id);
      toast('Note saved', 'success');
    });
  }

  async function addKeyword() {
    const input  = document.getElementById('tsb-keyword-input');
    const colorEl = document.getElementById('tsb-keyword-color');
    const term = input.value.trim();
    if (!term) return;
    if (state.keywords.some(k => k.term.toLowerCase() === term.toLowerCase())) {
      toast('Keyword already exists', 'error');
      return;
    }
    state.keywords.push({ id: generateId(), term, color: colorEl.value });
    await saveKeywords();
    input.value = '';
    renderKeywords();
    toast(`Added "${term}"`, 'success');
  }

  async function addTag() {
    const input = document.getElementById('tsb-tag-input');
    const tag   = input.value.trim();
    if (!tag) return;

    const transcript = state.transcripts[state.detailId];
    if (!transcript) return;

    if (!transcript.tags) transcript.tags = [];
    if (transcript.tags.includes(tag)) {
      toast('Tag already exists', 'error');
      return;
    }
    transcript.tags.push(tag);
    await saveTranscripts();
    input.value = '';
    document.getElementById('tsb-tag-input-wrap').classList.add('tsb-hidden');
    renderDetailTags();
    renderLibrary();
    toast(`Tagged: ${tag}`, 'success');
  }

  function showExportMenu() {
    // Build a simple floating menu
    const existing = document.getElementById('tsb-export-dropdown');
    if (existing) { existing.remove(); return; }

    const menu = document.createElement('div');
    menu.id = 'tsb-export-dropdown';
    menu.style.cssText = `
      position: fixed;
      background: var(--tsb-bg-elevated);
      border: 1px solid var(--tsb-border);
      border-radius: 8px;
      padding: 4px;
      z-index: 300;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
      animation: tsb-view-in 150ms ease-out;
    `;

    const formats = [
      { id: 'markdown', label: 'Markdown', ext: '.md' },
      { id: 'txt',      label: 'Plain text', ext: '.txt' },
      { id: 'json',     label: 'JSON',       ext: '.json' },
      { id: 'csv',      label: 'CSV',        ext: '.csv' },
    ];

    formats.forEach(fmt => {
      const btn = document.createElement('button');
      btn.style.cssText = `
        display: flex; align-items: center; justify-content: space-between;
        gap: 16px; width: 100%; background: none; border: none;
        color: var(--tsb-text-secondary); font-family: var(--tsb-font-body);
        font-size: 13px; padding: 8px 12px; border-radius: 5px;
        cursor: pointer; text-align: left; transition: background 100ms;
      `;
      btn.innerHTML = `<span>${fmt.label}</span><span style="font-family:var(--tsb-font-mono);font-size:10px;color:var(--tsb-text-muted)">${fmt.ext}</span>`;
      btn.addEventListener('mouseover', () => btn.style.background = 'rgba(255,255,255,0.05)');
      btn.addEventListener('mouseout',  () => btn.style.background = 'none');
      btn.addEventListener('click', () => {
        exportTranscript(fmt.id);
        menu.remove();
      });
      menu.appendChild(btn);
    });

    // Position near export button
    const exportBtn = document.getElementById('tsb-detail-export-btn');
    const rect = exportBtn.getBoundingClientRect();
    menu.style.top  = (rect.bottom + 6) + 'px';
    menu.style.right = (window.innerWidth - rect.right) + 'px';

    document.body.appendChild(menu);

    // Close on outside click
    setTimeout(() => {
      document.addEventListener('click', function onClickOutside() {
        menu.remove();
        document.removeEventListener('click', onClickOutside);
      });
    }, 0);
  }

  // ─── Init ─────────────────────────────────────────────────────
  async function init() {
    await loadAll();
    bindEvents();
    renderFolders();
    renderLibrary();
  }

  // Boot
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
