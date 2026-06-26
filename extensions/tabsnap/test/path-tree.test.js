const test = require('node:test');
const assert = require('node:assert');
const { buildTree, pagesUnder } = require('../src/lib/path-tree.js');

test('builds nested tree with page counts', () => {
  const root = buildTree([
    'https://a.co/', 'https://a.co/about',
    'https://a.co/blog/x', 'https://a.co/blog/y',
  ]);
  assert.equal(root.pages, 4); // home + about + 2 blog
  const blog = root.children.find(c => c.segment === 'blog');
  assert.equal(blog.pages, 2);
  assert.deepEqual(
    pagesUnder(blog).sort(),
    ['https://a.co/blog/x', 'https://a.co/blog/y']
  );
});

test('pagesUnder root returns every page', () => {
  const root = buildTree(['https://a.co/', 'https://a.co/blog/x']);
  assert.deepEqual(pagesUnder(root).sort(), ['https://a.co/', 'https://a.co/blog/x']);
});
