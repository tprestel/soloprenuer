const ENTITIES = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'",
  '&#39;': "'",
};

function decodeEntities(text) {
  return text.replace(/&(?:amp|lt|gt|quot|apos|#39);/g, match => ENTITIES[match] || match);
}

export function parseTimedTextXml(xml) {
  const segments = [];
  const regex = /<text\s+start="([^"]+)"\s+dur="([^"]+)"[^>]*>([\s\S]*?)<\/text>/g;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    segments.push({
      start: parseFloat(match[1]),
      duration: parseFloat(match[2]),
      text: decodeEntities(match[3].trim()),
    });
  }
  return segments;
}

export async function fetchTranscript(captionUrl) {
  const response = await fetch(captionUrl);
  if (!response.ok) throw new Error(`Failed to fetch captions: ${response.status}`);
  const xml = await response.text();
  return parseTimedTextXml(xml);
}
