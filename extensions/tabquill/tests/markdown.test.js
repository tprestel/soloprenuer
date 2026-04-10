import { describe, it, expect } from 'vitest';
import { parseMarkdown } from '../src/lib/markdown.js';

describe('markdown parser', () => {
  describe('headings', () => {
    it('renders h1', () => {
      expect(parseMarkdown('# Hello')).toContain('<h1>Hello</h1>');
    });

    it('renders h2', () => {
      expect(parseMarkdown('## Hello')).toContain('<h2>Hello</h2>');
    });

    it('renders h3 through h6', () => {
      expect(parseMarkdown('### H3')).toContain('<h3>H3</h3>');
      expect(parseMarkdown('#### H4')).toContain('<h4>H4</h4>');
      expect(parseMarkdown('##### H5')).toContain('<h5>H5</h5>');
      expect(parseMarkdown('###### H6')).toContain('<h6>H6</h6>');
    });

    it('does not render 7+ hashes as heading', () => {
      const result = parseMarkdown('####### Not a heading');
      expect(result).not.toContain('<h7>');
    });
  });

  describe('bold and italic', () => {
    it('renders bold with **', () => {
      expect(parseMarkdown('**bold**')).toContain('<strong>bold</strong>');
    });

    it('renders italic with *', () => {
      expect(parseMarkdown('*italic*')).toContain('<em>italic</em>');
    });

    it('renders bold and italic together', () => {
      const result = parseMarkdown('***both***');
      expect(result).toContain('<strong><em>both</em></strong>');
    });

    it('handles bold in the middle of text', () => {
      const result = parseMarkdown('This is **very** important');
      expect(result).toContain('This is <strong>very</strong> important');
    });
  });

  describe('links', () => {
    it('renders links', () => {
      const result = parseMarkdown('[Google](https://google.com)');
      expect(result).toContain('<a href="https://google.com"');
      expect(result).toContain('>Google</a>');
    });

    it('opens links in new tab', () => {
      const result = parseMarkdown('[test](https://example.com)');
      expect(result).toContain('target="_blank"');
      expect(result).toContain('rel="noopener noreferrer"');
    });
  });

  describe('inline code', () => {
    it('renders inline code', () => {
      expect(parseMarkdown('Use `const` keyword')).toContain('<code>const</code>');
    });

    it('does not process markdown inside inline code', () => {
      const result = parseMarkdown('`**not bold**`');
      expect(result).toContain('<code>**not bold**</code>');
      expect(result).not.toContain('<strong>');
    });
  });

  describe('code blocks', () => {
    it('renders fenced code blocks', () => {
      const input = '```\nconst x = 1;\nconst y = 2;\n```';
      const result = parseMarkdown(input);
      expect(result).toContain('<pre><code>');
      expect(result).toContain('const x = 1;');
      expect(result).toContain('</code></pre>');
    });

    it('does not process markdown inside code blocks', () => {
      const input = '```\n**not bold**\n# not heading\n```';
      const result = parseMarkdown(input);
      expect(result).not.toContain('<strong>');
      expect(result).not.toContain('<h1>');
    });
  });

  describe('unordered lists', () => {
    it('renders unordered list', () => {
      const input = '- Item 1\n- Item 2\n- Item 3';
      const result = parseMarkdown(input);
      expect(result).toContain('<ul>');
      expect(result).toContain('<li>Item 1</li>');
      expect(result).toContain('<li>Item 2</li>');
      expect(result).toContain('<li>Item 3</li>');
      expect(result).toContain('</ul>');
    });
  });

  describe('ordered lists', () => {
    it('renders ordered list', () => {
      const input = '1. First\n2. Second\n3. Third';
      const result = parseMarkdown(input);
      expect(result).toContain('<ol>');
      expect(result).toContain('<li>First</li>');
      expect(result).toContain('<li>Second</li>');
      expect(result).toContain('</ol>');
    });
  });

  describe('blockquotes', () => {
    it('renders blockquotes', () => {
      const result = parseMarkdown('> This is a quote');
      expect(result).toContain('<blockquote>');
      expect(result).toContain('This is a quote');
      expect(result).toContain('</blockquote>');
    });

    it('renders multi-line blockquotes', () => {
      const input = '> Line 1\n> Line 2';
      const result = parseMarkdown(input);
      expect(result).toContain('<blockquote>');
      expect(result).toContain('Line 1');
      expect(result).toContain('Line 2');
    });
  });

  describe('horizontal rules', () => {
    it('renders --- as horizontal rule', () => {
      const result = parseMarkdown('---');
      expect(result).toContain('<hr>');
    });

    it('renders *** as horizontal rule', () => {
      const result = parseMarkdown('***');
      expect(result).toContain('<hr>');
    });
  });

  describe('paragraphs', () => {
    it('wraps plain text in paragraphs', () => {
      const result = parseMarkdown('Hello world');
      expect(result).toContain('<p>Hello world</p>');
    });

    it('separates paragraphs by blank lines', () => {
      const input = 'First paragraph\n\nSecond paragraph';
      const result = parseMarkdown(input);
      expect(result).toContain('<p>First paragraph</p>');
      expect(result).toContain('<p>Second paragraph</p>');
    });
  });

  describe('mixed content', () => {
    it('handles a full document', () => {
      const input = [
        '# Title',
        '',
        'A paragraph with **bold** and *italic*.',
        '',
        '- List item 1',
        '- List item 2',
        '',
        '> A quote',
        '',
        '---',
        '',
        '```',
        'code here',
        '```'
      ].join('\n');
      const result = parseMarkdown(input);
      expect(result).toContain('<h1>Title</h1>');
      expect(result).toContain('<strong>bold</strong>');
      expect(result).toContain('<em>italic</em>');
      expect(result).toContain('<ul>');
      expect(result).toContain('<blockquote>');
      expect(result).toContain('<hr>');
      expect(result).toContain('<pre><code>');
    });
  });

  describe('XSS prevention', () => {
    it('escapes HTML in regular text', () => {
      const result = parseMarkdown('<script>alert("xss")</script>');
      expect(result).not.toContain('<script>');
      expect(result).toContain('&lt;script&gt;');
    });

    it('escapes HTML in code blocks', () => {
      const input = '```\n<div>test</div>\n```';
      const result = parseMarkdown(input);
      expect(result).not.toContain('<div>test</div>');
      expect(result).toContain('&lt;div&gt;');
    });
  });
});
