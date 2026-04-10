import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchWeather, getCachedWeather, getWeatherWithCache } from '../src/lib/weather.js';

// Mock chrome.storage.local
const mockStorage = {};
global.chrome = {
  storage: {
    local: {
      get: vi.fn((keys, cb) => {
        const result = {};
        const keyList = Array.isArray(keys) ? keys : [keys];
        for (const k of keyList) {
          if (mockStorage[k] !== undefined) result[k] = mockStorage[k];
        }
        cb(result);
      }),
      set: vi.fn((items, cb) => {
        Object.assign(mockStorage, items);
        cb();
      }),
    },
  },
  runtime: { lastError: null },
};

describe('Weather module', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // Clear mock storage
    for (const key of Object.keys(mockStorage)) delete mockStorage[key];
  });

  describe('fetchWeather', () => {
    it('calls the correct URL with lat/lon', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          main: { temp: 72 },
          weather: [{ description: 'clear sky', icon: '01d' }],
        }),
      });
      global.fetch = mockFetch;

      await fetchWeather(40.7128, -74.0060);

      expect(mockFetch).toHaveBeenCalledOnce();
      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain('lat=40.7128');
      expect(url).toContain('lon=-74.006');
      expect(url).toContain('api.openweathermap.org');
    });

    it('returns formatted weather object { temp, description, icon }', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          main: { temp: 72 },
          weather: [{ description: 'clear sky', icon: '01d' }],
        }),
      });

      const result = await fetchWeather(40.7128, -74.0060);

      expect(result).toEqual({
        temp: 72,
        description: 'clear sky',
        icon: '01d',
      });
    });

    it('throws on non-ok response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
      });

      await expect(fetchWeather(40.7128, -74.0060)).rejects.toThrow();
    });
  });

  describe('getCachedWeather', () => {
    it('returns null when no cache exists', async () => {
      const result = await getCachedWeather();
      expect(result).toBeNull();
    });

    it('returns data when cache is fresh (< 30 min)', async () => {
      const weatherData = { temp: 72, description: 'clear sky', icon: '01d' };
      mockStorage.weatherCache = {
        data: weatherData,
        timestamp: Date.now() - 10 * 60 * 1000, // 10 min ago
      };

      const result = await getCachedWeather();
      expect(result).toEqual(weatherData);
    });

    it('returns null when cache is stale (> 30 min)', async () => {
      mockStorage.weatherCache = {
        data: { temp: 72, description: 'clear sky', icon: '01d' },
        timestamp: Date.now() - 31 * 60 * 1000, // 31 min ago
      };

      const result = await getCachedWeather();
      expect(result).toBeNull();
    });
  });

  describe('getWeatherWithCache', () => {
    it('uses cache when available', async () => {
      const weatherData = { temp: 72, description: 'clear sky', icon: '01d' };
      mockStorage.weatherCache = {
        data: weatherData,
        timestamp: Date.now() - 5 * 60 * 1000, // 5 min ago
      };

      global.fetch = vi.fn();

      const result = await getWeatherWithCache(40.7128, -74.0060);
      expect(result).toEqual(weatherData);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('fetches when cache is stale', async () => {
      mockStorage.weatherCache = {
        data: { temp: 60, description: 'old', icon: '01d' },
        timestamp: Date.now() - 31 * 60 * 1000, // 31 min ago
      };

      const freshData = { temp: 75, description: 'sunny', icon: '02d' };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          main: { temp: 75 },
          weather: [{ description: 'sunny', icon: '02d' }],
        }),
      });

      const result = await getWeatherWithCache(40.7128, -74.0060);
      expect(result).toEqual(freshData);
      expect(global.fetch).toHaveBeenCalledOnce();
    });
  });
});
