import { formatTimestamp } from './formatter.js';

export function exportPlainText(segments, meta) {
  const header = `${meta.title}\nChannel: ${meta.channel}\nPublished: ${meta.publishDate}\n\n`;
  const lines = segments.map(s => `${formatTimestamp(s.start)} ${s.text}`);
  return header + lines.join('\n');
}

export function exportMarkdown(segments, meta) {
  const header = [
    `# ${meta.title}`,
    '',
    `- **Channel:** ${meta.channel}`,
    `- **Published:** ${meta.publishDate}`,
    `- **Views:** ${meta.viewCount.toLocaleString()}`,
    '',
    '---',
    '',
  ].join('\n');
  const lines = segments.map(s => `**${formatTimestamp(s.start)}** ${s.text}`);
  return header + lines.join('\n\n');
}

function csvEscape(text) {
  return '"' + text.replace(/"/g, '""') + '"';
}

export function exportCsv(segments) {
  const header = 'timestamp,start_seconds,text';
  const rows = segments.map(s =>
    `${csvEscape(formatTimestamp(s.start))},${s.start},${csvEscape(s.text)}`
  );
  return [header, ...rows].join('\n');
}

export function exportJson(segments, meta) {
  return JSON.stringify({ metadata: meta, segments }, null, 2);
}

function srtTimestamp(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

export function exportSrt(segments) {
  return segments
    .map((s, i) => {
      const startTs = srtTimestamp(s.start);
      const endTs = srtTimestamp(s.start + s.duration);
      return `${i + 1}\n${startTs} --> ${endTs}\n${s.text}`;
    })
    .join('\n\n');
}

export function exportAiPrompt(segments, meta) {
  const transcript = segments.map(s => s.text).join(' ');
  return [
    `The following is a transcript from a YouTube video:`,
    '',
    `Title: ${meta.title}`,
    `Channel: ${meta.channel}`,
    `Published: ${meta.publishDate}`,
    `Views: ${meta.viewCount.toLocaleString()}`,
    '',
    '--- BEGIN TRANSCRIPT ---',
    '',
    transcript,
    '',
    '--- END TRANSCRIPT ---',
  ].join('\n');
}
