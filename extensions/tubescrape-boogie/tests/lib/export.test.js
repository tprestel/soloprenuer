import { describe, it, expect } from 'vitest';
import { exportPlainText, exportMarkdown, exportCsv, exportJson, exportSrt, exportAiPrompt } from '../../src/lib/export.js';

const SEGMENTS = [
  { start: 0, duration: 3.2, text: 'Hello everyone welcome' },
  { start: 3.2, duration: 2.8, text: 'to this video.' },
  { start: 65, duration: 4.1, text: 'Now let us talk about AI.' },
];

const META = {
  title: 'Test Video',
  channel: 'Test Channel',
  publishDate: '2026-03-15',
  viewCount: 125000,
};

describe('export — plainText', () => {
  it('formats as timestamp + text per line', () => {
    const result = exportPlainText(SEGMENTS, META);
    expect(result).toContain('0:00 Hello everyone welcome');
    expect(result).toContain('0:03 to this video.');
    expect(result).toContain('1:05 Now let us talk about AI.');
  });

  it('includes title header', () => {
    const result = exportPlainText(SEGMENTS, META);
    expect(result).toContain('Test Video');
  });
});

describe('export — markdown', () => {
  it('formats with bold timestamps', () => {
    const result = exportMarkdown(SEGMENTS, META);
    expect(result).toContain('**0:00** Hello everyone welcome');
    expect(result).toContain('# Test Video');
  });

  it('includes metadata block', () => {
    const result = exportMarkdown(SEGMENTS, META);
    expect(result).toContain('Test Channel');
    expect(result).toContain('125,000');
  });
});

describe('export — CSV', () => {
  it('outputs timestamp,text rows with header', () => {
    const result = exportCsv(SEGMENTS);
    const lines = result.split('\n');
    expect(lines[0]).toBe('timestamp,start_seconds,text');
    expect(lines[1]).toBe('"0:00",0,"Hello everyone welcome"');
  });

  it('escapes quotes in text', () => {
    const segs = [{ start: 0, duration: 1, text: 'He said "hello"' }];
    const result = exportCsv(segs);
    expect(result).toContain('"He said ""hello"""');
  });
});

describe('export — JSON', () => {
  it('outputs valid JSON with metadata and segments', () => {
    const result = exportJson(SEGMENTS, META);
    const parsed = JSON.parse(result);
    expect(parsed.metadata.title).toBe('Test Video');
    expect(parsed.segments).toHaveLength(3);
    expect(parsed.segments[0].text).toBe('Hello everyone welcome');
  });
});

describe('export — SRT', () => {
  it('outputs standard SRT format', () => {
    const result = exportSrt(SEGMENTS);
    const blocks = result.trim().split('\n\n');
    expect(blocks).toHaveLength(3);
    expect(blocks[0]).toContain('1');
    expect(blocks[0]).toContain('00:00:00,000 --> 00:00:03,200');
    expect(blocks[0]).toContain('Hello everyone welcome');
  });
});

describe('export — AI prompt', () => {
  it('wraps transcript with context framing', () => {
    const result = exportAiPrompt(SEGMENTS, META);
    expect(result).toContain('Test Video');
    expect(result).toContain('Test Channel');
    expect(result).toContain('Hello everyone welcome');
    expect(result).toContain('transcript');
  });
});
