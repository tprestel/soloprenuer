/**
 * Weather module for FreshTab.
 * Uses OpenWeatherMap free tier API with 30-minute caching.
 *
 * NOTE: Replace API_KEY with a real OpenWeatherMap API key before publishing.
 */

const API_KEY = 'OPENWEATHER_API_KEY';
const CACHE_MAX_AGE = 30 * 60 * 1000; // 30 minutes in milliseconds

/**
 * Fetch current weather from OpenWeatherMap.
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<{ temp: number, description: string, icon: string }>}
 */
export async function fetchWeather(lat, lon) {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=imperial`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Weather API error: ${response.status}`);
  }

  const data = await response.json();

  // Cache the result
  const cacheEntry = {
    data: {
      temp: data.main.temp,
      description: data.weather[0].description,
      icon: data.weather[0].icon,
    },
    timestamp: Date.now(),
  };

  chrome.storage.local.set({ weatherCache: cacheEntry }, () => {});

  return cacheEntry.data;
}

/**
 * Get cached weather data if it exists and is fresh (< 30 min old).
 * @returns {Promise<{ temp: number, description: string, icon: string } | null>}
 */
export async function getCachedWeather() {
  return new Promise((resolve) => {
    chrome.storage.local.get('weatherCache', (result) => {
      if (!result.weatherCache) {
        resolve(null);
        return;
      }

      const { data, timestamp } = result.weatherCache;
      const age = Date.now() - timestamp;

      if (age > CACHE_MAX_AGE) {
        resolve(null);
      } else {
        resolve(data);
      }
    });
  });
}

/**
 * Get weather data, using cache if available and fresh, otherwise fetching.
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<{ temp: number, description: string, icon: string }>}
 */
export async function getWeatherWithCache(lat, lon) {
  const cached = await getCachedWeather();
  if (cached) return cached;
  return fetchWeather(lat, lon);
}
