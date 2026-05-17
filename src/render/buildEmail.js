// ─────────────────────────────────────────────────────────────────────────────
// Génération du HTML email Décrypto — modulaire, section par section
// ─────────────────────────────────────────────────────────────────────────────

import { THEME, EMAIL_THEMES, BRAND_LOGOS, FONTS } from "../config/theme.js";
import { computeSectionNumber } from "../config/schema.js";
import { CALLOUT_PICTOS_MAP, DEFAULT_PICTO_ID, DEFAULT_CALLOUT_COLOR, hexToRgb, buildPictoSvgHtml } from "../config/calloutPictos.js";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

export function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function escapeAttr(str = "") {
  return String(str).replace(/"/g, "&quot;");
}

function decodeStoredTextEntities(str = "") {
  return String(str)
    .replace(/&#39;|&#x27;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&");
}

function escapedOpeningTagPattern(tagName) {
  return new RegExp(`&(?:amp;)?lt;${tagName}(?:\\s+[\\s\\S]*?)?&(?:amp;)?gt;`, "gi");
}

function escapedClosingTagPattern(tagName) {
  return new RegExp(`&(?:amp;)?lt;\\/${tagName}&(?:amp;)?gt;`, "gi");
}

const RICH_TEXT_WEIGHT = 400;
const RICH_TEXT_BOLD_WEIGHT = 700;
let EMAIL_THEME = THEME;

function getEmailThemeVariant(state = {}) {
  return state.theme_variant === "light" ? "light" : "dark";
}

function setRenderTheme(state = {}) {
  EMAIL_THEME = EMAIL_THEMES[getEmailThemeVariant(state)] || THEME;
}

export function sanitizeRichText(text = "") {
  let out = escapeHtml(decodeStoredTextEntities(text));
  const listStyle = `margin:0; padding-left:20px; font-family:${FONTS.body}; font-weight:${RICH_TEXT_WEIGHT}; font-size:15px; line-height:1.65; color:${EMAIL_THEME.textSecondary};`;
  const listItemStyle = `margin:0 0 6px; font-family:${FONTS.body}; font-weight:${RICH_TEXT_WEIGHT}; font-size:15px; line-height:1.65; color:${EMAIL_THEME.textSecondary};`;
  out = out
    .replace(/&lt;br\s*\/?&gt;/gi, "<br />")
    .replace(/&lt;div&gt;/gi, "")
    .replace(/&lt;\/div&gt;/gi, "<br />")
    .replace(/&lt;p&gt;/gi, "")
    .replace(/&lt;\/p&gt;/gi, "<br />")
    .replace(escapedOpeningTagPattern("b"), `<strong style="font-weight:${RICH_TEXT_BOLD_WEIGHT};">`)
    .replace(escapedClosingTagPattern("b"), "</strong>")
    .replace(escapedOpeningTagPattern("strong"), `<strong style="font-weight:${RICH_TEXT_BOLD_WEIGHT};">`)
    .replace(escapedClosingTagPattern("strong"), "</strong>")
    .replace(/&lt;i&gt;/gi, `<em style="font-style:italic;">`)
    .replace(/&lt;\/i&gt;/gi, "</em>")
    .replace(/&lt;em&gt;/gi, `<em style="font-style:italic;">`)
    .replace(/&lt;\/em&gt;/gi, "</em>")
    .replace(/&lt;u&gt;/gi, "<u>")
    .replace(/&lt;\/u&gt;/gi, "</u>")
    .replace(/&lt;s&gt;/gi, "<s>")
    .replace(/&lt;\/s&gt;/gi, "</s>")
    .replace(/&lt;strike&gt;/gi, "<s>")
    .replace(/&lt;\/strike&gt;/gi, "</s>")
    .replace(/&lt;sup&gt;/gi, "<sup>")
    .replace(/&lt;\/sup&gt;/gi, "</sup>")
    .replace(/&lt;ul&gt;/gi, `<ul style="${listStyle}">`)
    .replace(/&lt;\/ul&gt;/gi, "</ul>")
    .replace(/&lt;ol&gt;/gi, `<ol style="${listStyle}">`)
    .replace(/&lt;\/ol&gt;/gi, "</ol>")
    .replace(/&lt;li&gt;/gi, `<li style="${listItemStyle}">`)
    .replace(/&lt;\/li&gt;/gi, "</li>")
    .replace(/&lt;a href=&quot;([^&]+)&quot;&gt;/gi,
      `<a href="$1" style="color:${EMAIL_THEME.textMuted}; text-decoration:underline;">`)
    .replace(/&lt;\/a&gt;/gi, "</a>")
    .replace(/\[([^\]\n]+)\]\((https?:\/\/[^)\s]+|mailto:[^)\s]+|#[^)\s]+)\)/gi,
      `<a href="$2" style="color:${EMAIL_THEME.textMuted}; text-decoration:underline;">$1</a>`)
    .replace(/\*\*([^*\n][\s\S]*?[^*\n])\*\*/g,
      `<strong style="font-weight:${RICH_TEXT_BOLD_WEIGHT};">$1</strong>`)
    .replace(/__([^_\n][\s\S]*?[^_\n])__/g,
      `<strong style="font-weight:${RICH_TEXT_BOLD_WEIGHT};">$1</strong>`)
    .replace(/(^|[\s>])\*([^*\n]+)\*/g, `$1<em style="font-style:italic;">$2</em>`)
    .replace(/(^|[\s>])_([^_\n]+)_/g, `$1<em style="font-style:italic;">$2</em>`)
    .replace(/^-\s+(.+)$/gm, "• $1");
  out = out.replace(/\n/g, "<br />");
  return out;
}

function toneColor(tone) {
  switch (tone) {
    case "positive": return EMAIL_THEME.positive;
    case "negative": return EMAIL_THEME.negative;
    case "warning": return EMAIL_THEME.warning;
    case "muted": return EMAIL_THEME.textMuted;
    default: return EMAIL_THEME.textMuted;
  }
}

function fgClassificationColor(cls = "") {
  const c = cls.toUpperCase();
  if (c.includes("EXTREME GREED")) return EMAIL_THEME.positiveSoft;
  if (c.includes("GREED")) return EMAIL_THEME.positive;
  if (c.includes("NEUTRAL")) return EMAIL_THEME.textDim;
  if (c.includes("EXTREME FEAR")) return EMAIL_THEME.negative;
  if (c.includes("FEAR")) return EMAIL_THEME.warning;
  return EMAIL_THEME.textMuted;
}

function sectionAnchorId(sectionId) {
  return `section-${String(sectionId || "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")}`;
}

function sectionAnchor(sectionId) {
  const id = sectionAnchorId(sectionId);
  return `<a id="${escapeAttr(id)}" name="${escapeAttr(id)}" style="display:block; line-height:0; font-size:0;">&nbsp;</a>`;
}

function renderEmailFontFaces() {
  return Object.entries(FONTS.sora || {})
    .flatMap(([weight, url]) =>
      ["Sora", "DM Sans"].map((family) => `  @font-face {
    font-family: '${family}';
    src: url('${url}') format('truetype');
    font-weight: ${weight};
    font-style: normal;
    font-display: swap;
  }`)
    )
    .join("\n");
}

function sectionTitleForIndex(sec) {
  const d = sec.data || {};
  return d.title || d.label || d.kicker || sec.type;
}

function numberedSections(sections) {
  return (sections || [])
    .map((sec) => ({
      id: sectionAnchorId(sec.id),
      number: computeSectionNumber(sections, sec.id),
      title: sectionTitleForIndex(sec),
    }))
    .filter((target) => target.number);
}

function indexHref(item, allSections) {
  const targets = numberedSections(allSections);
  const direct = item.section_id
    ? targets.find((target) => target.id === sectionAnchorId(item.section_id))
    : null;
  const byNumber = item.number
    ? targets.find((target) => target.number === item.number)
    : null;
  const byTitle = item.title
    ? targets.find((target) => target.title === item.title)
    : null;
  const target = direct || byNumber || byTitle;
  return target ? `#${target.id}` : "";
}

// ─────────────────────────────────────────────────────────────────────────────
// Visuels SVG (avec option PNG via assetMode)
// ─────────────────────────────────────────────────────────────────────────────
// Quand assetMode = "inline" (par défaut), on génère du SVG inline.
// Quand assetMode = "external", on génère <img src="assets/xxx.png"> à la place.

function logoSvg(size, color, assetMode, name) {
  if (assetMode === "external") {
    return `<img src="assets/${name}.png" width="${size}" height="${size}" alt="Coinhouse" style="display:inline-block; vertical-align:middle; border:0;" />`;
  }
  return `<svg width="${size}" height="${size}" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
    <path fill="${color}" fill-rule="evenodd" d="M32 2 L58 16 L58 48 L32 62 L6 48 L6 16 Z M22 18 L22 30 L32 36 L42 30 L42 18 L36 18 L36 26.5 L32 28.8 L28 26.5 L28 18 Z M22 46 L22 34 L32 28 L42 34 L42 46 L36 46 L36 37.5 L32 35.2 L28 37.5 L28 46 Z"/>
  </svg>`;
}

function buildChartSvg(points, assetMode, {
  priceStart = "",
  priceEnd   = "",
  priceHigh  = "",
  priceLow   = "",
} = {}) {
  if (assetMode === "external") {
    return `<img src="assets/chart.png" alt="Graphique" style="display:block; width:100%; height:auto; border:0;" />`;
  }
  if (!points || points.length < 2) return "";

  // PAD_TOP : espace pour les labels hauts (High + Start/End proches du haut)
  // PAD_BOT : espace pour le label Low
  const W = 560, PAD_TOP = 22, PAD_BOT = 18, CHART_H = 148;
  const H = PAD_TOP + CHART_H + PAD_BOT;
  const FONT = "Sora,Arial,sans-serif";
  const stepX = W / (points.length - 1);
  const n = points.length;

  // p ∈ [0,100] : 0=bas, 100=haut → y_svg = PAD_TOP + (1-p/100)*CHART_H
  const xy = points.map((p, i) => [
    +(stepX * i).toFixed(2),
    +(PAD_TOP + (1 - p / 100) * CHART_H).toFixed(2),
  ]);
  const polyline = xy.map(([x, y]) => `${x},${y}`).join(" ");
  const polygon  = `0,${PAD_TOP + CHART_H} ${polyline} ${W},${PAD_TOP + CHART_H}`;
  const first = xy[0];
  const last  = xy[n - 1];

  // Indices high/low depuis les points normalisés
  let hiIdx = 0, loIdx = 0;
  points.forEach((p, i) => {
    if (p > points[hiIdx]) hiIdx = i;
    if (p < points[loIdx]) loIdx = i;
  });
  const hiPt = xy[hiIdx];
  const loPt = xy[loIdx];
  const hiIsEdge = hiIdx === 0 || hiIdx === n - 1;
  const loIsEdge = loIdx === 0 || loIdx === n - 1;

  // ── Start (gris, gauche) ──
  const startSvg = priceStart
    ? `<circle cx="${first[0]}" cy="${first[1]}" r="4" fill="#888899" stroke="${EMAIL_THEME.bgPage}" stroke-width="1.5"/>
    <text x="4" y="${Math.max(12, first[1] - 8)}" font-family="${FONT}" font-size="11" fill="#888899" text-anchor="start">${escapeHtml(priceStart)}</text>`
    : "";

  // ── End (cyan, droite) ──
  const endSvg = priceEnd
    ? `<text x="${W - 4}" y="${Math.max(12, last[1] - 8)}" font-family="${FONT}" font-size="11" font-weight="600" fill="#00FFFF" text-anchor="end">${escapeHtml(priceEnd)}</text>`
    : "";

  // Estime la demi-largeur d'un label centré (font-size 11, ~6.5 px/char) + marge
  const halfW = (label) => Math.ceil(label.length * 6.5 / 2) + 6;
  const clampX = (x, label) => Math.max(halfW(label), Math.min(W - halfW(label), x));

  // ── High (orange) — masqué si c'est Start ou End ──
  const highSvg = (priceHigh && !hiIsEdge)
    ? `<circle cx="${hiPt[0]}" cy="${hiPt[1]}" r="4" fill="#FF8B28" stroke="${EMAIL_THEME.bgPage}" stroke-width="1.5"/>
    <text x="${clampX(hiPt[0], priceHigh)}" y="${Math.max(12, hiPt[1] - 9)}" font-family="${FONT}" font-size="11" font-weight="600" fill="#FF8B28" text-anchor="middle">${escapeHtml(priceHigh)}</text>`
    : "";

  // ── Low (rouge) — masqué si c'est Start ou End ──
  const lowSvg = (priceLow && !loIsEdge)
    ? `<circle cx="${loPt[0]}" cy="${loPt[1]}" r="4" fill="#FF4B28" stroke="${EMAIL_THEME.bgPage}" stroke-width="1.5"/>
    <text x="${clampX(loPt[0], priceLow)}" y="${Math.min(H - 4, loPt[1] + 16)}" font-family="${FONT}" font-size="11" font-weight="600" fill="#FF4B28" text-anchor="middle">${escapeHtml(priceLow)}</text>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" height="${H}" preserveAspectRatio="none" style="display:block;">
    <defs>
      <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#00FFFF" stop-opacity="0.4"/>
        <stop offset="100%" stop-color="#00FFFF" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="g2" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="${EMAIL_THEME.accentSecondary}"/>
        <stop offset="100%" stop-color="#00FFFF"/>
      </linearGradient>
    </defs>
    <line x1="0" x2="${W}" y1="${PAD_TOP + CHART_H * 0.25}" y2="${PAD_TOP + CHART_H * 0.25}" stroke="#222229" stroke-dasharray="2 4"/>
    <line x1="0" x2="${W}" y1="${PAD_TOP + CHART_H * 0.5}"  y2="${PAD_TOP + CHART_H * 0.5}"  stroke="#222229" stroke-dasharray="2 4"/>
    <line x1="0" x2="${W}" y1="${PAD_TOP + CHART_H * 0.75}" y2="${PAD_TOP + CHART_H * 0.75}" stroke="#222229" stroke-dasharray="2 4"/>
    <polygon points="${polygon}" fill="url(#g1)"/>
    <polyline points="${polyline}" fill="none" stroke="url(#g2)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${last[0]}" cy="${last[1]}" r="5" fill="#00FFFF" stroke="${EMAIL_THEME.bgPage}" stroke-width="2"/>
    ${startSvg}
    ${endSvg}
    ${highSvg}
    ${lowSvg}
  </svg>`;
}

function buildFgGauge(value, assetMode) {
  if (assetMode === "external") {
    return `<img src="assets/gauge.png" width="200" height="120" alt="Fear & Greed" style="display:block; border:0;" />`;
  }
  const v = Math.max(0, Math.min(100, parseInt(value, 10) || 0));
  const needleAngle = -90 + (v / 100) * 180;

  // Arc: center (100,100), radius 78, sweeps from left (v=0) to right (v=100) through the top.
  // For value t: SVG angle = (180 - t*1.8)°, point = (cx + r·cos θ, cy - r·sin θ)
  const cx = 100, cy = 100, r = 78;
  const pt = (t) => {
    const a = (180 - t * 1.8) * (Math.PI / 180);
    return `${(cx + r * Math.cos(a)).toFixed(2)} ${(cy - r * Math.sin(a)).toFixed(2)}`;
  };

  // Segment boundaries: 0 | 24 | 44 | 54 | 74 | 100
  const bounds = [0, 24, 44, 54, 74, 100];
  const colors = ["#FF4B28", "#FF8B28", "#75808B", "#00BB97", EMAIL_THEME.positiveSoft];
  const segments = colors.map((c, i) =>
    `<path d="M ${pt(bounds[i])} A ${r} ${r} 0 0 1 ${pt(bounds[i + 1])}" fill="none" stroke="${c}" stroke-width="14"/>`
  ).join("\n    ");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 120" width="200" height="120">
    ${segments}
    <g transform="rotate(${needleAngle.toFixed(2)} ${cx} ${cy})">
      <line x1="${cx}" y1="${cy}" x2="${cx}" y2="26" stroke="${EMAIL_THEME.gaugeNeedle}" stroke-width="3" stroke-linecap="round"/>
      <circle cx="${cx}" cy="${cy}" r="6" fill="${EMAIL_THEME.gaugeNeedle}"/>
    </g>
  </svg>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Section header (numéro + kicker)
// ─────────────────────────────────────────────────────────────────────────────

function sectionHeader(number, kicker) {
  const cleanKicker = String(kicker || "").trim();
  if (!number && !cleanKicker) return "";
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0">
    <tr>
      ${number ? `<td style="font-family:${FONTS.heading}; font-weight:700; font-size:13px; color:${EMAIL_THEME.accentPrimary}; padding-right:12px;">${escapeHtml(number)}</td>` : ""}
      ${cleanKicker ? `<td style="font-family:${FONTS.body}; font-size:11px; letter-spacing:0.2em; text-transform:uppercase; color:${EMAIL_THEME.textMuted}; font-weight:500;">${escapeHtml(cleanKicker)}</td>` : ""}
    </tr>
  </table>`;
}

function sectionTitle(title) {
  if (!String(title || "").trim()) return "";
  return `<h2 class="em-h2" style="margin:12px 0 0; font-family:${FONTS.heading}; font-weight:600; font-size:30px; line-height:1.1; letter-spacing:-0.025em; color:${EMAIL_THEME.textPrimary};">
    ${escapeHtml(title)}
  </h2>`;
}

function sectionTitleSpaced(title) {
  if (!String(title || "").trim()) return "";
  return `<h2 class="em-h2" style="margin:12px 0 22px; font-family:${FONTS.heading}; font-weight:600; font-size:30px; line-height:1.1; letter-spacing:-0.025em; color:${EMAIL_THEME.textPrimary};">${escapeHtml(title)}</h2>`;
}

function sectionBottomBorder(isLastSection) {
  return isLastSection ? "" : ` border-bottom:1px solid ${EMAIL_THEME.border};`;
}

function plainTextFromRichText(text = "") {
  return decodeStoredTextEntities(String(text).replace(/<[^>]*>/g, "")).trim();
}

function initialsFromName(name = "") {
  const words = plainTextFromRichText(name)
    .split(/[·—-]/)[0]
    .split(/\s+/)
    .filter(Boolean);
  return (words.length ? words.slice(0, 2).map((word) => word[0]).join("") : "CH").toUpperCase();
}

// ─────────────────────────────────────────────────────────────────────────────
// Rendu de chaque type de section
// ─────────────────────────────────────────────────────────────────────────────

function renderHero(data, isLastSection = false) {
  const kicker = String(data.kicker || "").trim();
  const chips = (data.chips || []).map((c, i, arr) => {
    let labelHtml;
    if (c.type === "fear_greed" && c.label.includes(" · ")) {
      const [p1, p2] = c.label.split(" · ");
      labelHtml = `${escapeHtml(p1)}<br />${escapeHtml(p2)}`;
    } else {
      const sp = c.label.indexOf(" ");
      labelHtml = sp > -1
        ? `${escapeHtml(c.label.slice(0, sp))}<br />${escapeHtml(c.label.slice(sp + 1))}`
        : escapeHtml(c.label);
    }
    return `
    <td style="${i < arr.length - 1 ? "padding-right:8px;" : ""}">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
        <tr><td style="border:1px solid ${EMAIL_THEME.borderStrong}; border-radius:12px; padding:8px 14px; font-family:${FONTS.body}; font-size:12px; font-weight:500; color:${EMAIL_THEME.textSecondary}; text-align:center; white-space:nowrap;">${labelHtml}</td></tr>
      </table>
    </td>`;
  }).join("");

  return `
    <tr>
      <td class="em-px" style="padding:56px 36px 40px;${sectionBottomBorder(isLastSection)}">
        ${kicker ? `<p style="margin:0 0 28px; font-family:${FONTS.body}; font-size:11px; letter-spacing:0.2em; color:${EMAIL_THEME.accentPrimary}; font-weight:600; text-transform:uppercase;">${escapeHtml(kicker)}</p>` : ""}
        <h1 class="em-h1" style="margin:0; font-family:${FONTS.heading}; font-weight:700; font-size:60px; line-height:0.98; letter-spacing:-0.035em; color:${EMAIL_THEME.textPrimary};">
          ${escapeHtml(data.title_part1)}<br />
          ${escapeHtml(data.title_part2)}<span style="color:${EMAIL_THEME.accentPrimary};">${escapeHtml(data.title_highlight)}</span>
        </h1>
        <p style="margin:22px 0 0; font-family:${FONTS.body}; font-weight:${RICH_TEXT_WEIGHT}; font-size:17px; line-height:1.5; color:${EMAIL_THEME.textMuted}; max-width:460px;">
          ${sanitizeRichText(data.subtitle)}
        </p>
        ${chips ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:28px;"><tr>${chips}</tr></table>` : ""}
      </td>
    </tr>`;
}

function renderIndex(data, allSections, isLastSection = false) {
  const rows = (data.items || []).map((item, i, arr) => {
    const padding = i === arr.length - 1 ? "8px 0 28px" : "8px 0";
    const href = indexHref(item, allSections);
    const number = escapeHtml(item.number);
    const title = escapeHtml(item.title);
    const numberHtml = href
      ? `<a href="${escapeAttr(href)}" style="color:${EMAIL_THEME.textFaint}; text-decoration:none;">${number}</a>`
      : number;
    const titleHtml = href
      ? `<a href="${escapeAttr(href)}" style="color:${EMAIL_THEME.textPrimary}; text-decoration:none;">${title}</a>`
      : title;
    return `<tr>
      <td style="padding:${padding};">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td width="32" valign="baseline" style="font-family:${FONTS.heading}; font-weight:600; font-size:13px; color:${EMAIL_THEME.textFaint};">${numberHtml}</td>
            <td valign="baseline" style="font-family:${FONTS.heading}; font-weight:500; font-size:17px; color:${EMAIL_THEME.textPrimary}; letter-spacing:-0.01em;">${titleHtml}</td>
          </tr>
        </table>
      </td>
    </tr>`;
  }).join("");

  return `
    <tr>
      <td class="em-px" style="padding:0 36px;${sectionBottomBorder(isLastSection)}">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="padding:28px 0 18px;">
              <p style="margin:0; font-family:${FONTS.body}; font-size:11px; letter-spacing:0.18em; text-transform:uppercase; color:${EMAIL_THEME.textDim}; font-weight:500;">${escapeHtml(data.label)}</p>
            </td>
          </tr>
          ${rows}
        </table>
      </td>
    </tr>`;
}

function renderEdito(data, number, anchor = "", isLastSection = false) {
  const kpis = data.kpis || [];
  const cells = kpis.map((k, i) => {
    const isLast = i === kpis.length - 1;
    const width = `${Math.floor(100 / Math.max(kpis.length, 1))}%`;
    const borderRight = isLast ? "" : `border-right:1px solid ${EMAIL_THEME.border};`;
    return `<td valign="top" width="${width}" style="padding:16px 14px; ${borderRight}">
      <p style="margin:0; font-family:${FONTS.body}; font-size:10px; letter-spacing:0.16em; color:${EMAIL_THEME.textDim}; font-weight:500;">${escapeHtml(k.label)}</p>
      <p style="margin:6px 0 2px; font-family:${FONTS.heading}; font-weight:600; font-size:18px; color:${EMAIL_THEME.textPrimary}; letter-spacing:-0.02em;">${escapeHtml(k.value)}</p>
      <p style="margin:0; font-family:${FONTS.body}; font-size:12px; color:${toneColor(k.tone)}; font-weight:500;">${escapeHtml(k.delta)}</p>
    </td>`;
  }).join("");

  const grid = kpis.length ? `
    <table role="presentation" class="em-kpi-grid" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${EMAIL_THEME.border};">
      <tr>${cells}</tr>
    </table>` : "";

  return `
    <tr>
      <td class="em-px" style="padding:44px 36px;${sectionBottomBorder(isLastSection)}">
        ${anchor}
        ${sectionHeader(number, data.kicker)}
        ${sectionTitle(data.title)}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr><td style="padding-top:22px;"><p style="margin:0; font-family:${FONTS.body}; font-weight:${RICH_TEXT_WEIGHT}; font-size:15px; line-height:1.65; color:${EMAIL_THEME.textSecondary};">${sanitizeRichText(data.body)}</p></td></tr>
          ${grid ? `<tr><td style="padding-top:24px;">${grid}</td></tr>` : ""}
        </table>
      </td>
    </tr>`;
}

function renderChart(data, assetMode, isLastSection = false) {
  // Pour N points espacés à stepX = 100%/(N-1), les labels s'alignent avec
  // les points en donnant une demi-largeur aux cellules extrêmes.
  const arr = data.x_labels || [];
  const n = arr.length;
  const stepPct = n > 1 ? (100 / (n - 1)).toFixed(4) : 100;
  const halfPct = (parseFloat(stepPct) / 2).toFixed(4);
  const labels = arr.map((l, i) => {
    const isFirst = i === 0;
    const isLast = i === n - 1;
    const w = (isFirst || isLast) ? `${halfPct}%` : `${stepPct}%`;
    const align = isFirst ? "left" : isLast ? "right" : "center";
    return `<td class="em-chart-label" width="${w}" align="${align}" style="font-family:${FONTS.body}; font-size:11px; color:${EMAIL_THEME.textFaint}; letter-spacing:0.06em; white-space:nowrap;">${escapeHtml(l)}</td>`;
  }).join("");

  return `
    <tr>
      <td class="em-px" style="padding:36px 36px 28px; background-color:${EMAIL_THEME.bgSection};${sectionBottomBorder(isLastSection)}">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td valign="bottom">
              <p style="margin:0; font-family:${FONTS.body}; font-size:11px; letter-spacing:0.18em; text-transform:uppercase; color:${EMAIL_THEME.textDim}; font-weight:500;">${escapeHtml(data.label)}</p>
              <p class="em-chart-value" style="margin:4px 0 0; font-family:${FONTS.heading}; font-weight:700; font-size:36px; letter-spacing:-0.03em; color:${EMAIL_THEME.textPrimary};">${escapeHtml(data.value)}</p>
            </td>
            <td align="right" valign="bottom">
              <p style="margin:0; font-family:${FONTS.heading}; font-weight:600; font-size:18px; color:${toneColor(data.delta_tone)};">${escapeHtml(data.delta)}</p>
              <p style="margin:2px 0 0; font-family:${FONTS.body}; font-size:12px; color:${EMAIL_THEME.textDim}; letter-spacing:0.04em;">${escapeHtml(data.subdelta)}</p>
            </td>
          </tr>
          <tr>
            <td colspan="2" style="padding-top:20px;">
              ${buildChartSvg(data.points, assetMode, {
                priceStart: data.price_start ?? "",
                priceEnd:   data.value       ?? "",
                priceHigh:  data.price_high  ?? "",
                priceLow:   data.price_low   ?? "",
              })}
            </td>
          </tr>
          <tr>
            <td colspan="2" style="padding-top:8px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${labels}</tr></table>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

function renderFearGreed(data, number, assetMode, anchor = "", isLastSection = false) {
  const fgColor = fgClassificationColor(data.classification);
  const legend = [
    { color: "#FF4B28", range: "0–24", label: "Extreme Fear" },
    { color: "#FF8B28", range: "25–44", label: "Fear" },
    { color: "#75808B", range: "45–54", label: "Neutral" },
    { color: "#00BB97", range: "55–74", label: "Greed" },
    { color: EMAIL_THEME.positiveSoft, range: "75–100", label: "Extreme Greed" },
  ].map(r => `<tr>
    <td width="18" style="padding:2px 0;"><span style="display:inline-block; width:8px; height:8px; background:${r.color}; border-radius:99px; vertical-align:middle;"></span></td>
    <td width="62" style="padding:2px 12px 2px 0; font-family:${FONTS.body}; font-size:12px; color:${EMAIL_THEME.textDim}; white-space:nowrap;">${r.range}</td>
    <td style="padding:2px 0; font-family:${FONTS.body}; font-size:12px; color:${EMAIL_THEME.textSecondary}; white-space:nowrap;">${r.label}</td>
  </tr>`).join("");

  return `
    <tr>
      <td class="em-px" style="padding:44px 36px;${sectionBottomBorder(isLastSection)}">
        ${anchor}
        ${sectionHeader(number, data.kicker)}
        ${sectionTitleSpaced(data.title)}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td class="em-stack em-stack-pad" valign="top" width="220" style="padding-right:24px;">${buildFgGauge(data.value, assetMode)}</td>
            <td class="em-stack" valign="top">
              <p style="margin:0; font-family:${FONTS.heading}; font-weight:700; font-size:64px; line-height:1; letter-spacing:-0.04em; color:${fgColor};">${escapeHtml(data.value)}</p>
              <p style="margin:4px 0 14px; font-family:${FONTS.heading}; font-weight:600; font-size:14px; letter-spacing:0.18em; color:${fgColor};">${escapeHtml(data.classification)}</p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">${legend}</table>
            </td>
          </tr>
        </table>
        <p style="margin:22px 0 0; font-family:${FONTS.body}; font-weight:${RICH_TEXT_WEIGHT}; font-size:15px; line-height:1.65; color:${EMAIL_THEME.textSecondary};">${sanitizeRichText(data.commentary)}</p>
      </td>
    </tr>`;
}

function renderSignals(data, number, anchor = "", isLastSection = false) {
  const items = data.signals || [];
  const rows = [];
  for (let i = 0; i < items.length; i += 2) {
    const left = items[i], right = items[i + 1];
    const isLast = i + 2 >= items.length;
    const cellOf = (s, position) => {
      if (!s) return `<td class="em-signal-col" width="50%"></td>`;
      const arrowUp = s.direction === "up";
      const bg = arrowUp ? EMAIL_THEME.positiveBg : "rgba(255,75,40,0.14)";
      const fg = arrowUp ? EMAIL_THEME.positive : EMAIL_THEME.warning;
      const arrow = arrowUp ? "↗" : "↘";
      let borders = "";
      if (position === "tl") borders = `border-right:1px solid ${EMAIL_THEME.border}; border-bottom:1px solid ${EMAIL_THEME.border};`;
      else if (position === "tr") borders = `border-bottom:1px solid ${EMAIL_THEME.border};`;
      else if (position === "bl") borders = `border-right:1px solid ${EMAIL_THEME.border};`;
      return `<td class="em-signal-col" valign="top" width="50%" style="padding:20px 18px; ${borders}">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td valign="top" width="42">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
                <td width="28" height="28" align="center" valign="middle" style="background:${bg}; border-radius:99px; color:${fg}; font-family:Arial, sans-serif; font-size:14px; font-weight:700; line-height:28px;">${arrow}</td>
              </tr></table>
            </td>
            <td valign="top">
              <p style="margin:0 0 4px; font-family:${FONTS.heading}; font-weight:600; font-size:14px; color:${EMAIL_THEME.textPrimary};">${escapeHtml(s.title)}</p>
              <p style="margin:0; font-family:${FONTS.body}; font-weight:${RICH_TEXT_WEIGHT}; font-size:13px; line-height:1.5; color:${EMAIL_THEME.textMuted};">${sanitizeRichText(s.description)}</p>
            </td>
          </tr>
        </table>
      </td>`;
    };
    const leftPos = isLast ? "bl" : "tl";
    const rightPos = isLast ? "br" : "tr";
    rows.push(`<tr>${cellOf(left, leftPos)}${cellOf(right, rightPos)}</tr>`);
  }
  const grid = items.length ? `<table role="presentation" class="em-signal-grid" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${EMAIL_THEME.border};">${rows.join("")}</table>` : "";

  return `
    <tr>
      <td class="em-px" style="padding:44px 36px;${sectionBottomBorder(isLastSection)}">
        ${anchor}
        ${sectionHeader(number, data.kicker)}
        ${sectionTitleSpaced(data.title)}
        ${grid}
      </td>
    </tr>`;
}

function buildBarsHtml(bars) {
  const rows = (bars || []).map((b, i, arr) => {
    const pct = Math.max(0, Math.min(100, parseInt(b.percent, 10) || 0));
    const isLast = i === arr.length - 1;
    return `<tr>
      <td style="${isLast ? "" : "padding-bottom:16px;"}">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="font-family:${FONTS.body}; font-size:13px; color:${EMAIL_THEME.textSecondary};">${escapeHtml(b.label)}</td>
            <td align="right" style="font-family:${FONTS.heading}; font-weight:600; font-size:15px; color:${EMAIL_THEME.textPrimary};">${escapeHtml(b.value)}</td>
          </tr>
        </table>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:6px; height:6px; background-color:${EMAIL_THEME.barTrack}; border-radius:99px;">
          <tr><td style="font-size:1px; line-height:1px;">
            <table role="presentation" width="${pct}%" cellpadding="0" cellspacing="0" border="0" style="height:6px; background-color:${EMAIL_THEME.accentSecondary}; background-image:linear-gradient(90deg, ${EMAIL_THEME.accentSecondary}, ${EMAIL_THEME.positive}); border-radius:99px;">
              <tr><td style="height:6px; line-height:6px; font-size:1px;">&nbsp;</td></tr>
            </table>
          </td></tr>
        </table>
        <p style="margin:4px 0 0; font-family:${FONTS.body}; font-size:11px; color:${EMAIL_THEME.textDim}; letter-spacing:0.02em;">${escapeHtml(b.caption)}</p>
      </td>
    </tr>`;
  }).join("");
  return rows ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table>` : "";
}

function renderMacroBars(data, isLastSection = false) {
  const content = buildBarsHtml(data.bars);
  if (!content) return "";
  return `
    <tr>
      <td class="em-px" style="padding:28px 36px; background-color:${EMAIL_THEME.bgSection};${sectionBottomBorder(isLastSection)}">
        ${content}
      </td>
    </tr>`;
}

function renderCommentedNumber(data, anchor = "", isLastSection = false) {
  const unit = String(data.unit || "").trim();
  const isLightTheme = EMAIL_THEME === EMAIL_THEMES.light;
  const cardBg = isLightTheme ? "#FBF8F2" : "#101018";
  const cardBorder = isLightTheme ? "#E6E0D4" : EMAIL_THEME.borderSubtle;
  const numberPanelBg = isLightTheme ? "#EEF2EC" : EMAIL_THEME.positiveBg;
  const dividerColor = isLightTheme ? "#E0DCD3" : EMAIL_THEME.borderSubtle;
  const numberColor = isLightTheme ? "#63C3A2" : EMAIL_THEME.positive;
  const titleColor = isLightTheme ? "#111318" : EMAIL_THEME.textPrimary;
  const bodyColor = isLightTheme ? "#555E6E" : EMAIL_THEME.textMuted;
  return `
    <tr>
      <td class="em-px" style="padding:36px;${sectionBottomBorder(isLastSection)}">
        ${anchor}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${cardBg}; border:1px solid ${cardBorder}; border-radius:14px; border-collapse:separate !important; border-spacing:0 !important; overflow:hidden;">
          <tr>
            <td style="padding:4px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate !important; border-spacing:0 !important;">
                <tr>
                  <td class="em-stack em-stack-pad em-cn-num" valign="middle" width="200" style="padding:24px; background-color:${numberPanelBg}; border-right:1px solid ${dividerColor}; border-radius:12px 0 0 12px;">
                    <p style="margin:0; font-family:${FONTS.body}; font-size:10px; letter-spacing:0.22em; text-transform:uppercase; color:${EMAIL_THEME.textDim}; font-weight:600;">${escapeHtml(data.kicker || "Le chiffre")}</p>
                    <p style="margin:6px 0 0; font-family:${FONTS.heading}; font-weight:700; font-size:56px; line-height:0.95; letter-spacing:-0.045em; color:${numberColor};">${escapeHtml(data.value)}${unit ? ` <span style="font-size:22px; color:${EMAIL_THEME.textMuted}; font-weight:500; letter-spacing:0;">${escapeHtml(unit)}</span>` : ""}</p>
                    ${data.caption ? `<p style="margin:8px 0 0; font-family:${FONTS.body}; font-size:12px; color:${EMAIL_THEME.textMuted}; letter-spacing:0.02em;">${escapeHtml(data.caption)}</p>` : ""}
                  </td>
                  <td class="em-stack em-cn-text" valign="middle" style="padding:24px 28px;">
                    ${data.title ? `<p style="margin:0 0 8px; font-family:${FONTS.heading}; font-weight:600; font-size:17px; line-height:1.25; letter-spacing:-0.015em; color:${titleColor};">${escapeHtml(data.title)}</p>` : ""}
                    <p style="margin:0; font-family:${FONTS.body}; font-weight:${RICH_TEXT_WEIGHT}; font-size:13.5px; line-height:1.55; color:${bodyColor};">${sanitizeRichText(data.body)}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

function renderMacro(data, number, assetMode, anchor = "", isLastSection = false) {
  const authorParts = String(data.quote_author || "").split(" · ");
  const authorName = authorParts.shift() || "";
  const authorDetails = authorParts.join(" · ");
  const bgImg = String(data.bg_image_url || "").trim();
  const effectiveBgImg = bgImg || (assetMode === "external"
    ? "assets/macro-quote-bg.png"
    : "https://decrypto-newsletter.vercel.app/macro-quote-bg.png");
  const quoteBlock = data.quote ? `
    <!--[if mso]>
    <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:568px; border-radius:16px;">
      <v:fill type="frame" src="${escapeAttr(effectiveBgImg)}" color="#1a0c2e" />
      <v:textbox inset="0,0,0,0"><![endif]-->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#1a0c2e; background-image:linear-gradient(135deg, rgba(135,1,255,0.22), rgba(255,0,170,0.12) 60%, rgba(255,75,40,0.08) 100%); border:1px solid rgba(255,255,255,0.08); border-radius:16px;">
      <tr><td background="${escapeAttr(effectiveBgImg)}" style="background-image:url('${escapeAttr(effectiveBgImg)}'); background-size:cover; background-position:center; border-radius:16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="padding:32px 32px 28px;">
          <p style="margin:0; font-family:${FONTS.heading}; font-weight:800; font-size:80px; line-height:0.6; color:#FF00AA; letter-spacing:-0.05em;">&quot;</p>
          <p style="margin:16px 0 0; font-family:${FONTS.heading}; font-weight:500; font-size:24px; line-height:1.32; letter-spacing:-0.015em; color:#ffffff;">${sanitizeRichText(data.quote)}</p>
          ${data.quote_author ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:22px;">
            <tr>
              <td style="padding-right:12px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td width="32" height="32" align="center" valign="middle" style="background:rgba(255,255,255,0.12); border-radius:99px; color:#ffffff; font-family:${FONTS.heading}; font-size:12px; font-weight:700; line-height:32px; letter-spacing:0.04em;">${escapeHtml(initialsFromName(authorName || data.quote_author))}</td></tr></table>
              </td>
              <td valign="middle">
                <p style="margin:0; font-family:${FONTS.heading}; font-weight:600; font-size:13px; color:#ffffff; letter-spacing:-0.005em;">${sanitizeRichText(authorName || data.quote_author)}</p>
                ${authorDetails ? `<p style="margin:2px 0 0; font-family:${FONTS.body}; font-size:11px; color:#C7CAD1; letter-spacing:0.06em;">${sanitizeRichText(authorDetails)}</p>` : ""}
              </td>
            </tr>
          </table>` : ""}
        </td>
      </tr>
    </table>
      </td></tr>
    </table>
    <!--[if mso]></v:textbox></v:rect><![endif]-->` : "";

  return `
    <tr>
      <td class="em-px" style="padding:44px 36px;${sectionBottomBorder(isLastSection)}">
        ${anchor}
        ${sectionHeader(number, data.kicker)}
        ${sectionTitleSpaced(data.title)}
        <p style="margin:0 0 22px; font-family:${FONTS.body}; font-weight:${RICH_TEXT_WEIGHT}; font-size:15px; line-height:1.65; color:${EMAIL_THEME.textSecondary};">${sanitizeRichText(data.body)}</p>
        ${quoteBlock}
      </td>
    </tr>`;
}

function renderEvent(data, anchor = "", isLastSection = false) {
  const kicker = String(data.kicker || "").trim();
  const eventTextPrimary = "#FFFFFF";
  const eventTextSecondary = "#D8DDE6";
  const eventTextMuted = "#A8AEB8";
  const bgImg = String(data.bg_image_url || "").trim();

  const cardInner = `
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td class="em-stack em-stack-pad" valign="middle" width="180" style="padding:32px 28px; border-right:1px solid ${EMAIL_THEME.borderStrong};">
                  <p class="em-event-day" style="margin:0; font-family:${FONTS.heading}; font-weight:700; font-size:80px; line-height:0.9; letter-spacing:-0.04em; color:${eventTextPrimary};">${escapeHtml(data.day)}</p>
                  <p style="margin:8px 0 2px; font-family:${FONTS.heading}; font-weight:600; font-size:18px; letter-spacing:0.1em; color:${eventTextPrimary};">${escapeHtml(data.month)}</p>
                  <p style="margin:0; font-family:${FONTS.body}; font-size:12px; color:${eventTextMuted}; letter-spacing:0.1em;">${escapeHtml(data.year)}</p>
                </td>
                <td class="em-stack em-event-text" valign="middle" style="padding:32px 28px;">
                  ${kicker ? `<p style="margin:0 0 12px; font-family:${FONTS.body}; font-size:11px; letter-spacing:0.2em; text-transform:uppercase; font-weight:600; color:${EMAIL_THEME.positive};">${escapeHtml(kicker)}</p>` : ""}
                  ${String(data.title || "").trim() ? `<h3 style="margin:0; font-family:${FONTS.heading}; font-weight:700; font-size:28px; letter-spacing:-0.025em; line-height:1.05; color:${eventTextPrimary};">${escapeHtml(data.title)}</h3>` : ""}
                  <p style="margin:12px 0 0; font-family:${FONTS.body}; font-weight:${RICH_TEXT_WEIGHT}; font-size:13px; line-height:1.5; color:${eventTextSecondary};">${sanitizeRichText(data.description)}</p>
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:18px;">
                    <tr><td bgcolor="#ffffff" style="border-radius:99px;">
                      <a href="${escapeAttr(data.cta_url)}" style="display:inline-block; padding:11px 20px; font-family:${FONTS.heading}; font-weight:600; font-size:13px; color:${EMAIL_THEME.bgEventCard}; text-decoration:none; border-radius:99px;">${escapeHtml(data.cta_label)}</a>
                    </td></tr>
                  </table>
                </td>
              </tr>
            </table>`;

  const effectiveBgImg = bgImg || "https://decrypto-newsletter.vercel.app/event-bg.png";
  const cardTable = `<!--[if mso]>
      <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:568px; border-radius:18px;">
        <v:fill type="frame" src="${escapeAttr(effectiveBgImg)}" color="${EMAIL_THEME.bgEventCard}" />
        <v:textbox inset="0,0,0,0"><![endif]-->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
        class="em-event-bg"
        bgcolor="${EMAIL_THEME.bgEventCard}"
        background="${escapeAttr(effectiveBgImg)}"
        style="background-color:${EMAIL_THEME.bgEventCard}; background-image:url('${escapeAttr(effectiveBgImg)}'); background-size:cover; background-position:center; border-radius:18px;">
        <tr><td>${cardInner}</td></tr>
      </table>
      <!--[if mso]></v:textbox></v:rect><![endif]-->`;


  return `
    <tr>
      <td class="em-px" style="padding:36px;${sectionBottomBorder(isLastSection)}">
        ${anchor}
        ${cardTable}
      </td>
    </tr>`;
}

function renderFocusItem(item) {
  if (item.type === "image") {
    const imgUrl = String(item.image_url || "").trim();
    if (!imgUrl) return "";
    const altText = item.image_alt || "Visuel d'illustration";
    const linkUrl = String(item.link_url || "").trim();
    const img = `<img src="${escapeAttr(imgUrl)}" width="568" height="280" alt="${escapeAttr(altText)}" style="display:block; width:100%; max-width:568px; height:auto; border-radius:14px; border:1px solid ${EMAIL_THEME.borderSubtle};" />`;
    const inner = linkUrl
      ? `<a href="${escapeAttr(linkUrl)}" target="_blank" style="display:block; text-decoration:none;">${img}</a>`
      : img;
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:26px;">
        <tr>
          <td>${inner}</td>
        </tr>
      </table>`;
  }
  if (item.type === "text") {
    const hasBody = String(item.body || "").replace(/<[^>]*>/g, "").trim();
    if (!hasBody) return "";
    return `<div style="margin:0 0 26px; font-family:${FONTS.body}; font-weight:${RICH_TEXT_WEIGHT}; font-size:15px; line-height:1.65; color:${EMAIL_THEME.textSecondary};">
        ${sanitizeRichText(item.body)}
      </div>`;
  }
  if (item.type === "cta") {
    if (!item.label) return "";
    const ctaText = escapeHtml(item.label) + (item.arrow ? " →" : "");
    const align = item.centered ? "center" : "left";

    // Legacy: items with explicit style="secondary" render as standalone outline button
    if (item.style === "secondary") {
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16px;">
        <tr>
          <td align="${align}" valign="middle">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="border:1px solid ${EMAIL_THEME.borderStrong}; border-radius:99px;">
                  <a href="${escapeAttr(item.url || "#")}" style="display:inline-block; padding:12px 20px; font-family:${FONTS.heading}; font-weight:500; font-size:13px; color:${EMAIL_THEME.textSecondary}; text-decoration:none; border-radius:99px; letter-spacing:0.01em;">${ctaText}</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>`;
    }

    const primaryBtn = `<!--[if mso]>
            <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${escapeAttr(item.url || "#")}" style="height:46px; v-text-anchor:middle; width:200px;" arcsize="50%" stroke="f" fillcolor="${EMAIL_THEME.accentTertiary}">
              <w:anchorlock/>
              <center style="color:#ffffff; font-family:Arial, sans-serif; font-size:13px; font-weight:bold;">${ctaText}</center>
            </v:roundrect>
            <![endif]-->
            <!--[if !mso]><!-->
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td bgcolor="${EMAIL_THEME.accentTertiary}" style="border-radius:99px; background-color:${EMAIL_THEME.accentTertiary}; background-image:linear-gradient(90deg, ${EMAIL_THEME.accentSecondary} 0%, ${EMAIL_THEME.accentTertiary} 50%, ${EMAIL_THEME.accentPrimary} 100%);">
                  <a href="${escapeAttr(item.url || "#")}" style="display:inline-block; padding:13px 22px; font-family:${FONTS.heading}; font-weight:600; font-size:13px; color:#ffffff; text-decoration:none; border-radius:99px; letter-spacing:0.01em;">${ctaText}</a>
                </td>
              </tr>
            </table>
            <!--<![endif]-->`;

    const secondaryText = item.secondary_label
      ? escapeHtml(item.secondary_label) + (item.secondary_arrow ? " →" : "")
      : "";
    const secondaryBtn = secondaryText
      ? `<td valign="middle" style="padding-left:10px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="border:1px solid ${EMAIL_THEME.borderStrong}; border-radius:99px;">
                  <a href="${escapeAttr(item.secondary_url || "#")}" style="display:inline-block; padding:12px 20px; font-family:${FONTS.heading}; font-weight:500; font-size:13px; color:${EMAIL_THEME.textSecondary}; text-decoration:none; border-radius:99px; letter-spacing:0.01em;">${secondaryText}</a>
                </td>
              </tr>
            </table>
          </td>`
      : "";

    return `<table role="presentation" class="em-cta-row" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16px;">
        <tr>
          <td align="${align}" valign="middle">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td valign="middle">${primaryBtn}</td>
                ${secondaryBtn}
              </tr>
            </table>
          </td>
        </tr>
      </table>`;
  }
  if (item.type === "callout") {
    const hasBody = plainTextFromRichText(item.body);
    if (!hasBody) return "";
    const isLightTheme = EMAIL_THEME === EMAIL_THEMES.light;
    const picto = CALLOUT_PICTOS_MAP[item.picto || DEFAULT_PICTO_ID] || CALLOUT_PICTOS_MAP[DEFAULT_PICTO_ID];
    const accentHex = item.callout_color || DEFAULT_CALLOUT_COLOR;
    const accentRgb = hexToRgb(accentHex);
    const calloutBg = isLightTheme ? `rgba(${accentRgb},0.06)` : `rgba(${accentRgb},0.04)`;
    const calloutBorder = isLightTheme ? `rgba(${accentRgb},0.35)` : `rgba(${accentRgb},0.22)`;
    const calloutAccent = accentHex;
    const iconBg = isLightTheme ? `rgba(${accentRgb},0.12)` : `rgba(${accentRgb},0.16)`;
    const iconBorder = isLightTheme ? `rgba(${accentRgb},0.4)` : `rgba(${accentRgb},0.32)`;
    const iconStroke = accentHex;
    const bodyColor = isLightTheme ? "#303641" : "#D8DDE6";
    const footerBorder = `rgba(${accentRgb},0.2)`;
    const footerColor = isLightTheme ? "#68717E" : EMAIL_THEME.textDim;
    const iconHtml = item.show_icon === false
      ? ""
      : `<td valign="middle" style="padding-right:12px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate !important; border-spacing:0 !important;"><tr><td width="30" height="30" align="center" valign="middle" style="background:${iconBg}; border:1px solid ${iconBorder}; border-radius:8px;">${buildPictoSvgHtml(picto.svgInner, iconStroke, 16)}</td></tr></table>
                </td>`;
    const footerText = String(item.footer || "").trim();
    const footer = footerText
      ? `<p style="margin:14px 0 0; padding-top:12px; border-top:1px solid ${footerBorder}; font-family:${FONTS.mono || "'JetBrains Mono', monospace"}; font-size:11px; color:${footerColor}; letter-spacing:0.02em;">${
          item.footer_url
            ? `<a href="${escapeAttr(item.footer_url)}" style="color:${calloutAccent}; text-decoration:none; border-bottom:1px solid ${footerBorder}; padding-bottom:1px;">${escapeHtml(footerText)}</a>`
            : escapeHtml(footerText)
        }</p>`
      : "";
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:26px; background-color:${calloutBg}; border:1px solid ${calloutBorder}; border-radius:12px; border-collapse:separate !important; border-spacing:0 !important; overflow:hidden;">
        <tr>
          <td style="padding:22px 24px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:12px;">
              <tr>
                ${iconHtml}
                <td valign="middle" style="font-family:${FONTS.body}; font-size:11px; letter-spacing:0.2em; text-transform:uppercase; font-weight:600; color:${calloutAccent};">${escapeHtml(item.label || "Note de la rédac")}</td>
              </tr>
            </table>
            <div style="margin:0; font-family:${FONTS.body}; font-weight:${RICH_TEXT_WEIGHT}; font-size:14px; line-height:1.6; color:${bodyColor};">${sanitizeRichText(item.body)}</div>
            ${footer}
          </td>
        </tr>
      </table>`;
  }
  return "";
}

function renderFocus(data, number, anchor = "", isLastSection = false) {
  // Items-based rendering (new format)
  if (data.items) {
    const renderedItems = data.items.map(renderFocusItem).join("\n");
    return `
    <tr>
      <td class="em-px" style="padding:44px 36px;${sectionBottomBorder(isLastSection)}">
        ${anchor}
        ${sectionHeader(number, data.kicker)}
        ${sectionTitleSpaced(data.title)}
        ${renderedItems}
      </td>
    </tr>`;
  }

  // Legacy flat format (backward compatibility)
  const imgUrl = String(data.image_url || "").trim();
  const altText = data.image_alt || "Visuel d'illustration";
  const hasBody = String(data.body || "").replace(/<[^>]*>/g, "").trim();
  const imageBlock = imgUrl
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="${hasBody || data.cta_primary_label || data.cta_secondary_label ? "margin-bottom:26px;" : ""}">
        <tr>
          <td>
            <img src="${escapeAttr(imgUrl)}" width="568" height="280" alt="${escapeAttr(altText)}" style="display:block; width:100%; max-width:568px; height:auto; border-radius:14px; border:1px solid ${EMAIL_THEME.borderSubtle};" />
          </td>
        </tr>
      </table>`
    : "";
  const textBlock = hasBody
    ? `<p style="margin:0; font-family:${FONTS.body}; font-weight:${RICH_TEXT_WEIGHT}; font-size:15px; line-height:1.65; color:${EMAIL_THEME.textSecondary};">
        ${sanitizeRichText(data.body)}
      </p>`
    : "";
  const primaryBtn = data.cta_primary_label
    ? `<td valign="middle" style="padding-right:10px;">
        <!--[if mso]>
        <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${escapeAttr(data.cta_primary_url || "#")}" style="height:46px; v-text-anchor:middle; width:260px;" arcsize="50%" stroke="f" fillcolor="${EMAIL_THEME.accentTertiary}">
          <w:anchorlock/>
          <center style="color:#ffffff; font-family:Arial, sans-serif; font-size:13px; font-weight:bold;">${escapeHtml(data.cta_primary_label)}</center>
        </v:roundrect>
        <![endif]-->
        <!--[if !mso]><!-->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td bgcolor="${EMAIL_THEME.accentTertiary}" style="border-radius:99px; background-color:${EMAIL_THEME.accentTertiary}; background-image:linear-gradient(90deg, ${EMAIL_THEME.accentSecondary} 0%, ${EMAIL_THEME.accentTertiary} 50%, ${EMAIL_THEME.accentPrimary} 100%);">
              <a href="${escapeAttr(data.cta_primary_url || "#")}" style="display:inline-block; padding:13px 22px; font-family:${FONTS.heading}; font-weight:600; font-size:13px; color:#ffffff; text-decoration:none; border-radius:99px; letter-spacing:0.01em;">${escapeHtml(data.cta_primary_label)}</a>
            </td>
          </tr>
        </table>
        <!--<![endif]-->
      </td>`
    : "";
  const secondaryBtn = data.cta_secondary_label
    ? `<td valign="middle">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="border:1px solid rgba(255,255,255,0.22); border-radius:99px;">
              <a href="${escapeAttr(data.cta_secondary_url || "#")}" style="display:inline-block; padding:12px 20px; font-family:${FONTS.heading}; font-weight:500; font-size:13px; color:#E9EEF2; text-decoration:none; border-radius:99px; letter-spacing:0.01em;">${escapeHtml(data.cta_secondary_label)}</a>
            </td>
          </tr>
        </table>
      </td>`
    : "";
  const ctaRow = (primaryBtn || secondaryBtn)
    ? `<table role="presentation" class="em-cta-row" cellpadding="0" cellspacing="0" border="0" style="${textBlock || imageBlock ? "margin-top:26px;" : ""}">
        <tr>${primaryBtn}${secondaryBtn}</tr>
      </table>`
    : "";

  return `
    <tr>
      <td class="em-px" style="padding:44px 36px;${sectionBottomBorder(isLastSection)}">
        ${anchor}
        ${sectionHeader(number, data.kicker)}
        ${sectionTitleSpaced(data.title)}
        ${imageBlock}
        ${textBlock}
        ${ctaRow}
      </td>
    </tr>`;
}

function renderImageBlock(data, isLastSection = false) {
  const imgUrl =
    data.image_url ||
    "https://placehold.co/568x280/1a0c2e/ffffff?text=VISUEL+%C2%B7+568+%C3%97+280";
  const altText = data.image_alt || "Visuel d'illustration";
  const image = `<img src="${escapeAttr(imgUrl)}" width="568" height="280" alt="${escapeAttr(altText)}" style="display:block; width:100%; max-width:568px; height:auto; border-radius:14px; border:1px solid ${EMAIL_THEME.borderSubtle};" />`;
  const linkedImage = data.link_url
    ? `<a href="${escapeAttr(data.link_url)}" target="_blank" style="display:block; text-decoration:none;">${image}</a>`
    : image;

  return `
    <tr>
      <td class="em-px" style="padding:36px;${sectionBottomBorder(isLastSection)}">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td>
              ${linkedImage}
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

function renderTextBlock(data, number, anchor = "", isLastSection = false) {
  const ctaBtn = data.cta_label
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:28px;">
        <tr>
          <td bgcolor="${EMAIL_THEME.accentTertiary}" style="border-radius:99px; background-color:${EMAIL_THEME.accentTertiary}; background-image:linear-gradient(90deg, ${EMAIL_THEME.accentSecondary} 0%, ${EMAIL_THEME.accentTertiary} 50%, ${EMAIL_THEME.accentPrimary} 100%);">
            <a href="${escapeAttr(data.cta_url || "#")}" style="display:inline-block; padding:13px 22px; font-family:${FONTS.heading}; font-weight:600; font-size:13px; color:#ffffff; text-decoration:none; border-radius:99px; letter-spacing:0.01em;">${escapeHtml(data.cta_label)}</a>
          </td>
        </tr>
      </table>`
    : "";

  return `
    <tr>
      <td class="em-px" style="padding:44px 36px;${sectionBottomBorder(isLastSection)}">
        ${anchor}
        ${sectionHeader(number, data.kicker)}
        ${sectionTitle(data.title)}
        <p style="margin:22px 0 0; font-family:${FONTS.body}; font-weight:${RICH_TEXT_WEIGHT}; font-size:15px; line-height:1.65; color:${EMAIL_THEME.textSecondary};">${sanitizeRichText(data.body)}</p>
        ${ctaBtn}
      </td>
    </tr>`;
}

function renderDivider(data, isLastSection = false) {
  if (isLastSection) return "";
  if (data.style === "gradient") {
    return `<tr><td style="height:3px; line-height:3px; font-size:1px; background-color:${EMAIL_THEME.accentTertiary}; background-image:linear-gradient(90deg, ${EMAIL_THEME.accentSecondary} 0%, ${EMAIL_THEME.accentTertiary} 50%, ${EMAIL_THEME.accentPrimary} 100%);">&nbsp;</td></tr>`;
  }
  const height = data.style === "thick" ? "4" : "1";
  return `<tr><td style="height:${height}px; line-height:${height}px; font-size:1px; background-color:${EMAIL_THEME.borderStrong};">&nbsp;</td></tr>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Dispatcher : section → fonction de rendu
// ─────────────────────────────────────────────────────────────────────────────

function renderSection(sec, allSections, assetMode, showSectionNumbers = true, isLastSection = false) {
  const number = showSectionNumbers === false
    ? null
    : computeSectionNumber(allSections, sec.id);
  const anchor = number ? sectionAnchor(sec.id) : "";
  switch (sec.type) {
    case "hero":       return renderHero(sec.data, isLastSection);
    case "index":      return renderIndex(sec.data, allSections, isLastSection);
    case "edito":      return renderEdito(sec.data, number, anchor, isLastSection);
    case "chart":      return renderChart(sec.data, assetMode, isLastSection);
    case "fear_greed": return renderFearGreed(sec.data, number, assetMode, anchor, isLastSection);
    case "signals":    return renderSignals(sec.data, number, anchor, isLastSection);
    case "macro":      return renderMacro(sec.data, number, assetMode, anchor, isLastSection);
    case "macro_bars": return renderMacroBars(sec.data, isLastSection);
    case "commented_number": return renderCommentedNumber(sec.data, anchor, isLastSection);
    case "event":      return renderEvent(sec.data, anchor, isLastSection);
    case "focus":      return renderFocus(sec.data, number, anchor, isLastSection);
    case "image_block": return renderImageBlock(sec.data, isLastSection);
    case "text_block": return renderTextBlock(sec.data, number, anchor, isLastSection);
    case "divider":    return renderDivider(sec.data, isLastSection);
    default:           return `<tr><td>Type inconnu : ${escapeHtml(sec.type)}</td></tr>`;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Header & footer fixes
// ─────────────────────────────────────────────────────────────────────────────

function renderHeader(state, assetMode) {
  const logoUrl = BRAND_LOGOS[getEmailThemeVariant(state)] || BRAND_LOGOS.dark;
  const gradientHeaderUrl = assetMode === "external"
    ? "assets/gradient-header.png"
    : "https://decrypto-newsletter.vercel.app/gradient-header.png";
  return `
    <tr>
      <td style="height:4px; line-height:4px; font-size:1px; padding:0; border:0;"><img src="${gradientHeaderUrl}" width="640" height="4" alt="" style="display:block; width:100%; height:4px; border:0; line-height:4px;" /></td>
    </tr>
    <tr>
      <td class="em-px" style="padding:22px 36px; border-bottom:1px solid ${EMAIL_THEME.border};">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="left" valign="middle">
              <img src="${logoUrl}" width="180" alt="Coinhouse" style="display:inline-block; vertical-align:middle; border:0; max-width:180px; height:auto;" />
            </td>
            ${String(state.issue_date || "").trim() ? `<td align="right" valign="middle" style="font-family:${FONTS.body}; font-size:11px; letter-spacing:0.14em; text-transform:uppercase; color:${EMAIL_THEME.textMuted};">${escapeHtml(state.issue_date)}</td>` : "<td></td>"}
          </tr>
        </table>
      </td>
    </tr>`;
}

function renderFooter(footer, assetMode) {
  const isLightTheme = EMAIL_THEME === EMAIL_THEMES.light;
  const logoUrl = BRAND_LOGOS[isLightTheme ? "light" : "dark"] || BRAND_LOGOS.dark;
  const footerTopBorder = isLightTheme ? "" : ` border-top:1px solid ${EMAIL_THEME.borderSubtle};`;
  const links = (footer.links || []).filter(l => l.label && l.url).map(l => `
    <td align="center" style="padding:0 11px;">
      <a href="${escapeAttr(l.url)}" style="font-family:${FONTS.body}; font-size:12px; color:${EMAIL_THEME.textMuted}; letter-spacing:0.04em; text-decoration:none;">${escapeHtml(l.label)}</a>
    </td>`).join("");

  return `
    <tr>
      <td bgcolor="${EMAIL_THEME.bgFooter}" style="background-color:${EMAIL_THEME.bgFooter}; padding:40px 36px 32px;${footerTopBorder}" align="center">
        <div style="margin-bottom:10px;"><img src="${logoUrl}" width="180" alt="Coinhouse" style="display:block; margin:0 auto; border:0; max-width:180px; height:auto;" /></div>
        ${links ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;" align="center"><tr>${links}</tr></table>` : ""}
        <p style="margin:0; font-family:${FONTS.body}; font-size:11px; color:${EMAIL_THEME.textDim}; line-height:1.6; letter-spacing:0.02em;">
          ${escapeHtml(footer.address)}<br /><br />
          <span style="font-weight:${RICH_TEXT_WEIGHT}; color:${EMAIL_THEME.textFaint};">${sanitizeRichText(footer.legal)}</span>
        </p>
        <p style="margin:18px 0 0; font-family:${FONTS.body}; font-size:11px; color:${EMAIL_THEME.textFaint};">
          <a href="${escapeAttr(footer.unsub_url || "{{${set_user_to_unsubscribed_url}}}")}" style="color:${EMAIL_THEME.textFaint}; text-decoration:underline;">Se désinscrire</a>
        </p>
      </td>
    </tr>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Document complet
// ─────────────────────────────────────────────────────────────────────────────

export function buildEmailHtml(state, options = {}) {
  setRenderTheme(state);
  const assetMode = options.assetMode || "inline"; // "inline" ou "external"
  const showSectionNumbers = state.show_section_numbers !== false;
  const themeVariant = getEmailThemeVariant(state);
  const emailColorScheme = themeVariant === "light" ? "light" : "dark";
  const sections = state.sections || [];
  const renderedSections = sections
    .map((section, index) => ({ section, index }))
    .map(({ section, index }) => ({
      section,
      index,
      html: renderSection(section, sections, assetMode, showSectionNumbers, false),
    }))
    .filter(({ html, section }) => section.type !== "divider" && String(html || "").trim());
  const lastRenderedSectionIndex = renderedSections.length
    ? renderedSections[renderedSections.length - 1].index
    : -1;
  const sectionsHtml = sections
    .map((section, index) =>
      renderSection(section, sections, assetMode, showSectionNumbers, index === lastRenderedSectionIndex)
    )
    .join("");

  return `<!doctype html>
<html lang="fr" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="format-detection" content="telephone=no, date=no, address=no, email=no" />
<meta name="color-scheme" content="${emailColorScheme}" />
<meta name="supported-color-schemes" content="${emailColorScheme}" />
<title>Décrypto — ${escapeHtml(state.issue_date)}</title>
<!--[if mso]>
<noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
<style>
  table, td, div, h1, h2, h3, p, a { font-family: Arial, sans-serif !important; }
</style>
<![endif]-->
<style>
${renderEmailFontFaces()}
  html, body { margin: 0 !important; padding: 0 !important; height: 100% !important; width: 100% !important; }
  * { -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; box-sizing: border-box; }
  table, td { mso-table-lspace: 0pt !important; mso-table-rspace: 0pt !important; border-collapse: collapse !important; border-spacing: 0 !important; }
  img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; display: block; max-width: 100%; }
  a { text-decoration: none; }
  body { background-color: ${EMAIL_THEME.bgPage}; overflow-x: hidden; }
  @media only screen and (max-width: 640px) {
    .em-container { width: 100% !important; max-width: 100% !important; overflow-x: hidden !important; }
    .em-px { padding-left: 12px !important; padding-right: 12px !important; }
    .em-stack { display: block !important; width: 100% !important; box-sizing: border-box !important; border-right: none !important; }
    .em-stack-pad { padding-bottom: 16px !important; border-bottom: 1px solid ${EMAIL_THEME.borderStrong} !important; }
    .em-h1 { font-size: 36px !important; line-height: 1 !important; }
    .em-h2 { font-size: 22px !important; }
    .em-event-day { font-size: 52px !important; }
    .em-chart-value { font-size: 26px !important; }
    .em-kpi-grid td { display: block !important; width: 100% !important; box-sizing: border-box !important; border-right: none !important; border-bottom: 1px solid ${EMAIL_THEME.border} !important; }
    .em-signal-col { display: block !important; width: 100% !important; box-sizing: border-box !important; border-right: none !important; border-bottom: 1px solid ${EMAIL_THEME.border} !important; }
    .em-event-text { word-break: break-word !important; overflow-wrap: break-word !important; }
    .em-cn-num { border-radius: 12px 12px 0 0 !important; }
    .em-cn-text { border-radius: 0 0 12px 12px !important; }
    p, h1, h2, h3, div { word-break: break-word !important; overflow-wrap: break-word !important; }
    .em-chart-label { white-space: nowrap !important; word-break: keep-all !important; overflow-wrap: normal !important; }
  }
  @media only screen and (max-width: 380px) {
    .em-h1 { font-size: 28px !important; }
    .em-h2 { font-size: 18px !important; }
    .em-event-day { font-size: 40px !important; }
    .em-chart-value { font-size: 20px !important; }
    .em-px { padding-left: 8px !important; padding-right: 8px !important; }
  }
  .em-event-bg { background-image: url('https://decrypto-newsletter.vercel.app/event-bg.png') !important; background-size: cover !important; background-position: center !important; }
</style>
</head>
<body style="margin:0; padding:0; background-color:${EMAIL_THEME.bgPage}; font-family:${FONTS.body};">

<div style="display:none; font-size:1px; color:${EMAIL_THEME.bgPage}; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden;">
  ${escapeHtml(state.preview_text)} ⏤ ⏤ ⏤ ⏤ ⏤ ⏤ ⏤ ⏤ ⏤ ⏤
</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${EMAIL_THEME.bgPage}" style="background-color:${EMAIL_THEME.bgPage};">
  <tr><td align="center" style="padding:0;">
    <table role="presentation" class="em-container" width="640" cellpadding="0" cellspacing="0" border="0" style="width:640px; max-width:640px; background-color:${EMAIL_THEME.bgEmail};">
      ${renderHeader(state, assetMode)}
      ${sectionsHtml}
      ${renderFooter(state.footer || {}, assetMode)}
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Export des fonctions de rendu SVG pour la génération PNG côté navigateur
// ─────────────────────────────────────────────────────────────────────────────

export function getLogoSvg(size = 64, color = "#ffffff") {
  return `<svg width="${size}" height="${size}" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
    <path fill="${color}" fill-rule="evenodd" d="M32 2 L58 16 L58 48 L32 62 L6 48 L6 16 Z M22 18 L22 30 L32 36 L42 30 L42 18 L36 18 L36 26.5 L32 28.8 L28 26.5 L28 18 Z M22 46 L22 34 L32 28 L42 34 L42 46 L36 46 L36 37.5 L32 35.2 L28 37.5 L28 46 Z"/>
  </svg>`;
}

export function getChartSvgFull(points, opts = {}) {
  if (opts.themeVariant) setRenderTheme({ theme_variant: opts.themeVariant });
  return buildChartSvg(points, "inline", opts);
}

export function getGaugeSvgFull(value, opts = {}) {
  if (opts.themeVariant) setRenderTheme({ theme_variant: opts.themeVariant });
  return buildFgGauge(value, "inline");
}
