(function (global) {
  // "/" -> "home"; "/blog/post-x/" -> "blog-post-x"
  function slugForUrl(url) {
    let path;
    try { path = new URL(url).pathname; } catch (_) { path = String(url); }
    const slug = path
      .replace(/^\/+|\/+$/g, '')        // trim slashes
      .replace(/\//g, '-')              // separators -> hyphen
      .replace(/[^a-z0-9._-]+/gi, '-')  // unsafe -> hyphen
      .replace(/-+/g, '-')              // collapse
      .replace(/^-|-$/g, '')            // trim hyphens
      .toLowerCase();
    return slug || 'home';
  }

  // [url, ...] -> [{ url, slug }] with -2, -3 suffixes on collisions.
  function assignUniqueSlugs(urls) {
    const seen = new Map();
    return urls.map(url => {
      const base = slugForUrl(url);
      const n = (seen.get(base) || 0) + 1;
      seen.set(base, n);
      return { url, slug: n === 1 ? base : `${base}-${n}` };
    });
  }

  const api = { slugForUrl, assignUniqueSlugs };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else global.TabSnapNaming = api;
})(typeof self !== 'undefined' ? self : globalThis);
