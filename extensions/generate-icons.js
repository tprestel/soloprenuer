const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const SIZES = [16, 32, 48, 128];

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function generateCleanNoteIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const r = size * 0.2;

  // Background
  roundedRect(ctx, 0, 0, size, size, r);
  ctx.fillStyle = '#F5A623';
  ctx.fill();

  // Pencil icon — draw a simple angled pencil
  ctx.save();
  ctx.translate(size / 2, size / 2);
  ctx.rotate(-Math.PI / 4); // 45 degree angle

  const s = size; // shorthand
  const bodyW = s * 0.16;
  const bodyH = s * 0.48;

  ctx.fillStyle = '#FFFFFF';

  // Pencil body (rectangle)
  ctx.fillRect(-bodyW / 2, -bodyH / 2, bodyW, bodyH);

  // Pencil tip (triangle at bottom)
  ctx.beginPath();
  ctx.moveTo(-bodyW / 2, bodyH / 2);
  ctx.lineTo(bodyW / 2, bodyH / 2);
  ctx.lineTo(0, bodyH / 2 + s * 0.1);
  ctx.closePath();
  ctx.fill();

  // Eraser band at top (small darker rectangle)
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillRect(-bodyW / 2, -bodyH / 2, bodyW, s * 0.06);

  ctx.restore();

  return canvas.toBuffer('image/png');
}

function generateTabVaultIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const r = size * 0.2;

  // Background
  roundedRect(ctx, 0, 0, size, size, r);
  ctx.fillStyle = '#3B82F6';
  ctx.fill();

  // Folder icon
  const s = size;
  const margin = s * 0.2;
  const folderL = margin;
  const folderR = s - margin;
  const folderT = s * 0.32;
  const folderB = s - margin;
  const folderW = folderR - folderL;
  const folderH = folderB - folderT;
  const tabW = folderW * 0.4;
  const tabH = s * 0.1;
  const tabR = Math.max(1, s * 0.04);
  const bodyR = Math.max(1, s * 0.06);

  ctx.fillStyle = '#FFFFFF';

  // Tab notch on top-left of folder
  roundedRect(ctx, folderL, folderT - tabH, tabW, tabH + tabR, tabR);
  ctx.fill();

  // Folder body
  roundedRect(ctx, folderL, folderT, folderW, folderH, bodyR);
  ctx.fill();

  return canvas.toBuffer('image/png');
}

// Generate all icons
const configs = [
  { name: 'CleanNote', dir: 'cleannote', generate: generateCleanNoteIcon },
  { name: 'TabVault', dir: 'tabvault', generate: generateTabVaultIcon },
];

for (const cfg of configs) {
  for (const size of SIZES) {
    const outDir = path.join(__dirname, cfg.dir, 'icons');
    fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, `icon${size}.png`);
    const buf = cfg.generate(size);
    fs.writeFileSync(outPath, buf);
    console.log(`${cfg.name} icon${size}.png — ${buf.length} bytes`);
  }
}

console.log('\nAll icons generated successfully.');
