/**
 * Export module — pure functions to export tab groups as JSON, Markdown, or HTML
 */

export function exportAsJSON(groups) {
  return JSON.stringify(groups, null, 2);
}

export function exportAsMarkdown(groups) {
  let md = '# TabSafe Export\n\n';

  for (const group of groups) {
    md += `## ${group.title}\n\n`;
    for (const tab of group.tabs) {
      md += `- [${tab.title}](${tab.url})\n`;
    }
    md += '\n';
  }

  return md;
}

export function exportAsHTML(groups) {
  const groupsHTML = groups
    .map(
      (group) => `
    <div class="group">
      <h2>${escapeHTML(group.title)}</h2>
      <ul>
        ${group.tabs
          .map(
            (tab) =>
              `<li><a href="${escapeHTML(tab.url)}" target="_blank" rel="noopener">${escapeHTML(tab.title)}</a></li>`
          )
          .join('\n        ')}
      </ul>
    </div>`
    )
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TabSafe Export</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 800px; margin: 2rem auto; padding: 0 1rem; color: #1a1a1a; }
    h1 { font-size: 1.5rem; }
    h2 { font-size: 1.1rem; color: #555; margin-top: 2rem; }
    ul { list-style: none; padding: 0; }
    li { padding: 0.3rem 0; }
    a { color: #3B82F6; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>TabSafe Export</h1>
  ${groupsHTML}
</body>
</html>`;
}

function escapeHTML(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
