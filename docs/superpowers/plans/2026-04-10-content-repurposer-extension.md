# Content Repurposer Chrome Extension — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build "ReFormat" — a Chrome extension that lets users highlight text on any webpage and instantly reformat it for LinkedIn, X, email, blog, and other platforms via AI.

**Architecture:** Manifest V3 extension with a content script (captures selected text), a popup UI (format selection + output), a background service worker (orchestrates API calls), and a lightweight Cloudflare Worker proxy (protects the AI API key). ExtensionPay handles freemium subscription billing. Usage tracking stored in chrome.storage.local.

**Tech Stack:** Manifest V3, vanilla JS (no framework), CSS, Cloudflare Workers (free tier), OpenAI API (gpt-4o-mini for cost efficiency), ExtensionPay (Stripe), Vitest for unit tests.

**Important note on API key security:** The spec says "no backend — API calls direct from extension." However, shipping an API key in extension source code is a security risk — anyone can extract it from the published .crx file. We use a free Cloudflare Worker as a thin proxy: the extension sends requests to our Worker, which appends the API key and forwards to OpenAI. This adds ~5 minutes of setup and zero cost at our scale.

---

## File Structure

```
extensions/reformat/
  manifest.json                 — MV3 manifest, permissions, content scripts
  src/
    popup/
      popup.html                — Main UI: format picker, output display, copy button
      popup.js                  — Popup logic: get selection, call API, render output
      popup.css                 — Popup styles
    background/
      service-worker.js         — Context menu setup, message routing
    content/
      content.js                — Content script: capture selected text, relay to popup
    lib/
      api.js                    — AI API client (calls our Cloudflare Worker proxy)
      formats.js                — Platform format definitions and prompt templates
      usage.js                  — Free tier usage tracking (daily count in chrome.storage)
      storage.js                — Chrome storage wrapper (get/set/clear helpers)
  icons/
    icon16.png
    icon32.png
    icon48.png
    icon128.png
  tests/
    formats.test.js             — Format template tests
    usage.test.js               — Usage tracking/limiting tests
    api.test.js                 — API client tests (mocked fetch)
  proxy/
    worker.js                   — Cloudflare Worker: auth proxy for OpenAI API
    wrangler.toml               — Cloudflare Worker config
  package.json                  — Dev dependencies (vitest)
```

---

## Task 1: Project Scaffold + Manifest

**Files:**
- Create: `extensions/reformat/manifest.json`
- Create: `extensions/reformat/package.json`
- Create: `extensions/reformat/icons/` (placeholder PNGs)

- [ ] **Step 1: Create the project directory structure**

```bash
mkdir -p extensions/reformat/src/{popup,background,content,lib}
mkdir -p extensions/reformat/{icons,tests,proxy}
```

- [ ] **Step 2: Create package.json with dev dependencies**

Create `extensions/reformat/package.json`:
```json
{
  "name": "reformat-extension",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "vitest": "^3.1.0"
  }
}
```

- [ ] **Step 3: Install dependencies**

Run: `cd extensions/reformat && npm install`
Expected: `node_modules/` created, vitest installed.

- [ ] **Step 4: Create manifest.json**

Create `extensions/reformat/manifest.json`:
```json
{
  "manifest_version": 3,
  "name": "ReFormat — Repurpose Any Text",
  "version": "0.1.0",
  "description": "Highlight text on any page, instantly reformat it for LinkedIn, X, email, and more. One click to repurpose content for any platform.",
  "permissions": [
    "activeTab",
    "contextMenus",
    "storage"
  ],
  "background": {
    "service_worker": "src/background/service-worker.js"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["src/content/content.js"]
    }
  ],
  "action": {
    "default_popup": "src/popup/popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "32": "icons/icon32.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "icons": {
    "16": "icons/icon16.png",
    "32": "icons/icon32.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

- [ ] **Step 5: Create placeholder icon files**

Generate simple colored square PNGs at 16x16, 32x32, 48x48, and 128x128. These are dev placeholders — real icons come later. Use any simple method (canvas script, ImageMagick, or manual creation). Save to `extensions/reformat/icons/`.

- [ ] **Step 6: Commit**

```bash
git add extensions/reformat/manifest.json extensions/reformat/package.json extensions/reformat/icons/
git commit -m "feat: scaffold ReFormat extension with MV3 manifest"
```

---

## Task 2: Chrome Storage Wrapper

**Files:**
- Create: `extensions/reformat/src/lib/storage.js`
- Test: `extensions/reformat/tests/storage.test.js`

- [ ] **Step 1: Write the failing tests**

Create `extensions/reformat/tests/storage.test.js`:
```js
import { describe, it, expect, beforeEach } from 'vitest';

// Mock chrome.storage.local for testing outside the browser
const mockStore = {};
globalThis.chrome = {
  storage: {
    local: {
      get: (keys) => Promise.resolve(
        Object.fromEntries(
          (Array.isArray(keys) ? keys : [keys]).map(k => [k, mockStore[k]])
        )
      ),
      set: (obj) => {
        Object.assign(mockStore, obj);
        return Promise.resolve();
      },
      remove: (keys) => {
        (Array.isArray(keys) ? keys : [keys]).forEach(k => delete mockStore[k]);
        return Promise.resolve();
      }
    }
  }
};

import { storageGet, storageSet, storageRemove } from '../src/lib/storage.js';

describe('storage', () => {
  beforeEach(() => {
    Object.keys(mockStore).forEach(k => delete mockStore[k]);
  });

  it('sets and gets a value', async () => {
    await storageSet('testKey', 'hello');
    const result = await storageGet('testKey');
    expect(result).toBe('hello');
  });

  it('returns undefined for missing key', async () => {
    const result = await storageGet('nonexistent');
    expect(result).toBeUndefined();
  });

  it('removes a value', async () => {
    await storageSet('toDelete', 'bye');
    await storageRemove('toDelete');
    const result = await storageGet('toDelete');
    expect(result).toBeUndefined();
  });

  it('handles object values', async () => {
    const obj = { count: 5, date: '2026-04-10' };
    await storageSet('complex', obj);
    const result = await storageGet('complex');
    expect(result).toEqual(obj);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd extensions/reformat && npx vitest run tests/storage.test.js`
Expected: FAIL — cannot find module `../src/lib/storage.js`

- [ ] **Step 3: Write the implementation**

Create `extensions/reformat/src/lib/storage.js`:
```js
export async function storageGet(key) {
  const result = await chrome.storage.local.get(key);
  return result[key];
}

export async function storageSet(key, value) {
  await chrome.storage.local.set({ [key]: value });
}

export async function storageRemove(key) {
  await chrome.storage.local.remove(key);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd extensions/reformat && npx vitest run tests/storage.test.js`
Expected: 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add extensions/reformat/src/lib/storage.js extensions/reformat/tests/storage.test.js
git commit -m "feat: add chrome.storage.local wrapper with tests"
```

---

## Task 3: Usage Tracking (Free Tier Limits)

**Files:**
- Create: `extensions/reformat/src/lib/usage.js`
- Test: `extensions/reformat/tests/usage.test.js`

- [ ] **Step 1: Write the failing tests**

Create `extensions/reformat/tests/usage.test.js`:
```js
import { describe, it, expect, beforeEach } from 'vitest';

// Mock chrome.storage.local
const mockStore = {};
globalThis.chrome = {
  storage: {
    local: {
      get: (keys) => Promise.resolve(
        Object.fromEntries(
          (Array.isArray(keys) ? keys : [keys]).map(k => [k, mockStore[k]])
        )
      ),
      set: (obj) => {
        Object.assign(mockStore, obj);
        return Promise.resolve();
      },
      remove: (keys) => {
        (Array.isArray(keys) ? keys : [keys]).forEach(k => delete mockStore[k]);
        return Promise.resolve();
      }
    }
  }
};

import { getUsageToday, incrementUsage, canUseToday, FREE_DAILY_LIMIT } from '../src/lib/usage.js';

describe('usage tracking', () => {
  beforeEach(() => {
    Object.keys(mockStore).forEach(k => delete mockStore[k]);
  });

  it('starts at 0 uses for a new day', async () => {
    const count = await getUsageToday();
    expect(count).toBe(0);
  });

  it('increments usage count', async () => {
    await incrementUsage();
    await incrementUsage();
    const count = await getUsageToday();
    expect(count).toBe(2);
  });

  it('allows usage when under the limit', async () => {
    const allowed = await canUseToday();
    expect(allowed).toBe(true);
  });

  it('blocks usage at the daily limit', async () => {
    for (let i = 0; i < FREE_DAILY_LIMIT; i++) {
      await incrementUsage();
    }
    const allowed = await canUseToday();
    expect(allowed).toBe(false);
  });

  it('resets count on a new day', async () => {
    // Simulate usage from yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const key = `usage_${yesterday.toISOString().split('T')[0]}`;
    mockStore[key] = 5;

    // Today should be 0
    const count = await getUsageToday();
    expect(count).toBe(0);
  });

  it('exports FREE_DAILY_LIMIT as 5', () => {
    expect(FREE_DAILY_LIMIT).toBe(5);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd extensions/reformat && npx vitest run tests/usage.test.js`
Expected: FAIL — cannot find module `../src/lib/usage.js`

- [ ] **Step 3: Write the implementation**

Create `extensions/reformat/src/lib/usage.js`:
```js
import { storageGet, storageSet } from './storage.js';

export const FREE_DAILY_LIMIT = 5;

function todayKey() {
  return `usage_${new Date().toISOString().split('T')[0]}`;
}

export async function getUsageToday() {
  const count = await storageGet(todayKey());
  return count || 0;
}

export async function incrementUsage() {
  const count = await getUsageToday();
  await storageSet(todayKey(), count + 1);
}

export async function canUseToday() {
  const count = await getUsageToday();
  return count < FREE_DAILY_LIMIT;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd extensions/reformat && npx vitest run tests/usage.test.js`
Expected: 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add extensions/reformat/src/lib/usage.js extensions/reformat/tests/usage.test.js
git commit -m "feat: add daily usage tracking with free tier limit of 5"
```

---

## Task 4: Format Definitions + Prompt Templates

**Files:**
- Create: `extensions/reformat/src/lib/formats.js`
- Test: `extensions/reformat/tests/formats.test.js`

- [ ] **Step 1: Write the failing tests**

Create `extensions/reformat/tests/formats.test.js`:
```js
import { describe, it, expect } from 'vitest';
import {
  FORMATS,
  FREE_FORMATS,
  getFormatById,
  buildPrompt,
  isFormatFree
} from '../src/lib/formats.js';

describe('formats', () => {
  it('has at least 6 format definitions', () => {
    expect(FORMATS.length).toBeGreaterThanOrEqual(6);
  });

  it('each format has id, name, description, and promptTemplate', () => {
    for (const fmt of FORMATS) {
      expect(fmt).toHaveProperty('id');
      expect(fmt).toHaveProperty('name');
      expect(fmt).toHaveProperty('description');
      expect(fmt).toHaveProperty('promptTemplate');
      expect(typeof fmt.promptTemplate).toBe('string');
    }
  });

  it('FREE_FORMATS contains exactly linkedin, x-thread, email', () => {
    expect(FREE_FORMATS).toEqual(['linkedin', 'x-thread', 'email']);
  });

  it('getFormatById returns the correct format', () => {
    const linkedin = getFormatById('linkedin');
    expect(linkedin).toBeDefined();
    expect(linkedin.name).toBe('LinkedIn Post');
  });

  it('getFormatById returns undefined for unknown id', () => {
    expect(getFormatById('nonexistent')).toBeUndefined();
  });

  it('buildPrompt inserts the source text into the template', () => {
    const result = buildPrompt('linkedin', 'Here is my source text.');
    expect(result).toContain('Here is my source text.');
    expect(result.length).toBeGreaterThan(50);
  });

  it('buildPrompt includes tone when provided', () => {
    const result = buildPrompt('linkedin', 'Source text.', 'casual');
    expect(result.toLowerCase()).toContain('casual');
  });

  it('isFormatFree returns true for free formats', () => {
    expect(isFormatFree('linkedin')).toBe(true);
    expect(isFormatFree('x-thread')).toBe(true);
    expect(isFormatFree('email')).toBe(true);
  });

  it('isFormatFree returns false for premium formats', () => {
    expect(isFormatFree('instagram')).toBe(false);
    expect(isFormatFree('blog')).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd extensions/reformat && npx vitest run tests/formats.test.js`
Expected: FAIL — cannot find module `../src/lib/formats.js`

- [ ] **Step 3: Write the implementation**

Create `extensions/reformat/src/lib/formats.js`:
```js
export const FORMATS = [
  {
    id: 'linkedin',
    name: 'LinkedIn Post',
    description: 'Professional post with hook, body, and CTA',
    promptTemplate: `Rewrite the following text as a LinkedIn post. Use a compelling opening hook (first line should stop the scroll). Break into short paragraphs. End with a clear call-to-action or thought-provoking question. Keep it under 1300 characters. Do not use hashtags unless they add real value.

{{TONE}}

Source text:
"""
{{TEXT}}
"""

Output only the LinkedIn post, nothing else.`
  },
  {
    id: 'x-thread',
    name: 'X Thread',
    description: 'Punchy thread with numbered tweets',
    promptTemplate: `Rewrite the following text as an X (Twitter) thread. First tweet must hook the reader. Number each tweet (1/, 2/, etc.). Each tweet must be under 280 characters. Use short, punchy sentences. End with a summary or CTA tweet.

{{TONE}}

Source text:
"""
{{TEXT}}
"""

Output only the thread tweets, nothing else.`
  },
  {
    id: 'email',
    name: 'Email Newsletter',
    description: 'Email-friendly format with subject line',
    promptTemplate: `Rewrite the following text as an email newsletter segment. Start with a subject line on its own line prefixed with "Subject: ". Write in a conversational, direct tone. Use short paragraphs. Include a clear CTA at the end.

{{TONE}}

Source text:
"""
{{TEXT}}
"""

Output only the email content (subject line + body), nothing else.`
  },
  {
    id: 'instagram',
    name: 'Instagram Caption',
    description: 'Engaging caption with emoji and hashtags',
    promptTemplate: `Rewrite the following text as an Instagram caption. Start with a hook. Use a mix of short and medium sentences. Add 2-3 relevant emojis naturally (not forced). End with a CTA. Add 5-10 relevant hashtags on a separate line at the end. Keep under 2200 characters.

{{TONE}}

Source text:
"""
{{TEXT}}
"""

Output only the Instagram caption, nothing else.`
  },
  {
    id: 'blog',
    name: 'Blog Intro',
    description: 'Opening paragraph for a blog post',
    promptTemplate: `Rewrite the following text as a compelling blog post introduction (2-3 paragraphs). Start with a hook that draws readers in — a surprising stat, bold claim, or relatable scenario. Set up the problem or topic. End with a transition that makes the reader want to continue.

{{TONE}}

Source text:
"""
{{TEXT}}
"""

Output only the blog introduction, nothing else.`
  },
  {
    id: 'facebook',
    name: 'Facebook Post',
    description: 'Conversational post for Facebook',
    promptTemplate: `Rewrite the following text as a Facebook post. Use a conversational, friendly tone. Ask a question to drive comments. Keep it under 500 characters for best engagement. Can use 1-2 emojis if natural.

{{TONE}}

Source text:
"""
{{TEXT}}
"""

Output only the Facebook post, nothing else.`
  }
];

export const FREE_FORMATS = ['linkedin', 'x-thread', 'email'];

export function getFormatById(id) {
  return FORMATS.find(f => f.id === id);
}

export function isFormatFree(formatId) {
  return FREE_FORMATS.includes(formatId);
}

export function buildPrompt(formatId, sourceText, tone) {
  const format = getFormatById(formatId);
  if (!format) throw new Error(`Unknown format: ${formatId}`);

  let prompt = format.promptTemplate.replace('{{TEXT}}', sourceText);

  if (tone) {
    prompt = prompt.replace('{{TONE}}', `Tone: ${tone}.`);
  } else {
    prompt = prompt.replace('{{TONE}}', '');
  }

  return prompt;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd extensions/reformat && npx vitest run tests/formats.test.js`
Expected: 9 tests PASS

- [ ] **Step 5: Commit**

```bash
git add extensions/reformat/src/lib/formats.js extensions/reformat/tests/formats.test.js
git commit -m "feat: add 6 platform format definitions with prompt templates"
```

---

## Task 5: AI API Client

**Files:**
- Create: `extensions/reformat/src/lib/api.js`
- Test: `extensions/reformat/tests/api.test.js`

- [ ] **Step 1: Write the failing tests**

Create `extensions/reformat/tests/api.test.js`:
```js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { reformatText } from '../src/lib/api.js';

describe('api', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('sends the prompt to the proxy and returns the response text', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: { content: 'Reformatted content here.' } }]
      })
    });

    const result = await reformatText('linkedin', 'Some source text.');
    expect(result).toBe('Reformatted content here.');

    expect(fetch).toHaveBeenCalledOnce();
    const [url, options] = fetch.mock.calls[0];
    expect(url).toContain('/api/reformat');
    expect(options.method).toBe('POST');

    const body = JSON.parse(options.body);
    expect(body.formatId).toBe('linkedin');
    expect(body.text).toBe('Some source text.');
  });

  it('passes tone when provided', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: { content: 'Casual output.' } }]
      })
    });

    await reformatText('linkedin', 'Text.', 'casual');
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.tone).toBe('casual');
  });

  it('throws on non-ok response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: () => Promise.resolve('Rate limited')
    });

    await expect(reformatText('linkedin', 'Text.'))
      .rejects.toThrow('API error (429)');
  });

  it('throws on network error', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network failed'));

    await expect(reformatText('linkedin', 'Text.'))
      .rejects.toThrow('Network failed');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd extensions/reformat && npx vitest run tests/api.test.js`
Expected: FAIL — cannot find module `../src/lib/api.js`

- [ ] **Step 3: Write the implementation**

Create `extensions/reformat/src/lib/api.js`:
```js
const PROXY_URL = 'https://reformat-proxy.YOUR_SUBDOMAIN.workers.dev/api/reformat';

export async function reformatText(formatId, text, tone) {
  const response = await fetch(PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ formatId, text, tone })
  });

  if (!response.ok) {
    throw new Error(`API error (${response.status})`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}
```

Note: `YOUR_SUBDOMAIN` is a placeholder that gets replaced when you deploy the Cloudflare Worker in Task 9. During development and testing, the URL is mocked.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd extensions/reformat && npx vitest run tests/api.test.js`
Expected: 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add extensions/reformat/src/lib/api.js extensions/reformat/tests/api.test.js
git commit -m "feat: add AI API client with proxy URL and error handling"
```

---

## Task 6: Content Script (Capture Selected Text)

**Files:**
- Create: `extensions/reformat/src/content/content.js`

No unit test for this file — it's a thin Chrome API integration layer. Tested manually by loading the extension.

- [ ] **Step 1: Write the content script**

Create `extensions/reformat/src/content/content.js`:
```js
// Listen for messages from the popup requesting the selected text
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_SELECTION') {
    const selectedText = window.getSelection().toString().trim();
    sendResponse({ text: selectedText });
  }
});
```

- [ ] **Step 2: Commit**

```bash
git add extensions/reformat/src/content/content.js
git commit -m "feat: add content script to capture selected text"
```

---

## Task 7: Background Service Worker (Context Menu)

**Files:**
- Create: `extensions/reformat/src/background/service-worker.js`

No unit test — Chrome extension API integration. Tested manually.

- [ ] **Step 1: Write the service worker**

Create `extensions/reformat/src/background/service-worker.js`:
```js
// Create context menu item on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'reformat-selection',
    title: 'ReFormat this text',
    contexts: ['selection']
  });
});

// When context menu clicked, open the popup isn't possible via API,
// so we store the selected text and let the popup read it on open.
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'reformat-selection' && info.selectionText) {
    chrome.storage.local.set({
      pendingText: info.selectionText.trim(),
      pendingTimestamp: Date.now()
    });
    // Open the popup by triggering the action
    chrome.action.openPopup();
  }
});
```

- [ ] **Step 2: Commit**

```bash
git add extensions/reformat/src/background/service-worker.js
git commit -m "feat: add service worker with context menu integration"
```

---

## Task 8: Popup UI

**Files:**
- Create: `extensions/reformat/src/popup/popup.html`
- Create: `extensions/reformat/src/popup/popup.css`
- Create: `extensions/reformat/src/popup/popup.js`

- [ ] **Step 1: Create the popup HTML**

Create `extensions/reformat/src/popup/popup.html`:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="popup.css">
  <title>ReFormat</title>
</head>
<body>
  <div class="container">
    <header>
      <h1>ReFormat</h1>
      <span id="usage-badge" class="badge"></span>
    </header>

    <!-- State: No text selected -->
    <div id="state-empty" class="state">
      <p class="hint">Highlight text on any page, then open ReFormat.</p>
    </div>

    <!-- State: Text captured, pick format -->
    <div id="state-ready" class="state hidden">
      <p class="source-preview" id="source-preview"></p>
      <div class="format-grid" id="format-grid"></div>
      <div id="tone-section" class="hidden">
        <label for="tone-select">Tone:</label>
        <select id="tone-select">
          <option value="">Default</option>
          <option value="professional">Professional</option>
          <option value="casual">Casual</option>
          <option value="provocative">Provocative</option>
          <option value="educational">Educational</option>
        </select>
      </div>
    </div>

    <!-- State: Loading -->
    <div id="state-loading" class="state hidden">
      <div class="spinner"></div>
      <p>Reformatting...</p>
    </div>

    <!-- State: Result -->
    <div id="state-result" class="state hidden">
      <div class="result-box" id="result-text"></div>
      <div class="actions">
        <button id="btn-copy" class="btn btn-primary">Copy</button>
        <button id="btn-back" class="btn btn-secondary">Back</button>
      </div>
    </div>

    <!-- State: Limit reached -->
    <div id="state-limit" class="state hidden">
      <p>You've used all 5 free reformats today.</p>
      <button id="btn-upgrade" class="btn btn-primary">Upgrade — $6.99/mo</button>
    </div>

    <!-- State: Error -->
    <div id="state-error" class="state hidden">
      <p class="error-message" id="error-message"></p>
      <button id="btn-retry" class="btn btn-secondary">Try Again</button>
    </div>
  </div>

  <script type="module" src="popup.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create the popup CSS**

Create `extensions/reformat/src/popup/popup.css`:
```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  width: 380px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14px;
  color: #1a1a1a;
  background: #fff;
}

.container {
  padding: 16px;
}

header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

header h1 {
  font-size: 18px;
  font-weight: 700;
  color: #111;
}

.badge {
  font-size: 12px;
  color: #666;
  background: #f0f0f0;
  padding: 2px 8px;
  border-radius: 10px;
}

.hidden {
  display: none !important;
}

.hint {
  color: #666;
  text-align: center;
  padding: 24px 0;
}

.source-preview {
  font-size: 13px;
  color: #444;
  background: #f8f8f8;
  border-radius: 8px;
  padding: 10px;
  margin-bottom: 12px;
  max-height: 80px;
  overflow-y: auto;
  line-height: 1.4;
}

.format-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 12px;
}

.format-btn {
  padding: 10px 8px;
  border: 1.5px solid #e0e0e0;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s, background 0.15s;
}

.format-btn:hover {
  border-color: #333;
  background: #fafafa;
}

.format-btn .format-name {
  font-weight: 600;
  font-size: 13px;
  display: block;
}

.format-btn .format-desc {
  font-size: 11px;
  color: #888;
  margin-top: 2px;
  display: block;
}

.format-btn.locked {
  opacity: 0.5;
  position: relative;
}

.format-btn.locked::after {
  content: 'PRO';
  position: absolute;
  top: 4px;
  right: 6px;
  font-size: 9px;
  font-weight: 700;
  color: #fff;
  background: #333;
  padding: 1px 5px;
  border-radius: 4px;
}

#tone-section {
  margin-bottom: 8px;
}

#tone-section label {
  font-size: 12px;
  font-weight: 600;
  margin-right: 6px;
}

#tone-select {
  font-size: 13px;
  padding: 4px 8px;
  border: 1px solid #ddd;
  border-radius: 6px;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #eee;
  border-top-color: #333;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  margin: 24px auto 12px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

#state-loading p {
  text-align: center;
  color: #666;
}

.result-box {
  background: #f8f8f8;
  border-radius: 8px;
  padding: 12px;
  font-size: 13px;
  line-height: 1.5;
  max-height: 280px;
  overflow-y: auto;
  white-space: pre-wrap;
  margin-bottom: 12px;
}

.actions {
  display: flex;
  gap: 8px;
}

.btn {
  flex: 1;
  padding: 10px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
}

.btn:hover {
  opacity: 0.85;
}

.btn-primary {
  background: #111;
  color: #fff;
}

.btn-secondary {
  background: #f0f0f0;
  color: #333;
}

.error-message {
  color: #c00;
  text-align: center;
  padding: 12px 0;
}

#state-limit {
  text-align: center;
  padding: 20px 0;
}

#state-limit p {
  margin-bottom: 12px;
  color: #666;
}
```

- [ ] **Step 3: Create the popup JS**

Create `extensions/reformat/src/popup/popup.js`:
```js
import { FORMATS, FREE_FORMATS, isFormatFree, buildPrompt } from '../lib/formats.js';
import { getUsageToday, incrementUsage, canUseToday, FREE_DAILY_LIMIT } from '../lib/usage.js';
import { reformatText } from '../lib/api.js';
import { storageGet, storageRemove } from '../lib/storage.js';

// DOM elements
const stateEmpty = document.getElementById('state-empty');
const stateReady = document.getElementById('state-ready');
const stateLoading = document.getElementById('state-loading');
const stateResult = document.getElementById('state-result');
const stateLimit = document.getElementById('state-limit');
const stateError = document.getElementById('state-error');

const usageBadge = document.getElementById('usage-badge');
const sourcePreview = document.getElementById('source-preview');
const formatGrid = document.getElementById('format-grid');
const toneSection = document.getElementById('tone-section');
const toneSelect = document.getElementById('tone-select');
const resultText = document.getElementById('result-text');
const errorMessage = document.getElementById('error-message');

const btnCopy = document.getElementById('btn-copy');
const btnBack = document.getElementById('btn-back');
const btnRetry = document.getElementById('btn-retry');
const btnUpgrade = document.getElementById('btn-upgrade');

let capturedText = '';
let lastFormatId = '';
let isPremium = false; // TODO: integrate ExtensionPay in Task 10

// State management
function showState(el) {
  [stateEmpty, stateReady, stateLoading, stateResult, stateLimit, stateError]
    .forEach(s => s.classList.add('hidden'));
  el.classList.remove('hidden');
}

async function updateUsageBadge() {
  const used = await getUsageToday();
  if (isPremium) {
    usageBadge.textContent = 'PRO';
  } else {
    usageBadge.textContent = `${used}/${FREE_DAILY_LIMIT} today`;
  }
}

// Build format buttons
function renderFormats() {
  formatGrid.innerHTML = '';
  for (const fmt of FORMATS) {
    const btn = document.createElement('button');
    btn.className = 'format-btn';
    const isFree = isFormatFree(fmt.id);

    if (!isFree && !isPremium) {
      btn.classList.add('locked');
    }

    btn.innerHTML = `
      <span class="format-name">${fmt.name}</span>
      <span class="format-desc">${fmt.description}</span>
    `;

    btn.addEventListener('click', () => handleFormatClick(fmt.id, isFree));
    formatGrid.appendChild(btn);
  }
}

async function handleFormatClick(formatId, isFree) {
  if (!isFree && !isPremium) {
    // Show upgrade prompt
    showState(stateLimit);
    return;
  }

  if (!isPremium) {
    const allowed = await canUseToday();
    if (!allowed) {
      showState(stateLimit);
      return;
    }
  }

  lastFormatId = formatId;
  showState(stateLoading);

  try {
    const tone = isPremium ? toneSelect.value : '';
    const result = await reformatText(formatId, capturedText, tone || undefined);

    if (!isPremium) {
      await incrementUsage();
      await updateUsageBadge();
    }

    resultText.textContent = result;
    showState(stateResult);
  } catch (err) {
    errorMessage.textContent = err.message || 'Something went wrong. Please try again.';
    showState(stateError);
  }
}

// Copy to clipboard
btnCopy.addEventListener('click', async () => {
  await navigator.clipboard.writeText(resultText.textContent);
  btnCopy.textContent = 'Copied!';
  setTimeout(() => { btnCopy.textContent = 'Copy'; }, 1500);
});

// Back to format selection
btnBack.addEventListener('click', () => {
  showState(stateReady);
});

// Retry last format
btnRetry.addEventListener('click', () => {
  if (lastFormatId) {
    handleFormatClick(lastFormatId, isFormatFree(lastFormatId));
  } else {
    showState(stateReady);
  }
});

// Upgrade button
btnUpgrade.addEventListener('click', () => {
  // TODO: integrate ExtensionPay in Task 10
  chrome.tabs.create({ url: 'https://extensionpay.com' });
});

// Show premium-only tone controls
function updatePremiumUI() {
  if (isPremium) {
    toneSection.classList.remove('hidden');
  } else {
    toneSection.classList.add('hidden');
  }
}

// Initialize popup
async function init() {
  renderFormats();
  updatePremiumUI();
  await updateUsageBadge();

  // Check for text from context menu (stored by service worker)
  const pendingText = await storageGet('pendingText');
  const pendingTimestamp = await storageGet('pendingTimestamp');

  if (pendingText && pendingTimestamp && (Date.now() - pendingTimestamp < 5000)) {
    capturedText = pendingText;
    await storageRemove('pendingText');
    await storageRemove('pendingTimestamp');
    sourcePreview.textContent = capturedText.length > 200
      ? capturedText.slice(0, 200) + '...'
      : capturedText;
    showState(stateReady);
    return;
  }

  // Otherwise, get selection from the active tab's content script
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_SELECTION' });
      if (response?.text) {
        capturedText = response.text;
        sourcePreview.textContent = capturedText.length > 200
          ? capturedText.slice(0, 200) + '...'
          : capturedText;
        showState(stateReady);
        return;
      }
    }
  } catch (e) {
    // Content script might not be injected on this page (chrome://, etc.)
  }

  showState(stateEmpty);
}

init();
```

- [ ] **Step 4: Load extension in Chrome and test manually**

1. Open `chrome://extensions/`
2. Enable "Developer mode" (top right toggle)
3. Click "Load unpacked" and select `extensions/reformat/`
4. Go to any webpage, highlight text
5. Click the ReFormat extension icon
6. Verify: selected text appears in the popup, format buttons render, clicking a format shows loading state

Expected: UI renders correctly. API call will fail (proxy not deployed yet) — that's fine, the error state should display.

- [ ] **Step 5: Commit**

```bash
git add extensions/reformat/src/popup/
git commit -m "feat: add popup UI with format selection, states, and usage display"
```

---

## Task 9: Cloudflare Worker Proxy

**Files:**
- Create: `extensions/reformat/proxy/worker.js`
- Create: `extensions/reformat/proxy/wrangler.toml`

- [ ] **Step 1: Create the Cloudflare Worker config**

Create `extensions/reformat/proxy/wrangler.toml`:
```toml
name = "reformat-proxy"
main = "worker.js"
compatibility_date = "2024-01-01"

[vars]
ALLOWED_ORIGIN = "chrome-extension://"
```

Note: The `OPENAI_API_KEY` is set as a secret via `wrangler secret put OPENAI_API_KEY`, never in config files.

- [ ] **Step 2: Write the Worker**

Create `extensions/reformat/proxy/worker.js`:
```js
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4o-mini';

export default {
  async fetch(request, env) {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders(request)
      });
    }

    // Only accept POST to /api/reformat
    const url = new URL(request.url);
    if (request.method !== 'POST' || url.pathname !== '/api/reformat') {
      return new Response('Not found', { status: 404 });
    }

    // Validate origin is our extension
    const origin = request.headers.get('Origin') || '';
    if (!origin.startsWith('chrome-extension://')) {
      return new Response('Forbidden', { status: 403 });
    }

    try {
      const { formatId, text, tone } = await request.json();

      if (!formatId || !text) {
        return new Response(
          JSON.stringify({ error: 'Missing formatId or text' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders(request) } }
        );
      }

      // Truncate input to prevent abuse (max ~3000 chars)
      const truncatedText = text.slice(0, 3000);

      // Build the prompt server-side to prevent prompt injection via the formatId
      const prompt = buildServerPrompt(formatId, truncatedText, tone);
      if (!prompt) {
        return new Response(
          JSON.stringify({ error: 'Unknown format' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders(request) } }
        );
      }

      const openaiResponse = await fetch(OPENAI_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: 'system', content: 'You are a content repurposing assistant. Output only the reformatted content, nothing else.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 1000,
          temperature: 0.7
        })
      });

      if (!openaiResponse.ok) {
        const errText = await openaiResponse.text();
        return new Response(
          JSON.stringify({ error: 'AI service error' }),
          { status: 502, headers: { 'Content-Type': 'application/json', ...corsHeaders(request) } }
        );
      }

      const data = await openaiResponse.json();
      return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders(request) }
      });

    } catch (err) {
      return new Response(
        JSON.stringify({ error: 'Internal error' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders(request) } }
      );
    }
  }
};

function corsHeaders(request) {
  return {
    'Access-Control-Allow-Origin': request.headers.get('Origin') || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}

// Server-side prompt building — mirrors formats.js but lives here
// so the client can't send arbitrary prompts
function buildServerPrompt(formatId, text, tone) {
  const templates = {
    'linkedin': `Rewrite the following text as a LinkedIn post. Use a compelling opening hook. Break into short paragraphs. End with a call-to-action or question. Keep under 1300 characters. No hashtags unless valuable.\n\n${tone ? `Tone: ${tone}.` : ''}\n\nSource text:\n"""\n${text}\n"""\n\nOutput only the LinkedIn post.`,
    'x-thread': `Rewrite as an X (Twitter) thread. First tweet hooks the reader. Number each tweet (1/, 2/). Each under 280 chars. Short punchy sentences. End with summary/CTA.\n\n${tone ? `Tone: ${tone}.` : ''}\n\nSource text:\n"""\n${text}\n"""\n\nOutput only the thread.`,
    'email': `Rewrite as an email newsletter segment. Start with "Subject: " line. Conversational tone. Short paragraphs. Clear CTA at end.\n\n${tone ? `Tone: ${tone}.` : ''}\n\nSource text:\n"""\n${text}\n"""\n\nOutput only the email.`,
    'instagram': `Rewrite as an Instagram caption. Hook first. Mix short/medium sentences. 2-3 natural emojis. CTA at end. 5-10 hashtags on separate line. Under 2200 chars.\n\n${tone ? `Tone: ${tone}.` : ''}\n\nSource text:\n"""\n${text}\n"""\n\nOutput only the caption.`,
    'blog': `Rewrite as a blog post introduction (2-3 paragraphs). Hook with surprising stat, bold claim, or scenario. Set up the topic. End with transition to continue reading.\n\n${tone ? `Tone: ${tone}.` : ''}\n\nSource text:\n"""\n${text}\n"""\n\nOutput only the intro.`,
    'facebook': `Rewrite as a Facebook post. Conversational, friendly. Ask a question for comments. Under 500 chars. 1-2 emojis if natural.\n\n${tone ? `Tone: ${tone}.` : ''}\n\nSource text:\n"""\n${text}\n"""\n\nOutput only the post.`
  };

  return templates[formatId] || null;
}
```

- [ ] **Step 3: Deploy the Worker**

```bash
cd extensions/reformat/proxy
npx wrangler login
npx wrangler secret put OPENAI_API_KEY
# (paste your OpenAI API key when prompted)
npx wrangler deploy
```

Expected: Worker deploys to `https://reformat-proxy.YOUR_SUBDOMAIN.workers.dev`

- [ ] **Step 4: Update the proxy URL in api.js**

Edit `extensions/reformat/src/lib/api.js` — replace `YOUR_SUBDOMAIN` with the actual subdomain from the deploy output.

- [ ] **Step 5: Test end-to-end manually**

1. Reload the extension in `chrome://extensions/`
2. Go to any article, highlight a paragraph
3. Open ReFormat, click "LinkedIn Post"
4. Verify: loading spinner shows, then reformatted text appears
5. Click "Copy" — verify text is on clipboard

Expected: Full flow works. Response appears in 2-5 seconds.

- [ ] **Step 6: Commit**

```bash
git add extensions/reformat/proxy/ extensions/reformat/src/lib/api.js
git commit -m "feat: add Cloudflare Worker proxy for secure OpenAI API calls"
```

---

## Task 10: ExtensionPay Integration (Freemium Billing)

**Files:**
- Modify: `extensions/reformat/src/popup/popup.js`
- Modify: `extensions/reformat/manifest.json`

- [ ] **Step 1: Register with ExtensionPay**

1. Go to https://extensionpay.com and create an account
2. Add a new extension, set the price to $6.99/month
3. Copy your ExtensionPay extension ID

- [ ] **Step 2: Add ExtensionPay script to manifest**

Edit `extensions/reformat/manifest.json` — add to the `content_scripts` section and add the ExtensionPay library. Update the manifest to include the ExtensionPay domain in permissions:

Add to manifest.json:
```json
{
  "permissions": [
    "activeTab",
    "contextMenus",
    "storage"
  ],
  "host_permissions": [
    "https://extensionpay.com/*"
  ]
}
```

- [ ] **Step 3: Download ExtensionPay.js**

```bash
cd extensions/reformat
curl -o src/lib/ExtensionPay.js https://extensionpay.com/ExtensionPay.js
```

- [ ] **Step 4: Integrate ExtensionPay into popup.js**

Add to the top of `extensions/reformat/src/popup/popup.js`:
```js
import ExtPay from '../lib/ExtensionPay.js';

const extpay = ExtPay('YOUR-EXTENSIONPAY-ID'); // Replace with actual ID
extpay.startBackground();
```

Replace the `isPremium` variable initialization and add a check:
```js
let isPremium = false;

// Check premium status on load
async function checkPremium() {
  try {
    const user = await extpay.getUser();
    isPremium = user.paid;
  } catch (e) {
    isPremium = false;
  }
}
```

Update the `init()` function to call `checkPremium()` before rendering:
```js
async function init() {
  await checkPremium();
  renderFormats();
  updatePremiumUI();
  await updateUsageBadge();
  // ... rest of init
}
```

Update the upgrade button handler:
```js
btnUpgrade.addEventListener('click', () => {
  extpay.openPaymentPage();
});
```

- [ ] **Step 5: Test the payment flow manually**

1. Reload extension in `chrome://extensions/`
2. Use all 5 free reformats
3. Click "Upgrade" — verify ExtensionPay payment page opens
4. Use ExtensionPay test mode to simulate a payment
5. Verify premium features unlock (tone selector visible, locked formats accessible, no daily limit)

Expected: Full freemium flow works end to end.

- [ ] **Step 6: Commit**

```bash
git add extensions/reformat/src/lib/ExtensionPay.js extensions/reformat/src/popup/popup.js extensions/reformat/manifest.json
git commit -m "feat: integrate ExtensionPay for freemium subscription billing"
```

---

## Task 11: Chrome Web Store Publishing

**Files:** No code changes — this is a publishing workflow.

- [ ] **Step 1: Create store listing assets**

Create the following for the Chrome Web Store listing:
- Extension icon: 128x128 PNG (final polished version, replace placeholder)
- Promo images: 1280x800 and 440x280 screenshots
- Description (first 132 characters are critical for search):

```
Highlight any text, instantly reformat for LinkedIn, X, email & more. One-click content repurposing powered by AI. Free — 5/day.
```

Full description should cover:
- What it does (1 sentence)
- How it works (3 bullet points)
- Free vs Premium features
- Privacy: "Your text is processed securely. We never store your content."

- [ ] **Step 2: Register as a Chrome Web Store developer**

1. Go to https://chrome.google.com/webstore/devconsole/
2. Pay the one-time $5 developer registration fee
3. Verify your identity

- [ ] **Step 3: Package and upload**

```bash
cd extensions/reformat
# Remove dev files from the package
zip -r reformat-v0.1.0.zip manifest.json src/ icons/ -x "*/node_modules/*" "*/tests/*" "*/proxy/*" "*/.DS_Store"
```

Upload the zip to the Chrome Web Store developer console.

- [ ] **Step 4: Submit for review**

Fill in:
- Category: "Productivity" (or test with a less crowded category like "Social & Communication")
- Language: English
- Single purpose description: "Reformats highlighted text for social media and email platforms"
- Permissions justification: activeTab (to read selected text), contextMenus (right-click reformat), storage (usage tracking)

Submit for review. Typical review time: 1-3 business days.

- [ ] **Step 5: Commit the final version**

```bash
git add extensions/reformat/icons/
git commit -m "feat: add final icons and prepare for Chrome Web Store submission"
```

---

## Phase 1 Note: Expired Extension Quick Wins

Phase 1 (expired extension replacements) requires a dedicated research session before implementation planning:

1. Mine the expired extension database (BuildThatExtension.com / Chrome Goldmine)
2. Filter for: 5K-50K users, simple functionality, clear premium angle, no existing replacement
3. Pick 1-2 targets
4. Write a mini implementation plan for each (same structure as above but much shorter — these are simpler extensions)

This research session should happen before or in parallel with the Content Repurposer build. Each expired extension replacement will use the same patterns established here (MV3 manifest, ExtensionPay, Chrome Web Store publishing).

---

## Run All Tests

At any point during development, run the full test suite:

```bash
cd extensions/reformat && npx vitest run
```

Expected: All tests in `tests/` pass (storage, usage, formats, api).
