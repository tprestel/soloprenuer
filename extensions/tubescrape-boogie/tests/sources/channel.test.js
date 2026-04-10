import { describe, it, expect } from 'vitest';
import { extractVideoIdsFromChannel, normalizeChannelUrl } from '../../src/sources/youtube/channel.js';

const MOCK_CHANNEL_HTML = `
<script>var ytInitialData = {"contents":{"twoColumnBrowseResultsRenderer":{"tabs":[{"tabRenderer":{"content":{"richGridRenderer":{"contents":[
  {"richItemRenderer":{"content":{"videoRenderer":{"videoId":"ch_vid1"}}}},
  {"richItemRenderer":{"content":{"videoRenderer":{"videoId":"ch_vid2"}}}},
  {"richItemRenderer":{"content":{"videoRenderer":{"videoId":"ch_vid3"}}}}
]}}}}]}}};</script>
`;

describe('channel — normalizeChannelUrl', () => {
  it('appends /videos to channel URL', () => {
    expect(normalizeChannelUrl('https://www.youtube.com/@testchannel')).toBe('https://www.youtube.com/@testchannel/videos');
  });
  it('does not double-append /videos', () => {
    expect(normalizeChannelUrl('https://www.youtube.com/@testchannel/videos')).toBe('https://www.youtube.com/@testchannel/videos');
  });
});

describe('channel — extractVideoIdsFromChannel', () => {
  it('extracts video IDs from channel page HTML', () => {
    const ids = extractVideoIdsFromChannel(MOCK_CHANNEL_HTML);
    expect(ids).toEqual(['ch_vid1', 'ch_vid2', 'ch_vid3']);
  });
  it('returns empty array when no videos found', () => {
    const ids = extractVideoIdsFromChannel('<html></html>');
    expect(ids).toEqual([]);
  });
});
