/**
 * Lightweight markdown parser for TabQuill.
 * Handles: headings, bold, italic, links, lists, code blocks,
 * inline code, blockquotes, horizontal rules, paragraphs.
 */

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function parseInline(text) {
  // Inline code first (protect from further processing)
  let result = '';
  let remaining = text;

  // Process inline code spans
  const parts = [];
  let codeRegex = /`([^`]+)`/g;
  let lastIndex = 0;
  let match;

  while ((match = codeRegex.exec(remaining)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: remaining.slice(lastIndex, match.index) });
    }
    parts.push({ type: 'code', value: match[1] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < remaining.length) {
    parts.push({ type: 'text', value: remaining.slice(lastIndex) });
  }

  for (const part of parts) {
    if (part.type === 'code') {
      result += '<code>' + escapeHtml(part.value) + '</code>';
    } else {
      let t = part.value;
      // Bold+italic: ***text***
      t = t.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
      // Bold: **text**
      t = t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      // Italic: *text*
      t = t.replace(/\*(.+?)\*/g, '<em>$1</em>');
      // Links: [text](url)
      t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
      result += t;
    }
  }

  return result;
}

export function parseMarkdown(input) {
  const lines = input.split('\n');
  const output = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.trim().startsWith('```')) {
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(escapeHtml(lines[i]));
        i++;
      }
      i++; // skip closing ```
      output.push('<pre><code>' + codeLines.join('\n') + '</code></pre>');
      continue;
    }

    // Blank line
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Horizontal rule
    if (/^(\-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      output.push('<hr>');
      i++;
      continue;
    }

    // Heading
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      output.push(`<h${level}>${parseInline(escapeHtml(headingMatch[2]))}</h${level}>`);
      i++;
      continue;
    }

    // Blockquote
    if (line.trim().startsWith('> ')) {
      const quoteLines = [];
      while (i < lines.length && lines[i].trim().startsWith('> ')) {
        quoteLines.push(lines[i].trim().slice(2));
        i++;
      }
      output.push('<blockquote>' + quoteLines.map(l => parseInline(escapeHtml(l))).join('<br>') + '</blockquote>');
      continue;
    }

    // Unordered list
    if (/^[-*+]\s+/.test(line.trim())) {
      const items = [];
      while (i < lines.length && /^[-*+]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*+]\s+/, ''));
        i++;
      }
      output.push('<ul>' + items.map(item => '<li>' + parseInline(escapeHtml(item)) + '</li>').join('') + '</ul>');
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(line.trim())) {
      const items = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ''));
        i++;
      }
      output.push('<ol>' + items.map(item => '<li>' + parseInline(escapeHtml(item)) + '</li>').join('') + '</ol>');
      continue;
    }

    // Paragraph - collect consecutive non-blank, non-special lines
    const paraLines = [];
    while (i < lines.length && lines[i].trim() !== '' &&
      !lines[i].trim().startsWith('```') &&
      !lines[i].match(/^#{1,6}\s+/) &&
      !lines[i].trim().startsWith('> ') &&
      !/^[-*+]\s+/.test(lines[i].trim()) &&
      !/^\d+\.\s+/.test(lines[i].trim()) &&
      !/^(\-{3,}|\*{3,}|_{3,})$/.test(lines[i].trim())) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      output.push('<p>' + parseInline(escapeHtml(paraLines.join('\n'))) + '</p>');
    }
  }

  return output.join('\n');
}
