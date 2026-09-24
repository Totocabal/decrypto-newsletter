import { buildEmailHtml } from "../render/buildEmail.js";
import { minifyEmailHtml } from "./minifyEmailHtml.js";
import { SECTION_TYPES } from "../config/schema.js";

// Gmail tronque les messages dont le HTML dépasse ~102 Ko.
export const GMAIL_CLIP_LIMIT = 102 * 1024;
export const SIZE_WARN_THRESHOLD = 80 * 1024;
export const SIZE_DANGER_THRESHOLD = 95 * 1024;

// Après upload, "assets/xxx.png" devient une URL CDN Braze (~115 car.) et Braze
// réécrit chaque lien en lien de tracking (~200 car.) : on les ajoute à l'estimation.
const CDN_URL_LENGTH = 115;
const TRACKED_LINK_LENGTH = 200;
const BRAZE_FIXED_OVERHEAD = 1500;

const byteLength = (s) => new TextEncoder().encode(s).length;

function exportedHtml(state) {
  return minifyEmailHtml(buildEmailHtml(state, { assetMode: "external" }));
}

export function estimateExportSize(state) {
  const html = exportedHtml(state);
  const assetOverhead = [...html.matchAll(/assets\/[\w.-]+\.(?:png|jpe?g|gif|webp)/gi)]
    .reduce((sum, m) => sum + Math.max(0, CDN_URL_LENGTH - m[0].length), 0);
  const linkOverhead = [...html.matchAll(/href="https?:\/\/([^"]*)"/gi)]
    .reduce((sum, m) => sum + Math.max(0, TRACKED_LINK_LENGTH - m[1].length), 0);
  const bytes = byteLength(html) + assetOverhead + linkOverhead + BRAZE_FIXED_OVERHEAD;
  const level =
    bytes >= SIZE_DANGER_THRESHOLD ? "danger" : bytes >= SIZE_WARN_THRESHOLD ? "warn" : "ok";
  return { bytes, level, limit: GMAIL_CLIP_LIMIT, percent: Math.round((bytes / GMAIL_CLIP_LIMIT) * 100) };
}

export function heaviestSections(state, count = 3) {
  const total = byteLength(exportedHtml(state));
  const sections = state.sections || [];
  return sections
    .map((section, i) => {
      const without = { ...state, sections: sections.filter((_, j) => j !== i) };
      return {
        id: section.id,
        label: SECTION_TYPES[section.type]?.label || section.type,
        bytes: Math.max(0, total - byteLength(exportedHtml(without))),
      };
    })
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, count);
}

export const formatKo = (bytes) => `${(bytes / 1024).toFixed(1).replace(".", ",")} Ko`;
