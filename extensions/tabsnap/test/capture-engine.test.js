const test = require('node:test');
const assert = require('node:assert');
const { findContentBottomPx } = require('../src/lib/capture-engine.js');

function ctxFor(w, h, rgbaAt) {
  return { getImageData(x, y, ww) {
    const data = new Uint8ClampedArray(ww * 4);
    for (let i = 0; i < ww; i++) { const [r,g,b,a] = rgbaAt(i, y); data[i*4]=r; data[i*4+1]=g; data[i*4+2]=b; data[i*4+3]=a; }
    return { data };
  }};
}
test('trims trailing white, keeps content', () => {
  const w = 800, h = 1000;
  const ctx = ctxFor(w, h, (x, y) => (y < 600 ? [10,10,10,255] : [255,255,255,255]));
  assert.equal(findContentBottomPx(ctx, w, h), 600);
});
test('full-bleed footer at bottom -> no trim', () => {
  const w = 800, h = 1000;
  const ctx = ctxFor(w, h, (x, y) => (y >= 900 ? [16,24,32,255] : [255,255,255,255]));
  assert.equal(findContentBottomPx(ctx, w, h), 1000);
});
