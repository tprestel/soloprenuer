import { describe, it, expect } from 'vitest';
import { QUOTES, getRandomQuote, getDailyQuote } from '../src/lib/quotes.js';

describe('Quotes module', () => {
  it('QUOTES array has at least 30 entries', () => {
    expect(QUOTES.length).toBeGreaterThanOrEqual(30);
  });

  it('each quote has text and author strings', () => {
    for (const quote of QUOTES) {
      expect(typeof quote.text).toBe('string');
      expect(quote.text.length).toBeGreaterThan(0);
      expect(typeof quote.author).toBe('string');
      expect(quote.author.length).toBeGreaterThan(0);
    }
  });

  it('getRandomQuote returns a valid quote object', () => {
    const quote = getRandomQuote();
    expect(quote).toHaveProperty('text');
    expect(quote).toHaveProperty('author');
    expect(typeof quote.text).toBe('string');
    expect(typeof quote.author).toBe('string');
  });

  it('getDailyQuote returns the same quote when called multiple times on the same day', () => {
    const q1 = getDailyQuote();
    const q2 = getDailyQuote();
    const q3 = getDailyQuote();
    expect(q1).toEqual(q2);
    expect(q2).toEqual(q3);
  });

  it('getDailyQuote returns a valid quote object', () => {
    const quote = getDailyQuote();
    expect(quote).toHaveProperty('text');
    expect(quote).toHaveProperty('author');
    expect(typeof quote.text).toBe('string');
    expect(typeof quote.author).toBe('string');
  });
});
