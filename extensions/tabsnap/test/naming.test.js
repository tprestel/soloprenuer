const test = require('node:test');
const assert = require('node:assert');
const { slugForUrl, assignUniqueSlugs } = require('../src/lib/naming.js');

test('root path -> home', () => {
  assert.equal(slugForUrl('https://a.co/'), 'home');
});
test('nested path -> hyphenated slug', () => {
  assert.equal(slugForUrl('https://a.co/blog/post-x/'), 'blog-post-x');
});
test('query/unsafe chars dropped', () => {
  assert.equal(slugForUrl('https://a.co/p?x=1&y=2'), 'p');
});
test('collisions get numeric suffixes', () => {
  const r = assignUniqueSlugs(['https://a.co/blog/x', 'https://a.co/blog/x/']);
  assert.deepEqual(r.map(o => o.slug), ['blog-x', 'blog-x-2']);
});
