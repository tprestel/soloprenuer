const test = require('node:test');
const assert = require('node:assert');
const { parseSitemapXml, discoverSitemapUrls } = require('../src/lib/sitemap.js');

test('parses a urlset', () => {
  const r = parseSitemapXml('<urlset><url><loc>https://a.co/x</loc></url></urlset>');
  assert.equal(r.type, 'urlset');
  assert.deepEqual(r.locs, ['https://a.co/x']);
});
test('detects a sitemap index', () => {
  const r = parseSitemapXml('<sitemapindex><sitemap><loc>https://a.co/s1.xml</loc></sitemap></sitemapindex>');
  assert.equal(r.type, 'index');
  assert.deepEqual(r.locs, ['https://a.co/s1.xml']);
});
test('decodes &amp; in loc', () => {
  const r = parseSitemapXml('<urlset><url><loc>https://a.co/x?a=1&amp;b=2</loc></url></urlset>');
  assert.deepEqual(r.locs, ['https://a.co/x?a=1&b=2']);
});
test('discovers via robots.txt + index + urlset', async () => {
  const files = {
    'https://a.co/robots.txt': 'User-agent: *\nSitemap: https://a.co/si.xml',
    'https://a.co/si.xml': '<sitemapindex><sitemap><loc>https://a.co/s1.xml</loc></sitemap></sitemapindex>',
    'https://a.co/s1.xml': '<urlset><url><loc>https://a.co/p1</loc></url><url><loc>https://a.co/p2</loc></url></urlset>',
  };
  const fetchText = async (u) => files[u] || null;
  const r = await discoverSitemapUrls('https://a.co', fetchText);
  assert.equal(r.found, true);
  assert.deepEqual(r.urls.sort(), ['https://a.co/p1', 'https://a.co/p2']);
});
test('falls back to /sitemap.xml when robots has none', async () => {
  const files = {
    'https://a.co/robots.txt': 'User-agent: *',
    'https://a.co/sitemap.xml': '<urlset><url><loc>https://a.co/only</loc></url></urlset>',
  };
  const fetchText = async (u) => files[u] || null;
  const r = await discoverSitemapUrls('https://a.co', fetchText);
  assert.deepEqual(r.urls, ['https://a.co/only']);
});
test('reports not found when nothing exists', async () => {
  const r = await discoverSitemapUrls('https://a.co', async () => null);
  assert.equal(r.found, false);
  assert.deepEqual(r.urls, []);
});
