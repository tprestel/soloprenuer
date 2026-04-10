import { describe, it, expect } from 'vitest';
import { parseTimedTextXml } from '../../src/lib/transcript-fetcher.js';

const MOCK_XML = `<?xml version="1.0" encoding="utf-8"?>
<transcript>
  <text start="0.0" dur="3.2">Hello everyone welcome</text>
  <text start="3.2" dur="2.8">to this video about</text>
  <text start="6.0" dur="4.1">AI automation tools</text>
  <text start="10.1" dur="3.0">let&apos;s get started</text>
</transcript>`;

const EMPTY_XML = `<?xml version="1.0" encoding="utf-8"?>
<transcript></transcript>`;

describe('transcript-fetcher — parseTimedTextXml', () => {
  it('parses XML into segments with start, duration, and text', () => {
    const segments = parseTimedTextXml(MOCK_XML);
    expect(segments).toHaveLength(4);
    expect(segments[0]).toEqual({ start: 0.0, duration: 3.2, text: 'Hello everyone welcome' });
    expect(segments[1]).toEqual({ start: 3.2, duration: 2.8, text: 'to this video about' });
    expect(segments[2]).toEqual({ start: 6.0, duration: 4.1, text: 'AI automation tools' });
  });

  it('decodes HTML entities in text', () => {
    const segments = parseTimedTextXml(MOCK_XML);
    expect(segments[3].text).toBe("let's get started");
  });

  it('returns empty array for empty transcript', () => {
    const segments = parseTimedTextXml(EMPTY_XML);
    expect(segments).toEqual([]);
  });

  it('handles &amp; &lt; &gt; &quot; entities', () => {
    const xml = `<transcript><text start="0" dur="1">A &amp; B &lt;C&gt; &quot;D&quot;</text></transcript>`;
    const segments = parseTimedTextXml(xml);
    expect(segments[0].text).toBe('A & B <C> "D"');
  });
});
