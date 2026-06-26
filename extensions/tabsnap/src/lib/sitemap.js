(function (global) {
  function decodeXmlEntities(s) {
    return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"').replace(/&#0*39;/g, "'").replace(/&apos;/g, "'");
  }

  // Parse sitemap XML -> { type:'index'|'urlset', locs:[...] }.
  function parseSitemapXml(text) {
    const isIndex = /<sitemapindex[\s>]/i.test(text);
    const locs = [];
    const re = /<loc>\s*([^<\s][^<]*?)\s*<\/loc>/gi;
    let m;
    while ((m = re.exec(text)) !== null) locs.push(decodeXmlEntities(m[1].trim()));
    return { type: isIndex ? 'index' : 'urlset', locs };
  }

  // origin: "https://a.co"; fetchText(url) -> Promise<string|null>.
  async function discoverSitemapUrls(origin, fetchText, opts = {}) {
    const maxSitemaps = opts.maxSitemaps || 50;
    const seen = new Set();
    const queue = [];

    const robots = await fetchText(origin + '/robots.txt');
    if (robots) {
      for (const line of robots.split(/\r?\n/)) {
        const m = /^\s*sitemap:\s*(\S+)/i.exec(line);
        if (m) queue.push(m[1].trim());
      }
    }
    if (queue.length === 0) {
      queue.push(origin + '/sitemap.xml', origin + '/sitemap_index.xml');
    }

    const pages = new Set();
    while (queue.length && seen.size < maxSitemaps) {
      const sm = queue.shift();
      if (seen.has(sm)) continue;
      seen.add(sm);
      const xml = await fetchText(sm);
      if (!xml) continue;
      const { type, locs } = parseSitemapXml(xml);
      if (type === 'index') {
        for (const loc of locs) if (!seen.has(loc)) queue.push(loc);
      } else {
        for (const loc of locs) pages.add(loc);
      }
    }
    const urls = [...pages];
    return { urls, found: urls.length > 0, sitemapsTried: [...seen] };
  }

  const api = { parseSitemapXml, discoverSitemapUrls };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else global.TabSnapSitemap = api;
})(typeof self !== 'undefined' ? self : globalThis);
