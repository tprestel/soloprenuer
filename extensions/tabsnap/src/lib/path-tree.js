(function (global) {
  // Build a path tree. Node: { segment, path, url|null, children:[], pages }.
  function buildTree(urls) {
    const root = { segment: '', path: '/', url: null, children: [], pages: 0 };
    const index = new Map([['/', root]]);
    for (const url of urls) {
      let pathname;
      try { pathname = new URL(url).pathname; } catch (_) { continue; }
      const parts = pathname.split('/').filter(Boolean);
      let parent = root, acc = '';
      for (const part of parts) {
        acc += '/' + part;
        let node = index.get(acc);
        if (!node) {
          node = { segment: part, path: acc, url: null, children: [], pages: 0 };
          index.set(acc, node);
          parent.children.push(node);
        }
        parent = node;
      }
      parent.url = url; // leaf (or root) is a real page
    }
    countPages(root);
    return root;
  }

  function countPages(node) {
    let n = node.url ? 1 : 0;
    for (const c of node.children) n += countPages(c);
    node.pages = n;
    return n;
  }

  // All page URLs at or under a node.
  function pagesUnder(node) {
    const out = [];
    (function walk(n) { if (n.url) out.push(n.url); n.children.forEach(walk); })(node);
    return out;
  }

  const api = { buildTree, pagesUnder };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else global.TabSnapTree = api;
})(typeof self !== 'undefined' ? self : globalThis);
