import { describe, it, expect } from 'vitest';
import { findKeywordMatches, countKeywordOccurrences, highlightKeywords } from '../../src/lib/keyword-tracker.js';

describe('keyword-tracker — findKeywordMatches', () => {
  it('finds all positions of tracked keywords in text', () => {
    const text = 'We use AI automation to improve our AI automation workflow.';
    const keywords = [{ term: 'AI automation', color: '#ff6b6b' }];
    const matches = findKeywordMatches(text, keywords);
    expect(matches).toHaveLength(2);
    expect(matches[0]).toEqual({ term: 'AI automation', start: 7, end: 20, color: '#ff6b6b' });
    expect(matches[1]).toEqual({ term: 'AI automation', start: 36, end: 49, color: '#ff6b6b' });
  });

  it('is case-insensitive', () => {
    const text = 'ai AUTOMATION is great';
    const keywords = [{ term: 'AI Automation', color: '#ff0000' }];
    const matches = findKeywordMatches(text, keywords);
    expect(matches).toHaveLength(1);
  });

  it('returns empty array when no matches', () => {
    const matches = findKeywordMatches('nothing here', [{ term: 'missing', color: '#000' }]);
    expect(matches).toEqual([]);
  });

  it('handles multiple keywords', () => {
    const text = 'AI automation and workflow optimization are key.';
    const keywords = [
      { term: 'AI automation', color: '#ff0000' },
      { term: 'workflow', color: '#00ff00' },
    ];
    const matches = findKeywordMatches(text, keywords);
    expect(matches).toHaveLength(2);
  });
});

describe('keyword-tracker — countKeywordOccurrences', () => {
  it('counts occurrences of each keyword across segments', () => {
    const segments = [
      { start: 0, duration: 2, text: 'AI automation is the future' },
      { start: 2, duration: 2, text: 'we love AI automation and workflow' },
      { start: 4, duration: 2, text: 'no keywords here' },
    ];
    const keywords = [
      { term: 'AI automation', color: '#ff0000' },
      { term: 'workflow', color: '#00ff00' },
    ];
    const counts = countKeywordOccurrences(segments, keywords);
    expect(counts).toEqual({ 'AI automation': 2, 'workflow': 1 });
  });

  it('returns zero counts when no matches', () => {
    const segments = [{ start: 0, duration: 2, text: 'nothing relevant' }];
    const keywords = [{ term: 'missing', color: '#000' }];
    const counts = countKeywordOccurrences(segments, keywords);
    expect(counts).toEqual({ 'missing': 0 });
  });
});

describe('keyword-tracker — highlightKeywords', () => {
  it('wraps matched terms in span with background color', () => {
    const text = 'I love AI automation tools';
    const keywords = [{ term: 'AI automation', color: '#ff6b6b' }];
    const html = highlightKeywords(text, keywords);
    expect(html).toBe(
      'I love <span class="tsb-keyword" style="background-color:#ff6b6b">AI automation</span> tools'
    );
  });

  it('returns original text when no keywords match', () => {
    const html = highlightKeywords('nothing here', [{ term: 'missing', color: '#000' }]);
    expect(html).toBe('nothing here');
  });

  it('escapes HTML in the original text', () => {
    const html = highlightKeywords('<script>alert("xss")</script>', []);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
