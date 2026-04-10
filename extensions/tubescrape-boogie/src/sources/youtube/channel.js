export function normalizeChannelUrl(url) {
  return url.endsWith('/videos') ? url : url.replace(/\/?$/, '/videos');
}

export function extractVideoIdsFromChannel(html) {
  const match = html.match(/var\s+ytInitialData\s*=\s*(\{.+?\});/s);
  if (!match) return [];
  try {
    const data = JSON.parse(match[1]);
    const tabs = data?.contents?.twoColumnBrowseResultsRenderer?.tabs || [];
    const ids = [];
    for (const tab of tabs) {
      const contents = tab?.tabRenderer?.content?.richGridRenderer?.contents || [];
      for (const item of contents) {
        const videoId = item?.richItemRenderer?.content?.videoRenderer?.videoId;
        if (videoId) ids.push(videoId);
      }
    }
    return ids;
  } catch {
    return [];
  }
}
