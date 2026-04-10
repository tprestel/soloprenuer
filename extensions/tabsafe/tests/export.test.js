import { describe, it, expect } from 'vitest';
import { exportAsJSON, exportAsMarkdown, exportAsHTML } from '../src/lib/export.js';

const sampleGroups = [
  {
    id: 'group_1',
    createdAt: 1712764800000,
    title: '2 tabs — Apr 10, 2026',
    tabs: [
      { url: 'https://example.com', title: 'Example Site', favIconUrl: 'https://example.com/icon.png' },
      { url: 'https://test.com/page?q=hello&lang=en', title: 'Test Page', favIconUrl: '' },
    ],
  },
  {
    id: 'group_2',
    createdAt: 1712678400000,
    title: '1 tab — Apr 9, 2026',
    tabs: [
      { url: 'https://another.com', title: 'Another', favIconUrl: '' },
    ],
  },
];

describe('exportAsJSON', () => {
  it('returns valid JSON containing all groups and tabs', () => {
    const result = exportAsJSON(sampleGroups);
    const parsed = JSON.parse(result);

    expect(parsed).toHaveLength(2);
    expect(parsed[0].tabs).toHaveLength(2);
    expect(parsed[1].tabs[0].url).toBe('https://another.com');
  });

  it('handles empty groups array', () => {
    const result = exportAsJSON([]);
    expect(JSON.parse(result)).toEqual([]);
  });
});

describe('exportAsMarkdown', () => {
  it('has group headings and [title](url) links', () => {
    const result = exportAsMarkdown(sampleGroups);

    expect(result).toContain('## 2 tabs — Apr 10, 2026');
    expect(result).toContain('[Example Site](https://example.com)');
    expect(result).toContain('[Test Page](https://test.com/page?q=hello&lang=en)');
    expect(result).toContain('## 1 tab — Apr 9, 2026');
    expect(result).toContain('[Another](https://another.com)');
  });

  it('handles empty groups array', () => {
    const result = exportAsMarkdown([]);
    expect(result).toContain('TabVault');
    expect(result).not.toContain('##');
  });
});

describe('exportAsHTML', () => {
  it('contains <a href> tags and is valid HTML', () => {
    const result = exportAsHTML(sampleGroups);

    expect(result).toContain('<!DOCTYPE html>');
    expect(result).toContain('<html');
    expect(result).toContain('</html>');
    expect(result).toContain('<a href="https://example.com"');
    expect(result).toContain('Example Site');
    expect(result).toContain('<a href="https://another.com"');
  });

  it('handles empty groups array', () => {
    const result = exportAsHTML([]);
    expect(result).toContain('<!DOCTYPE html>');
    expect(result).toContain('TabVault');
  });
});
