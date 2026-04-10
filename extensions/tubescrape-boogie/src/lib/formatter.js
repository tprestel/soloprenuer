const PAUSE_THRESHOLD = 2;

export function formatParagraphs(segments) {
  if (segments.length === 0) return '';

  const paragraphs = [];
  let currentSentences = [segments[0].text];

  for (let i = 1; i < segments.length; i++) {
    const prev = segments[i - 1];
    const curr = segments[i];
    const gap = curr.start - (prev.start + prev.duration);

    const prevEndsSentence = /[.!?]$/.test(currentSentences[currentSentences.length - 1]);

    if (gap > PAUSE_THRESHOLD || (prevEndsSentence && gap > 0.5)) {
      paragraphs.push(currentSentences.join(' '));
      currentSentences = [curr.text];
    } else {
      currentSentences.push(curr.text);
    }
  }

  if (currentSentences.length > 0) {
    paragraphs.push(currentSentences.join(' '));
  }

  return paragraphs.join('\n\n');
}

export function formatTimestamp(seconds) {
  const totalSeconds = Math.floor(seconds);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}
