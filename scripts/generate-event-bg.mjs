#!/usr/bin/env node
// Génère un PNG 600×600 du fond radial du bloc Event (dark theme)
// et le sauvegarde dans public/event-bg.png

import { deflateSync } from "zlib";
import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const W = 600;
const H = 600;

// Couleurs du thème dark
const BASE  = { r: 21,  g: 21,  b: 26  }; // #15151A bgEventCard
const BLUE  = { r: 65,  g: 65,  b: 255 }; // #4141FF accentSecondary
const PINK  = { r: 255, g: 0,   b: 170 }; // #FF00AA accentPrimary

// Rayons des gradients CSS :
// radial-gradient(ellipse at 0% 100%, BLUE 0%, transparent 60%)
// radial-gradient(ellipse at 100% 0%, PINK 0%, transparent 50%)
const diag = Math.sqrt(W * W + H * H);
const R1 = 0.60 * diag; // rayon gradient bleu  (depuis coin bas-gauche)
const R2 = 0.50 * diag; // rayon gradient rose   (depuis coin haut-droit)

const scanlines = [];
for (let y = 0; y < H; y++) {
  scanlines.push(0); // filtre PNG None
  for (let x = 0; x < W; x++) {
    // distance depuis (0, H) = coin bas-gauche
    const d1 = Math.sqrt(x * x + (y - H) * (y - H));
    // distance depuis (W, 0) = coin haut-droit
    const d2 = Math.sqrt((x - W) * (x - W) + y * y);

    const a1 = Math.max(0, 1 - d1 / R1); // alpha bleu
    const a2 = Math.max(0, 1 - d2 / R2); // alpha rose

    // Compositing source-over : base → bleu → rose
    const r1 = a1 * BLUE.r + (1 - a1) * BASE.r;
    const g1 = a1 * BLUE.g + (1 - a1) * BASE.g;
    const b1 = a1 * BLUE.b + (1 - a1) * BASE.b;

    const r = Math.round(a2 * PINK.r + (1 - a2) * r1);
    const g = Math.round(a2 * PINK.g + (1 - a2) * g1);
    const b = Math.round(a2 * PINK.b + (1 - a2) * b1);

    scanlines.push(r, g, b);
  }
}

const rawPixels = Buffer.from(scanlines);

// ── CRC32 ────────────────────────────────────────────────────────────────────
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
  const crcBuf = Buffer.allocUnsafe(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])));
  return Buffer.concat([lenBuf, typeBytes, data, crcBuf]);
}

const ihdrData = Buffer.allocUnsafe(13);
ihdrData.writeUInt32BE(W, 0);
ihdrData.writeUInt32BE(H, 4);
ihdrData[8] = 8; ihdrData[9] = 2; ihdrData[10] = 0; ihdrData[11] = 0; ihdrData[12] = 0;

const compressed = deflateSync(rawPixels, { level: 9 });
const PNG_SIG = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
const pngBuffer = Buffer.concat([
  PNG_SIG,
  chunk("IHDR", ihdrData),
  chunk("IDAT", compressed),
  chunk("IEND", Buffer.alloc(0)),
]);

const outPath = resolve(__dirname, "../public/event-bg.png");
writeFileSync(outPath, pngBuffer);
console.log(`✓ PNG ${W}×${H} généré : ${outPath}`);
