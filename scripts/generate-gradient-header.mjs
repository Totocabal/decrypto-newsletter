#!/usr/bin/env node
// Génère une image PNG 640×4 avec le dégradé du liseret d'en-tête
// et l'upload dans Supabase Storage (bucket newsletter-images, path shared/gradient-header.png)

import { deflateSync } from "zlib";

// ── couleurs du dégradé (de buildEmail.js / theme.js) ─────────────────────
const STOPS = [
  { pct: 0.00, r: 0x41, g: 0x41, b: 0xFF }, // #4141FF accentSecondary
  { pct: 0.30, r: 0x87, g: 0x01, b: 0xFF }, // #8701FF accentTertiary
  { pct: 0.60, r: 0xFF, g: 0x00, b: 0xAA }, // #FF00AA accentPrimary
  { pct: 1.00, r: 0xFF, g: 0x4B, b: 0x28 }, // #FF4B28 accentWarm
];

const W = 640;
const H = 4;

// ── interpolation linéaire entre les stops ────────────────────────────────
function lerp(a, b, t) { return Math.round(a + (b - a) * t); }

function colorAt(x) {
  const pct = x / (W - 1);
  for (let i = 0; i < STOPS.length - 1; i++) {
    const s0 = STOPS[i], s1 = STOPS[i + 1];
    if (pct <= s1.pct) {
      const t = (pct - s0.pct) / (s1.pct - s0.pct);
      return [lerp(s0.r, s1.r, t), lerp(s0.g, s1.g, t), lerp(s0.b, s1.b, t)];
    }
  }
  const s = STOPS[STOPS.length - 1];
  return [s.r, s.g, s.b];
}

// ── génération des données PNG (scanlines) ────────────────────────────────
// Chaque ligne : filtre 0 (None) + RGB × W
const scanlines = [];
for (let y = 0; y < H; y++) {
  scanlines.push(0); // filter byte
  for (let x = 0; x < W; x++) {
    const [r, g, b] = colorAt(x);
    scanlines.push(r, g, b);
  }
}
const rawPixels = Buffer.from(scanlines);

// ── CRC32 (pure JS) ───────────────────────────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, "ascii");
  const lenBuf = Buffer.allocUnsafe(4);
  lenBuf.writeUInt32BE(data.length);
  const crcInput = Buffer.concat([typeBytes, data]);
  const crcBuf = Buffer.allocUnsafe(4);
  crcBuf.writeUInt32BE(crc32(crcInput));
  return Buffer.concat([lenBuf, typeBytes, data, crcBuf]);
}

// ── IHDR ──────────────────────────────────────────────────────────────────
const ihdrData = Buffer.allocUnsafe(13);
ihdrData.writeUInt32BE(W, 0);
ihdrData.writeUInt32BE(H, 4);
ihdrData[8] = 8;  // bit depth
ihdrData[9] = 2;  // color type: RGB
ihdrData[10] = 0; // compression
ihdrData[11] = 0; // filter
ihdrData[12] = 0; // interlace

// ── IDAT (zlib deflate) ───────────────────────────────────────────────────
const compressed = deflateSync(rawPixels, { level: 9 });

// ── assemblage PNG ────────────────────────────────────────────────────────
const PNG_SIG = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
const pngBuffer = Buffer.concat([
  PNG_SIG,
  chunk("IHDR", ihdrData),
  chunk("IDAT", compressed),
  chunk("IEND", Buffer.alloc(0)),
]);

// ── sauvegarde dans public/ ────────────────────────────────────────────────
import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(__dirname, "../public/gradient-header.png");

writeFileSync(outPath, pngBuffer);
console.log(`✓ PNG ${W}×${H} généré : ${outPath}`);
