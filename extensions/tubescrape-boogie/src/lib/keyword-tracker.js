function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function findKeywordMatches(text, keywords) {
  const matches = [];
  for (const kw of keywords) {
    const regex = new RegExp(escapeRegex(kw.term), 'gi');
    let m;
    while ((m = regex.exec(text)) !== null) {
      matches.push({
        term: kw.term,
        start: m.index,
        end: m.index + kw.term.length,
        color: kw.color,
      });
    }
  }
  matches.sort((a, b) => a.start - b.start);
  return matches;
}

export function countKeywordOccurrences(segments, keywords) {
  const fullText = segments.map(s => s.text).join(' ');
  const counts = {};
  for (const kw of keywords) {
    const regex = new RegExp(escapeRegex(kw.term), 'gi');
    const found = fullText.match(regex);
    counts[kw.term] = found ? found.length : 0;
  }
  return counts;
}

export function highlightKeywords(text, keywords) {
  const escaped = escapeHtml(text);
  if (keywords.length === 0) return escaped;

  const matches = findKeywordMatches(escaped, keywords.map(kw => ({
    ...kw,
    term: escapeHtml(kw.term),
  })));

  if (matches.length === 0) return escaped;

  let result = '';
  let lastIndex = 0;
  for (const m of matches) {
    result += escaped.slice(lastIndex, m.start);
    const matched = escaped.slice(m.start, m.end);
    result += `<span class="tsb-keyword" style="background-color:${m.color}">${matched}</span>`;
    lastIndex = m.end;
  }
  result += escaped.slice(lastIndex);
  return result;
}
