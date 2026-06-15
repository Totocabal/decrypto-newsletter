#!/usr/bin/env node
// Génère les PNG de fond du bloc Parrainage (dark + light)
// et les sauvegarde dans public/referral-bg-*.png

import { deflateSync } from "zlib";
import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const W = 900;
const H = 420;

const THEMES = [
  {
    name: "dark",
    base: { r: 26, g: 12, b: 46 },
    violet: { r: 135, g: 1, b: 255, a: 0.22 },
    pink: { r: 255, g: 0, b: 170, a: 0.12 },
    orange: { r: 255, g: 75, b: 40, a: 0.08 },
  },
  {
    name: "light",
    base: { r: 250, g: 247, b: 241 },
    violet: { r: 135, g: 1, b: 255, a: 0.10 },
    pink: { r: 255, g: 0, b: 170, a: 0.06 },
    orange: { r: 255, g: 75, b: 40, a: 0.05 },
  },
];

function mix(base, color, alpha) {
  return {
    r: color.r * alpha + base.r * (1 - alpha),
    g: color.g * alpha + base.g * (1 - alpha),
    b: color.b * alpha + base.b * (1 - alpha),
  };
}

function gradientAlpha(x, y, x0, y0, radius, alpha) {
  const d = Math.sqrt((x - x0) ** 2 + (y - y0) ** 2);
  return Math.max(0, 1 - d / radius) * alpha;
}

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

function writePng(theme) {
  const diag = Math.sqrt(W * W + H * H);
  const scanlines = [];
  for (let y = 0; y < H; y++) {
    scanlines.push(0);
    for (let x = 0; x < W; x++) {
      const t = (x + y) / (W + H);
      let px = mix(theme.base, theme.violet, theme.violet.a * (1 - t));
      px = mix(px, theme.pink, theme.pink.a * Math.max(0, 1 - Math.abs(t - 0.58) / 0.55));
      px = mix(px, theme.orange, theme.orange.a * t);

      const glowA = gradientAlpha(x, y, W * 0.08, H * 0.98, diag * 0.56, theme.violet.a * 0.9);
      px = mix(px, theme.violet, glowA);
      const topGlowA = gradientAlpha(x, y, W * 0.96, H * 0.05, diag * 0.48, theme.pink.a * 1.2);
      px = mix(px, theme.pink, topGlowA);

      scanlines.push(Math.round(px.r), Math.round(px.g), Math.round(px.b));
    }
  }

  const ihdrData = Buffer.allocUnsafe(13);
  ihdrData.writeUInt32BE(W, 0);
  ihdrData.writeUInt32BE(H, 4);
  ihdrData[8] = 8; ihdrData[9] = 2; ihdrData[10] = 0; ihdrData[11] = 0; ihdrData[12] = 0;
  const pngBuffer = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    chunk("IHDR", ihdrData),
    chunk("IDAT", deflateSync(Buffer.from(scanlines), { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  const outPath = resolve(__dirname, `../public/referral-bg-${theme.name}.png`);
  writeFileSync(outPath, pngBuffer);
  console.log(`✓ PNG ${W}×${H} généré : ${outPath}`);
}

THEMES.forEach(writePng);
