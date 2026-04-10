/**
 * FreshTab — New Tab Dashboard
 * Main entry point. Orchestrates all modules and UI interactions.
 */

import { getDailyGradient } from '../lib/backgrounds.js';
import { getDailyQuote } from '../lib/quotes.js';
import { getWeatherWithCache } from '../lib/weather.js';
import { loadSettings, saveSettings, DEFAULTS } from '../lib/settings.js';

// ─── Browser fallback (for non-extension contexts) ─────────────────────────
// When running outside Chrome extension (e.g. local preview), mock chrome APIs.

if (typeof chrome === 'undefined' || !chrome.storage) {
  const memStore = {};
  window.chrome = {
    storage: {
      local: {
        get: (keys, cb) => {
          const result = {};
          const keyList = Array.isArray(keys) ? keys : [keys];
          for (const k of keyList) {
            if (memStore[k] !== undefined) result[k] = memStore[k];
          }
          cb(result);
        },
        set: (items, cb) => { Object.assign(memStore, items); if (cb) cb(); },
        remove: (keys, cb) => {
          const keyList = Array.isArray(keys) ? keys : [keys];
          for (const k of keyList) delete memStore[k];
          if (cb) cb();
        },
      },
    },
    runtime: { lastError: null },
  };
}

// ─── State ──────────────────────────────────────────────────────────────────

let settings = null;
let clockInterval = null;

// ─── DOM refs ───────────────────────────────────────────────────────────────

const $ = (id) => document.getElementById(id);

const dom = {
  backdrop: document.querySelector('.backdrop'),
  time: $('time'),
  date: $('date'),
  greeting: $('greeting'),
  focusSection: $('focus-section'),
  focusLabel: $('focus-label'),
  focusInput: $('focus-input'),
  focusDisplay: $('focus-display'),
  focusText: $('focus-text'),
  focusClear: $('focus-clear'),
  weatherWidget: $('weather-widget'),
  weatherIcon: $('weather-icon'),
  weatherTemp: $('weather-temp'),
  weatherDesc: $('weather-desc'),
  quickLinks: $('quick-links'),
  quoteSection: $('quote-section'),
  quoteText: $('quote-text'),
  quoteAuthor: $('quote-author'),
  btnSettings: $('btn-settings'),
  settingsOverlay: $('settings-overlay'),
  settingsPanel: $('settings-panel'),
  settingName: $('setting-name'),
  settingWeather: $('setting-weather'),
  settingQuote: $('setting-quote'),
  settingFocus: $('setting-focus'),
  settingTempUnit: $('setting-temp-unit'),
  linksList: $('links-list'),
  btnAddLink: $('btn-add-link'),
  btnCloseSettings: $('btn-close-settings'),
};

// ─── Weather icon map (OWM icon codes → emoji) ─────────────────────────────

const WEATHER_ICONS = {
  '01d': '\u2600\uFE0F', '01n': '\uD83C\uDF19',
  '02d': '\u26C5',       '02n': '\u26C5',
  '03d': '\u2601\uFE0F', '03n': '\u2601\uFE0F',
  '04d': '\u2601\uFE0F', '04n': '\u2601\uFE0F',
  '09d': '\uD83C\uDF27\uFE0F', '09n': '\uD83C\uDF27\uFE0F',
  '10d': '\uD83C\uDF26\uFE0F', '10n': '\uD83C\uDF27\uFE0F',
  '11d': '\u26C8\uFE0F', '11n': '\u26C8\uFE0F',
  '13d': '\uD83C\uDF28\uFE0F', '13n': '\uD83C\uDF28\uFE0F',
  '50d': '\uD83C\uDF2B\uFE0F', '50n': '\uD83C\uDF2B\uFE0F',
};

// ─── Init ───────────────────────────────────────────────────────────────────

async function init() {
  settings = await loadSettings();

  applyBackground();
  startClock();
  updateGreeting();
  loadFocus();
  loadQuote();
  renderQuickLinks();
  initWeather();
  applyVisibility();
  bindEvents();
}

// ─── Background ─────────────────────────────────────────────────────────────

function applyBackground() {
  dom.backdrop.style.background = getDailyGradient();
}

// ─── Clock ──────────────────────────────────────────────────────────────────

function startClock() {
  updateClock();
  clockInterval = setInterval(updateClock, 1000);
}

function updateClock() {
  const now = new Date();

  // Time: h:mm AM/PM
  let hours = now.getHours();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  const minutes = String(now.getMinutes()).padStart(2, '0');
  dom.time.textContent = `${hours}:${minutes} ${ampm}`;

  // Date: "Thursday, April 10"
  const options = { weekday: 'long', month: 'long', day: 'numeric' };
  dom.date.textContent = now.toLocaleDateString('en-US', options);
}

// ─── Greeting ───────────────────────────────────────────────────────────────

function updateGreeting() {
  const hour = new Date().getHours();
  let period;
  if (hour < 12) period = 'morning';
  else if (hour < 17) period = 'afternoon';
  else period = 'evening';

  const name = settings.name ? `, ${settings.name}` : '';
  dom.greeting.textContent = `Good ${period}${name}`;
}

// ─── Focus ──────────────────────────────────────────────────────────────────

function getTodayKey() {
  const now = new Date();
  return `focus_${now.getFullYear()}_${now.getMonth()}_${now.getDate()}`;
}

async function loadFocus() {
  const key = getTodayKey();

  return new Promise((resolve) => {
    chrome.storage.local.get(key, (result) => {
      const todayFocus = result[key];
      if (todayFocus) {
        showFocusDisplay(todayFocus);
      } else {
        showFocusInput();
      }
      resolve();
    });
  });
}

function showFocusDisplay(text) {
  dom.focusLabel.classList.add('hidden');
  dom.focusInput.classList.add('hidden');
  dom.focusDisplay.classList.remove('hidden');
  dom.focusText.textContent = text;
}

function showFocusInput() {
  dom.focusLabel.classList.remove('hidden');
  dom.focusInput.classList.remove('hidden');
  dom.focusDisplay.classList.add('hidden');
  dom.focusInput.value = '';
}

async function saveFocus(text) {
  const key = getTodayKey();
  return new Promise((resolve) => {
    chrome.storage.local.set({ [key]: text }, resolve);
  });
}

async function clearFocus() {
  const key = getTodayKey();
  return new Promise((resolve) => {
    chrome.storage.local.remove(key, resolve);
  });
}

// ─── Weather ────────────────────────────────────────────────────────────────

async function initWeather() {
  if (!settings.showWeather) {
    dom.weatherWidget.classList.add('hidden');
    return;
  }

  // Try to get location
  if (!navigator.geolocation) {
    dom.weatherWidget.classList.add('hidden');
    return;
  }

  try {
    const pos = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        timeout: 10000,
        maximumAge: 600000, // 10 min cache
      });
    });

    const { latitude, longitude } = pos.coords;
    const weather = await getWeatherWithCache(latitude, longitude);
    displayWeather(weather);
  } catch {
    // Permission denied or error — hide widget
    dom.weatherWidget.classList.add('hidden');
  }
}

function displayWeather(weather) {
  const temp = settings.temperatureUnit === 'C'
    ? Math.round((weather.temp - 32) * 5 / 9)
    : Math.round(weather.temp);
  const unit = settings.temperatureUnit === 'C' ? '\u00B0C' : '\u00B0F';

  dom.weatherIcon.textContent = WEATHER_ICONS[weather.icon] || '\u2600\uFE0F';
  dom.weatherTemp.textContent = `${temp}${unit}`;
  dom.weatherDesc.textContent = weather.description;
  dom.weatherWidget.classList.remove('hidden');
}

// ─── Quote ──────────────────────────────────────────────────────────────────

function loadQuote() {
  if (!settings.showQuote) {
    dom.quoteSection.classList.add('hidden');
    return;
  }

  const quote = getDailyQuote();
  dom.quoteText.textContent = quote.text;
  dom.quoteAuthor.textContent = quote.author;
}

// ─── Quick Links ────────────────────────────────────────────────────────────

function renderQuickLinks() {
  dom.quickLinks.innerHTML = '';

  if (!settings.showLinks || !settings.quickLinks.length) {
    return;
  }

  settings.quickLinks.forEach((link) => {
    const a = document.createElement('a');
    a.className = 'quick-link';
    a.href = link.url;
    a.title = link.name;

    // Favicon
    try {
      const url = new URL(link.url);
      const img = document.createElement('img');
      img.className = 'quick-link-favicon';
      img.src = `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=32`;
      img.alt = '';
      img.loading = 'lazy';
      a.appendChild(img);
    } catch {
      // Invalid URL, skip favicon
    }

    const span = document.createElement('span');
    span.textContent = link.name;
    a.appendChild(span);

    dom.quickLinks.appendChild(a);
  });
}

// ─── Visibility ─────────────────────────────────────────────────────────────

function applyVisibility() {
  dom.focusSection.classList.toggle('hidden', !settings.showFocus);
  dom.quoteSection.classList.toggle('hidden', !settings.showQuote);
}

// ─── Settings Panel ─────────────────────────────────────────────────────────

function openSettings() {
  // Populate fields
  dom.settingName.value = settings.name;
  dom.settingWeather.checked = settings.showWeather;
  dom.settingQuote.checked = settings.showQuote;
  dom.settingFocus.checked = settings.showFocus;
  dom.settingTempUnit.value = settings.temperatureUnit;
  renderLinksEditor();

  dom.settingsPanel.classList.remove('hidden');
  dom.settingsOverlay.classList.remove('hidden');
}

function closeSettings() {
  dom.settingsPanel.classList.add('hidden');
  dom.settingsOverlay.classList.add('hidden');
}

async function applySettingsFromUI() {
  await saveSettings({
    name: dom.settingName.value.trim(),
    showWeather: dom.settingWeather.checked,
    showQuote: dom.settingQuote.checked,
    showFocus: dom.settingFocus.checked,
    temperatureUnit: dom.settingTempUnit.value,
    quickLinks: getLinksFromEditor(),
  });

  settings = await loadSettings();
  updateGreeting();
  applyVisibility();
  loadQuote();
  renderQuickLinks();
  initWeather();
}

// ─── Quick Links Editor ─────────────────────────────────────────────────────

function renderLinksEditor() {
  dom.linksList.innerHTML = '';
  settings.quickLinks.forEach((link, i) => {
    addLinkRow(link.name, link.url);
  });
}

function addLinkRow(name = '', url = '') {
  const row = document.createElement('div');
  row.className = 'link-row';

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.placeholder = 'Name';
  nameInput.value = name;
  nameInput.maxLength = 30;

  const urlInput = document.createElement('input');
  urlInput.type = 'text';
  urlInput.placeholder = 'https://...';
  urlInput.value = url;

  const removeBtn = document.createElement('button');
  removeBtn.className = 'link-remove';
  removeBtn.textContent = '\u00D7';
  removeBtn.title = 'Remove link';
  removeBtn.addEventListener('click', () => {
    row.remove();
  });

  row.appendChild(nameInput);
  row.appendChild(urlInput);
  row.appendChild(removeBtn);
  dom.linksList.appendChild(row);
}

function getLinksFromEditor() {
  const links = [];
  const rows = dom.linksList.querySelectorAll('.link-row');
  rows.forEach((row) => {
    const inputs = row.querySelectorAll('input');
    const name = inputs[0].value.trim();
    const url = inputs[1].value.trim();
    if (name && url) {
      // Auto-prefix https if missing
      const finalUrl = url.match(/^https?:\/\//) ? url : `https://${url}`;
      links.push({ name, url: finalUrl });
    }
  });
  return links;
}

// ─── Events ─────────────────────────────────────────────────────────────────

function bindEvents() {
  // Focus input — submit on Enter
  dom.focusInput.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
      const text = dom.focusInput.value.trim();
      if (text) {
        await saveFocus(text);
        showFocusDisplay(text);
      }
    }
  });

  // Focus clear
  dom.focusClear.addEventListener('click', async () => {
    await clearFocus();
    showFocusInput();
    dom.focusInput.focus();
  });

  // Settings open/close
  dom.btnSettings.addEventListener('click', openSettings);
  dom.btnCloseSettings.addEventListener('click', async () => {
    await applySettingsFromUI();
    closeSettings();
  });
  dom.settingsOverlay.addEventListener('click', async () => {
    await applySettingsFromUI();
    closeSettings();
  });

  // Add link
  dom.btnAddLink.addEventListener('click', () => {
    addLinkRow();
  });

  // ESC to close settings
  document.addEventListener('keydown', async (e) => {
    if (e.key === 'Escape' && !dom.settingsPanel.classList.contains('hidden')) {
      await applySettingsFromUI();
      closeSettings();
    }
  });
}

// ─── Start ──────────────────────────────────────────────────────────────────

init();
