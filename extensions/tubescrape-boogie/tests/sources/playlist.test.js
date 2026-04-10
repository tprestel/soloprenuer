import { describe, it, expect } from 'vitest';
import { extractVideoIdsFromPlaylist, extractPlaylistId } from '../../src/sources/youtube/playlist.js';

const MOCK_PLAYLIST_HTML = `
<script>var ytInitialData = {"contents":{"twoColumnBrowseResultsRenderer":{"tabs":[{"tabRenderer":{"content":{"sectionListRenderer":{"contents":[{"itemSectionRenderer":{"contents":[{"playlistVideoListRenderer":{"contents":[
  {"playlistVideoRenderer":{"videoId":"vid1","title":{"runs":[{"text":"Video 1"}]}}},
  {"playlistVideoRenderer":{"videoId":"vid2","title":{"runs":[{"text":"Video 2"}]}}},
  {"playlistVideoRenderer":{"videoId":"vid3","title":{"runs":[{"text":"Video 3"}]}}}
]}}]}}]}}}}]}}};</script>
`;

describe('playlist — extractPlaylistId', () => {
  it('extracts playlist ID from full URL', () => {
    expect(extractPlaylistId('https://www.youtube.com/playlist?list=PLabc123')).toBe('PLabc123');
  });
  it('extracts playlist ID from watch URL with list param', () => {
    expect(extractPlaylistId('https://www.youtube.com/watch?v=abc&list=PLxyz789')).toBe('PLxyz789');
  });
  it('returns null for URLs without list param', () => {
    expect(extractPlaylistId('https://www.youtube.com/watch?v=abc')).toBeNull();
  });
});

describe('playlist — extractVideoIdsFromPlaylist', () => {
  it('extracts video IDs from playlist page HTML', () => {
    const ids = extractVideoIdsFromPlaylist(MOCK_PLAYLIST_HTML);
    expect(ids).toEqual(['vid1', 'vid2', 'vid3']);
  });
  it('returns empty array when no videos found', () => {
    const ids = extractVideoIdsFromPlaylist('<html></html>');
    expect(ids).toEqual([]);
  });
});
