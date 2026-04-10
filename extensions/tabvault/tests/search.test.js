import { describe, it, expect } from 'vitest';
import { searchGroups } from '../src/lib/search.js';

const sampleGroups = [
  {
    id: 'group_1',
    createdAt: 1712764800000,
    title: '3 tabs — Apr 10, 2026',
    customName: 'Work Research',
    color: 'blue',
    tabs: [
      { url: 'https://example.com/docs', title: 'API Documentation', favIconUrl: '' },
      { url: 'https://github.com/repo', title: 'GitHub Repository', favIconUrl: '' },
      { url: 'https://stackoverflow.com/q/123', title: 'Stack Overflow Question', favIconUrl: '' },
    ],
  },
  {
    id: 'group_2',
    createdAt: 1712678400000,
    title: '2 tabs — Apr 9, 2026',
    tabs: [
      { url: 'https://news.ycombinator.com', title: 'Hacker News', favIconUrl: '' },
      { url: 'https://reddit.com/r/programming', title: 'Reddit Programming', favIconUrl: '' },
    ],
  },
  {
    id: 'group_3',
    createdAt: 1712592000000,
    title: '1 tab — Apr 8, 2026',
    customName: 'Shopping',
    color: 'green',
    tabs: [
      { url: 'https://amazon.com/product/123', title: 'Amazon Product Page', favIconUrl: '' },
    ],
  },
];

describe('searchGroups', () => {
  it('returns all groups when query is empty', () => {
    const result = searchGroups(sampleGroups, '');
    expect(result).toHaveLength(3);
  });

  it('returns all groups when query is whitespace', () => {
    const result = searchGroups(sampleGroups, '   ');
    expect(result).toHaveLength(3);
  });

  it('matches by group title', () => {
    const result = searchGroups(sampleGroups, 'Apr 10');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('group_1');
  });

  it('matches by custom name', () => {
    const result = searchGroups(sampleGroups, 'Shopping');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('group_3');
  });

  it('matches by tab title', () => {
    const result = searchGroups(sampleGroups, 'Hacker News');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('group_2');
  });

  it('matches by tab URL', () => {
    const result = searchGroups(sampleGroups, 'github.com');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('group_1');
  });

  it('is case-insensitive', () => {
    const result = searchGroups(sampleGroups, 'GITHUB');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('group_1');
  });

  it('returns multiple matching groups', () => {
    const result = searchGroups(sampleGroups, 'com');
    // All groups have tabs with .com URLs
    expect(result).toHaveLength(3);
  });

  it('returns empty array when no matches', () => {
    const result = searchGroups(sampleGroups, 'xyznonexistent');
    expect(result).toHaveLength(0);
  });

  it('marks matching tabs within groups', () => {
    const result = searchGroups(sampleGroups, 'github');
    expect(result).toHaveLength(1);
    expect(result[0].matchingTabIndices).toBeDefined();
    expect(result[0].matchingTabIndices).toContain(1); // github.com/repo is index 1
  });

  it('handles groups without customName gracefully', () => {
    const result = searchGroups(sampleGroups, 'Hacker');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('group_2');
  });

  it('handles empty groups array', () => {
    const result = searchGroups([], 'test');
    expect(result).toEqual([]);
  });

  it('matches partial strings', () => {
    const result = searchGroups(sampleGroups, 'stack');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('group_1');
  });
});
