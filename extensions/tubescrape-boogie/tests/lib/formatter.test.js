import { describe, it, expect } from 'vitest';
import { formatParagraphs, formatTimestamp } from '../../src/lib/formatter.js';

describe('formatter — formatParagraphs', () => {
  it('merges sequential segments into sentences', () => {
    const segments = [
      { start: 0, duration: 2, text: 'Hello everyone' },
      { start: 2, duration: 2, text: 'welcome to this video.' },
      { start: 4, duration: 2, text: 'Today we are going to' },
      { start: 6, duration: 2, text: 'talk about something cool.' },
    ];
    const result = formatParagraphs(segments);
    expect(result).toContain('Hello everyone welcome to this video.');
    expect(result).toContain('Today we are going to talk about something cool.');
  });

  it('creates paragraph breaks on long pauses (>2s gap)', () => {
    const segments = [
      { start: 0, duration: 2, text: 'First section.' },
      { start: 5, duration: 2, text: 'Second section.' },
    ];
    const result = formatParagraphs(segments);
    expect(result).toBe('First section.\n\nSecond section.');
  });

  it('returns empty string for empty segments', () => {
    expect(formatParagraphs([])).toBe('');
  });

  it('handles single segment', () => {
    const segments = [{ start: 0, duration: 3, text: 'Just one line.' }];
    expect(formatParagraphs(segments)).toBe('Just one line.');
  });
});

describe('formatter — formatTimestamp', () => {
  it('formats seconds as mm:ss', () => {
    expect(formatTimestamp(0)).toBe('0:00');
    expect(formatTimestamp(65)).toBe('1:05');
    expect(formatTimestamp(130.7)).toBe('2:10');
  });

  it('formats seconds as h:mm:ss for 1+ hour', () => {
    expect(formatTimestamp(3661)).toBe('1:01:01');
    expect(formatTimestamp(7200)).toBe('2:00:00');
  });
});
