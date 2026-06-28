chrome.action.onClicked.addListener(async (tab) => {
  if (tab.url?.includes('youtube.com/watch')) {
    try {
      await chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_SIDEBAR' });
    } catch {
      // Content script not injected yet (tab was open before extension install).
      // Inject now, then send the toggle.
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['src/content/youtube-parser.js', 'src/content/sidebar.js'],
        });
        await chrome.scripting.insertCSS({
          target: { tabId: tab.id },
          files: ['src/content/sidebar.css'],
        });
        // Give scripts a moment to initialize
        await new Promise(resolve => setTimeout(resolve, 300));
        await chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_SIDEBAR' });
      } catch (injectErr) {
        // Injection failed — ask user to refresh the page
        chrome.action.setBadgeText({ text: '↻', tabId: tab.id });
        chrome.action.setBadgeBackgroundColor({ color: '#e8553e', tabId: tab.id });
        setTimeout(() => chrome.action.setBadgeText({ text: '', tabId: tab.id }), 3000);
      }
    }
  } else {
    chrome.tabs.create({ url: chrome.runtime.getURL('src/dashboard/dashboard.html') });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Reads window.ytInitialPlayerResponse from the page's JS context (MAIN world),
  // bypassing content script isolation
  if (message.type === 'GET_PLAYER_RESPONSE') {
    const tabId = sender.tab?.id;
    if (!tabId) { sendResponse({ error: 'No tab ID' }); return true; }
    chrome.scripting.executeScript({
      target: { tabId },
      func: () => window.ytInitialPlayerResponse || null,
      world: 'MAIN',
    }).then(results => {
      sendResponse({ playerResponse: results?.[0]?.result || null });
    }).catch(err => {
      sendResponse({ error: err.message });
    });
    return true;
  }

  if (message.type === 'FETCH_TRANSCRIPT') {
    const tabId = sender.tab?.id;
    if (!tabId) { sendResponse({ error: 'No tab ID', segments: [] }); return true; }

    // Use YouTube's own InnerTube get_transcript API from MAIN world.
    // This is what YouTube's UI calls internally — has all credentials and
    // proper context so YouTube doesn't block it.
    chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: async () => {
        try {
          // Recursively search ytInitialData for getTranscriptEndpoint params
          function findParams(obj, depth) {
            if (depth > 15 || !obj || typeof obj !== 'object') return null;
            if (obj.getTranscriptEndpoint?.params) return obj.getTranscriptEndpoint.params;
            for (const v of Object.values(obj)) {
              const found = findParams(v, depth + 1);
              if (found) return found;
            }
            return null;
          }
          const params = findParams(window.ytInitialData, 0);
          if (!params) return { error: 'getTranscriptEndpoint.params not found in ytInitialData' };

          // Use the public WEB API key — same approach as server-side transcript libraries.
          // Sending ytcfg's user-scoped context/key causes 400 "Precondition check failed".
          const res = await fetch(
            'https://www.youtube.com/youtubei/v1/get_transcript?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8&prettyPrint=false',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'omit',
              body: JSON.stringify({
                context: {
                  client: { clientName: 'WEB', clientVersion: '2.20240101.01.00', hl: 'en', gl: 'US' },
                },
                params,
              }),
            }
          );

          const text = await res.text();
          if (!res.ok) return { error: `HTTP ${res.status} params=${params?.slice(0,20)}: ${text.slice(0, 200)}` };
          return { json: text };
        } catch (e) {
          return { error: e.message };
        }
      },
    }).then(results => {
      const res = results?.[0]?.result;
      if (!res || res.error) {
        sendResponse({ error: res?.error || 'executeScript failed', segments: [] });
        return;
      }
      try {
        const data = JSON.parse(res.json);
        const segments = parseInnerTubeTranscript(data);
        sendResponse({ segments, rawPreview: res.json.slice(0, 120) });
      } catch (e) {
        sendResponse({ error: 'Parse failed: ' + e.message, segments: [] });
      }
    }).catch(err => sendResponse({ error: err.message, segments: [] }));
    return true;
  }

  if (message.type === 'FETCH_PAGE_HTML') {
    fetch(message.url)
      .then(res => res.text())
      .then(html => sendResponse({ html }))
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }

  if (message.type === 'FETCH_VIDEO_DATA') {
    fetchVideoData(message.videoId)
      .then(data => sendResponse(data))
      .catch(err => sendResponse({ error: err.message }));
    return true;
  }

  if (message.type === 'OPEN_DASHBOARD') {
    chrome.tabs.create({ url: chrome.runtime.getURL('src/dashboard/dashboard.html') });
    sendResponse({ ok: true });
    return true;
  }
});

async function fetchTranscriptFromUrl(captionUrl) {
  const response = await fetch(captionUrl);
  if (!response.ok) throw new Error(`Caption fetch failed: ${response.status}`);
  const text = await response.text();

  // Return raw preview alongside segments for debugging
  if (!text || text.trim().length === 0) {
    return { segments: [], rawPreview: '(empty response)' };
  }

  let segments = [];

  if (text.trimStart().startsWith('{')) {
    try {
      segments = parseJson3(JSON.parse(text));
    } catch { /* fall through */ }
  }

  if (segments.length === 0) {
    segments = parseTimedTextXml(text);
  }

  return { segments, rawPreview: text.slice(0, 120) };
}

function parseInnerTubeTranscript(data) {
  // Walk the InnerTube get_transcript response to find cue groups
  const segments = [];
  try {
    const actions = data?.actions || [];
    for (const action of actions) {
      const panel = action?.updateEngagementPanelAction?.content
        ?.transcriptRenderer?.body?.transcriptBodyRenderer;
      if (!panel) continue;
      const cueGroups = panel.cueGroups || [];
      for (const group of cueGroups) {
        const cues = group?.transcriptCueGroupRenderer?.cues || [];
        for (const cue of cues) {
          const r = cue?.transcriptCueRenderer;
          if (!r) continue;
          const text = r.cue?.simpleText || r.cue?.runs?.map(x => x.text).join('') || '';
          if (text.trim()) {
            segments.push({
              start: parseInt(r.startOffsetMs || 0) / 1000,
              duration: parseInt(r.durationMs || 0) / 1000,
              text: text.trim(),
            });
          }
        }
      }
    }
  } catch { /* return whatever we have */ }
  return segments;
}

function parseJson3(json) {
  const segments = [];
  for (const event of (json.events || [])) {
    if (!event.segs) continue;
    const text = event.segs.map(s => s.utf8 || '').join('').replace(/\n/g, ' ').trim();
    if (text) {
      segments.push({
        start: (event.tStartMs || 0) / 1000,
        duration: (event.dDurationMs || 0) / 1000,
        text,
      });
    }
  }
  return segments;
}

async function fetchVideoData(videoId) {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Page fetch failed: ${response.status}`);
  const html = await response.text();

  const match = html.match(/var\s+ytInitialPlayerResponse\s*=\s*(\{.+?\});/s);
  if (!match) throw new Error('No player response found');

  const playerResponse = JSON.parse(match[1]);
  const details = playerResponse?.videoDetails;
  const tracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];

  return {
    metadata: {
      id: details?.videoId,
      title: details?.title,
      channel: details?.author,
      channelId: details?.channelId,
      description: details?.shortDescription || '',
      viewCount: parseInt(details?.viewCount, 10) || 0,
      publishDate: details?.publishDate || '',
    },
    captionTracks: tracks.map(t => ({
      url: t.baseUrl,
      label: t.name?.simpleText || t.languageCode,
      languageCode: t.languageCode,
      isAutoGenerated: t.kind === 'asr',
    })),
  };
}

function parseTimedTextXml(xml) {
  const ENTITIES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'", '&#39;': "'" };
  function decode(s) {
    return s.replace(/&(?:amp|lt|gt|quot|apos|#39);/g, m => ENTITIES[m] || m).replace(/<[^>]+>/g, '');
  }
  // Extract a named attribute from a tag's attribute string (order-independent)
  function attr(attrStr, name) {
    const m = attrStr.match(new RegExp(`\\b${name}="([^"]+)"`));
    return m ? m[1] : null;
  }

  const segments = [];
  let m;

  // srv3: <p t="startMs" d="durMs" ...>text</p>
  const srv3 = /<p\b([^>]*)>([\s\S]*?)<\/p>/g;
  while ((m = srv3.exec(xml)) !== null) {
    const t = attr(m[1], 't');
    if (t === null) continue;
    const d = attr(m[1], 'd');
    const text = decode(m[2]).trim();
    if (text) segments.push({ start: parseInt(t) / 1000, duration: d ? parseInt(d) / 1000 : 0, text });
  }

  if (segments.length > 0) return segments;

  // Legacy timedtext: <text start="s" dur="s">text</text> — attributes in any order
  const legacy = /<text\b([^>]*)>([\s\S]*?)<\/text>/g;
  while ((m = legacy.exec(xml)) !== null) {
    const start = attr(m[1], 'start');
    if (start === null) continue;
    const dur = attr(m[1], 'dur');
    const text = decode(m[2]).trim();
    if (text) segments.push({ start: parseFloat(start), duration: dur ? parseFloat(dur) : 0, text });
  }

  return segments;
}
