export function extractPlaylistId(url) {
  try {
    const u = new URL(url);
    return u.searchParams.get('list') || null;
  } catch {
    return null;
  }
}

export function extractVideoIdsFromPlaylist(html) {
  const match = html.match(/var\s+ytInitialData\s*=\s*(\{.+?\});/s);
  if (!match) return [];
  try {
    const data = JSON.parse(match[1]);
    const tabs = data?.contents?.twoColumnBrowseResultsRenderer?.tabs || [];
    const ids = [];
    for (const tab of tabs) {
      const contents = tab?.tabRenderer?.content?.sectionListRenderer?.contents || [];
      for (const section of contents) {
        const items = section?.itemSectionRenderer?.contents || [];
        for (const item of items) {
          const videos = item?.playlistVideoListRenderer?.contents || [];
          for (const v of videos) {
            const videoId = v?.playlistVideoRenderer?.videoId;
            if (videoId) ids.push(videoId);
          }
        }
      }
    }
    return ids;
  } catch {
    return [];
  }
}
