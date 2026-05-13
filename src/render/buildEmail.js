// ─────────────────────────────────────────────────────────────────────────────
// Génération du HTML email Décrypto — modulaire, section par section
// ─────────────────────────────────────────────────────────────────────────────

import { THEME, FONTS } from "../config/theme.js";
import { computeSectionNumber } from "../config/schema.js";

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

export function sanitizeRichText(text = "") {
  let out = escapeHtml(decodeStoredTextEntities(text));
  const listStyle = `margin:0; padding-left:20px; font-family:${FONTS.body}; font-size:15px; line-height:1.65; color:${THEME.textSecondary};`;
  const listItemStyle = `margin:0 0 6px; font-family:${FONTS.body}; font-size:15px; line-height:1.65; color:${THEME.textSecondary};`;
  out = out
    .replace(/&lt;br\s*\/?&gt;/gi, "<br />")
    .replace(/&lt;div&gt;/gi, "")
    .replace(/&lt;\/div&gt;/gi, "<br />")
    .replace(/&lt;p&gt;/gi, "")
    .replace(/&lt;\/p&gt;/gi, "<br />")
    .replace(/&lt;b&gt;/gi, `<strong style="color:${THEME.textPrimary};">`)
    .replace(/&lt;\/b&gt;/gi, "</strong>")
    .replace(/&lt;strong&gt;/gi, `<strong style="color:${THEME.textPrimary};">`)
    .replace(/&lt;\/strong&gt;/gi, "</strong>")
    .replace(/&lt;i&gt;/gi, "<em>")
    .replace(/&lt;\/i&gt;/gi, "</em>")
    .replace(/&lt;em&gt;/gi, "<em>")
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
      `<a href="$1" style="color:${THEME.textMuted}; text-decoration:underline;">`)
    .replace(/&lt;\/a&gt;/gi, "</a>")
    .replace(/\[([^\]\n]+)\]\((https?:\/\/[^)\s]+|mailto:[^)\s]+|#[^)\s]+)\)/gi,
      `<a href="$2" style="color:${THEME.textMuted}; text-decoration:underline;">$1</a>`)
    .replace(/\*\*([^*\n][\s\S]*?[^*\n])\*\*/g,
      `<strong style="color:${THEME.textPrimary};">$1</strong>`)
    .replace(/__([^_\n][\s\S]*?[^_\n])__/g,
      `<strong style="color:${THEME.textPrimary};">$1</strong>`)
    .replace(/(^|[\s>])\*([^*\n]+)\*/g, "$1<em>$2</em>")
    .replace(/(^|[\s>])_([^_\n]+)_/g, "$1<em>$2</em>")
    .replace(/^-\s+(.+)$/gm, "• $1");
  out = out.replace(/\n/g, "<br />");
  return out;
}

function toneColor(tone) {
  switch (tone) {
    case "positive": return THEME.positive;
    case "negative": return THEME.negative;
    case "warning": return THEME.warning;
    case "muted": return THEME.textMuted;
    default: return THEME.textMuted;
  }
}

function fgClassificationColor(cls = "") {
  const c = cls.toUpperCase();
  if (c.includes("EXTREME GREED")) return THEME.positive;
  if (c.includes("GREED")) return THEME.positive;
  if (c.includes("NEUTRAL")) return THEME.textDim;
  if (c.includes("EXTREME FEAR")) return THEME.negative;
  if (c.includes("FEAR")) return THEME.warning;
  return THEME.textMuted;
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

function buildChartSvg(points, assetMode, { yAxisTicks = [] } = {}) {
  if (assetMode === "external") {
    return `<img src="assets/chart.png" alt="Graphique" style="display:block; width:100%; height:auto; border:0;" />`;
  }
  if (!points || points.length < 2) return "";

  const W = 560, H = 180;
  const FONT = "Sora,Arial,sans-serif";
  const stepX = W / (points.length - 1);

  const xy = points.map((p, i) => [
    +(stepX * i).toFixed(2),
    +((1 - p / 100) * H).toFixed(2),
  ]);
  const polyline = xy.map(([x, y]) => `${x},${y}`).join(" ");
  const polygon  = `0,${H} ${polyline} ${W},${H}`;
  const last = xy[xy.length - 1];

  // Labels Y à gauche — rendus AVANT le tracé (background)
  // pos=0 → bas du chart (y=H), pos=100 → haut (y=0)
  const yAxisSvg = (yAxisTicks || []).map(({ label, pos }) => {
    if (!label) return "";
    const y = +((1 - pos / 100) * H).toFixed(2);
    return `<text x="6" y="${y - 5}" font-family="${FONT}" font-size="11" font-weight="600" fill="#9999BB" text-anchor="start">${escapeHtml(label)}</text>`;
  }).join("\n    ");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" height="${H}" preserveAspectRatio="none" style="display:block;">
    <defs>
      <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#00FFFF" stop-opacity="0.4"/>
        <stop offset="100%" stop-color="#00FFFF" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="g2" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="${THEME.accentSecondary}"/>
        <stop offset="100%" stop-color="#00FFFF"/>
      </linearGradient>
    </defs>
    <line x1="0" x2="${W}" y1="${H * 0.25}" y2="${H * 0.25}" stroke="#222229" stroke-dasharray="2 4"/>
    <line x1="0" x2="${W}" y1="${H * 0.5}"  y2="${H * 0.5}"  stroke="#222229" stroke-dasharray="2 4"/>
    <line x1="0" x2="${W}" y1="${H * 0.75}" y2="${H * 0.75}" stroke="#222229" stroke-dasharray="2 4"/>
    ${yAxisSvg}
    <polygon points="${polygon}" fill="url(#g1)"/>
    <polyline points="${polyline}" fill="none" stroke="url(#g2)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${last[0]}" cy="${last[1]}" r="5" fill="#00FFFF" stroke="${THEME.bgPage}" stroke-width="2"/>
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
  const colors = ["#FF4B28", "#FF8B28", "#75808B", "#00BB97", "#03FFCF"];
  const segments = colors.map((c, i) =>
    `<path d="M ${pt(bounds[i])} A ${r} ${r} 0 0 1 ${pt(bounds[i + 1])}" fill="none" stroke="${c}" stroke-width="14"/>`
  ).join("\n    ");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 120" width="200" height="120">
    ${segments}
    <g transform="rotate(${needleAngle.toFixed(2)} ${cx} ${cy})">
      <line x1="${cx}" y1="${cy}" x2="${cx}" y2="26" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
      <circle cx="${cx}" cy="${cy}" r="6" fill="#ffffff"/>
    </g>
  </svg>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Section header (numéro + kicker)
// ─────────────────────────────────────────────────────────────────────────────

function sectionHeader(number, kicker) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0">
    <tr>
      ${number ? `<td style="font-family:${FONTS.heading}; font-weight:700; font-size:13px; color:${THEME.accentPrimary}; padding-right:12px;">${escapeHtml(number)}</td>` : ""}
      <td style="font-family:${FONTS.body}; font-size:11px; letter-spacing:0.2em; text-transform:uppercase; color:${THEME.textMuted}; font-weight:500;">${escapeHtml(kicker)}</td>
    </tr>
  </table>`;
}

function sectionTitle(title) {
  return `<h2 class="em-h2" style="margin:12px 0 0; font-family:${FONTS.heading}; font-weight:600; font-size:30px; line-height:1.1; letter-spacing:-0.025em; color:${THEME.textPrimary};">
    ${escapeHtml(title)}
  </h2>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Rendu de chaque type de section
// ─────────────────────────────────────────────────────────────────────────────

function renderHero(data) {
  const chips = (data.chips || []).map((c, i, arr) => `
    <td style="${i < arr.length - 1 ? "padding-right:8px;" : ""}">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
        <tr><td style="border:1px solid ${THEME.borderStrong}; border-radius:99px; padding:8px 14px; font-family:${FONTS.body}; font-size:12px; font-weight:500; color:#E9EEF2;">${escapeHtml(c.label)}</td></tr>
      </table>
    </td>`).join("");

  return `
    <tr>
      <td class="em-px" style="padding:56px 36px 40px;">
        <p style="margin:0 0 28px; font-family:${FONTS.body}; font-size:11px; letter-spacing:0.2em; color:${THEME.accentPrimary}; font-weight:600; text-transform:uppercase;">
          ${escapeHtml(data.kicker)}
        </p>
        <h1 class="em-h1" style="margin:0; font-family:${FONTS.heading}; font-weight:700; font-size:60px; line-height:0.98; letter-spacing:-0.035em; color:${THEME.textPrimary};">
          ${escapeHtml(data.title_part1)}<br />
          ${escapeHtml(data.title_part2)}<span style="color:${THEME.accentPrimary};">${escapeHtml(data.title_highlight)}</span>
        </h1>
        <p style="margin:22px 0 0; font-family:${FONTS.body}; font-size:17px; line-height:1.5; color:${THEME.textMuted}; max-width:460px;">
          ${sanitizeRichText(data.subtitle)}
        </p>
        ${chips ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:28px;"><tr>${chips}</tr></table>` : ""}
      </td>
    </tr>`;
}

function renderIndex(data, allSections) {
  const rows = (data.items || []).map((item, i, arr) => {
    const padding = i === arr.length - 1 ? "8px 0 28px" : "8px 0";
    const href = indexHref(item, allSections);
    const number = escapeHtml(item.number);
    const title = escapeHtml(item.title);
    const numberHtml = href
      ? `<a href="${escapeAttr(href)}" style="color:${THEME.textFaint}; text-decoration:none;">${number}</a>`
      : number;
    const titleHtml = href
      ? `<a href="${escapeAttr(href)}" style="color:${THEME.textPrimary}; text-decoration:none;">${title}</a>`
      : title;
    return `<tr>
      <td style="padding:${padding};">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td width="32" valign="baseline" style="font-family:${FONTS.heading}; font-weight:600; font-size:13px; color:${THEME.textFaint};">${numberHtml}</td>
            <td valign="baseline" style="font-family:${FONTS.heading}; font-weight:500; font-size:17px; color:${THEME.textPrimary}; letter-spacing:-0.01em;">${titleHtml}</td>
          </tr>
        </table>
      </td>
    </tr>`;
  }).join("");

  return `
    <tr>
      <td class="em-px" style="padding:0 36px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid ${THEME.borderSubtle}; border-bottom:1px solid ${THEME.borderSubtle};">
          <tr>
            <td style="padding:28px 0 18px;">
              <p style="margin:0; font-family:${FONTS.body}; font-size:11px; letter-spacing:0.18em; text-transform:uppercase; color:${THEME.textDim}; font-weight:500;">${escapeHtml(data.label)}</p>
            </td>
          </tr>
          ${rows}
        </table>
      </td>
    </tr>`;
}

function renderEdito(data, number, anchor = "") {
  const kpis = data.kpis || [];
  const cells = kpis.map((k, i) => {
    const isLast = i === kpis.length - 1;
    const width = `${Math.floor(100 / Math.max(kpis.length, 1))}%`;
    const borderRight = isLast ? "" : `border-right:1px solid ${THEME.border};`;
    return `<td valign="top" width="${width}" style="padding:16px 14px; ${borderRight}">
      <p style="margin:0; font-family:${FONTS.body}; font-size:10px; letter-spacing:0.16em; color:${THEME.textDim}; font-weight:500;">${escapeHtml(k.label)}</p>
      <p style="margin:6px 0 2px; font-family:${FONTS.heading}; font-weight:600; font-size:18px; color:${THEME.textPrimary}; letter-spacing:-0.02em;">${escapeHtml(k.value)}</p>
      <p style="margin:0; font-family:${FONTS.body}; font-size:12px; color:${toneColor(k.tone)}; font-weight:500;">${escapeHtml(k.delta)}</p>
    </td>`;
  }).join("");

  const grid = kpis.length ? `
    <table role="presentation" class="em-kpi-grid" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${THEME.border};">
      <tr>${cells}</tr>
    </table>` : "";

  return `
    <tr>
      <td class="em-px" style="padding:44px 36px; border-bottom:1px solid ${THEME.border};">
        ${anchor}
        ${sectionHeader(number, data.kicker)}
        ${sectionTitle(data.title)}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr><td style="padding-top:22px;"><p style="margin:0; font-family:${FONTS.body}; font-size:15px; line-height:1.65; color:${THEME.textSecondary};">${sanitizeRichText(data.body)}</p></td></tr>
          ${grid ? `<tr><td style="padding-top:24px;">${grid}</td></tr>` : ""}
        </table>
      </td>
    </tr>`;
}

function renderChart(data, assetMode) {
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
    return `<td width="${w}" align="${align}" style="font-family:${FONTS.body}; font-size:11px; color:${THEME.textFaint}; letter-spacing:0.06em;">${escapeHtml(l)}</td>`;
  }).join("");

  return `
    <tr>
      <td class="em-px" style="padding:36px 36px 28px; background-color:${THEME.bgSection}; border-bottom:1px solid ${THEME.border};">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td valign="bottom">
              <p style="margin:0; font-family:${FONTS.body}; font-size:11px; letter-spacing:0.18em; text-transform:uppercase; color:${THEME.textDim}; font-weight:500;">${escapeHtml(data.label)}</p>
              <p class="em-chart-value" style="margin:4px 0 0; font-family:${FONTS.heading}; font-weight:700; font-size:36px; letter-spacing:-0.03em; color:${THEME.textPrimary};">${escapeHtml(data.value)}</p>
            </td>
            <td align="right" valign="bottom">
              <p style="margin:0; font-family:${FONTS.heading}; font-weight:600; font-size:18px; color:${toneColor(data.delta_tone)};">${escapeHtml(data.delta)}</p>
              <p style="margin:2px 0 0; font-family:${FONTS.body}; font-size:12px; color:${THEME.textDim}; letter-spacing:0.04em;">${escapeHtml(data.subdelta)}</p>
            </td>
          </tr>
          <tr>
            <td colspan="2" style="padding-top:20px;">
              ${buildChartSvg(data.points, assetMode, { yAxisTicks: data.y_axis_ticks ?? [] })}
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

function renderFearGreed(data, number, assetMode, anchor = "") {
  const fgColor = fgClassificationColor(data.classification);
  const legend = [
    { color: "#FF4B28", range: "0–24", label: "Extreme Fear" },
    { color: "#FF8B28", range: "25–44", label: "Fear" },
    { color: "#75808B", range: "45–54", label: "Neutral" },
    { color: "#00BB97", range: "55–74", label: "Greed" },
    { color: "#03FFCF", range: "75–100", label: "Extreme Greed" },
  ].map(r => `<tr>
    <td width="18" style="padding:2px 0;"><span style="display:inline-block; width:8px; height:8px; background:${r.color}; border-radius:99px; vertical-align:middle;"></span></td>
    <td width="62" style="padding:2px 12px 2px 0; font-family:${FONTS.body}; font-size:12px; color:${THEME.textDim}; white-space:nowrap;">${r.range}</td>
    <td style="padding:2px 0; font-family:${FONTS.body}; font-size:12px; color:${THEME.textSecondary}; white-space:nowrap;">${r.label}</td>
  </tr>`).join("");

  return `
    <tr>
      <td class="em-px" style="padding:44px 36px; border-bottom:1px solid ${THEME.border};">
        ${anchor}
        ${sectionHeader(number, data.kicker)}
        <h2 class="em-h2" style="margin:12px 0 22px; font-family:${FONTS.heading}; font-weight:600; font-size:30px; line-height:1.1; letter-spacing:-0.025em; color:${THEME.textPrimary};">${escapeHtml(data.title)}</h2>
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
        <p style="margin:22px 0 0; font-family:${FONTS.body}; font-size:15px; line-height:1.65; color:${THEME.textSecondary};">${sanitizeRichText(data.commentary)}</p>
      </td>
    </tr>`;
}

function renderSignals(data, number, anchor = "") {
  const items = data.signals || [];
  const rows = [];
  for (let i = 0; i < items.length; i += 2) {
    const left = items[i], right = items[i + 1];
    const isLast = i + 2 >= items.length;
    const cellOf = (s, position) => {
      if (!s) return `<td class="em-signal-col" width="50%"></td>`;
      const arrowUp = s.direction === "up";
      const bg = arrowUp ? "rgba(3,255,207,0.12)" : "rgba(255,75,40,0.14)";
      const fg = arrowUp ? THEME.positive : THEME.warning;
      const arrow = arrowUp ? "↗" : "↘";
      let borders = "";
      if (position === "tl") borders = `border-right:1px solid ${THEME.border}; border-bottom:1px solid ${THEME.border};`;
      else if (position === "tr") borders = `border-bottom:1px solid ${THEME.border};`;
      else if (position === "bl") borders = `border-right:1px solid ${THEME.border};`;
      return `<td class="em-signal-col" valign="top" width="50%" style="padding:20px 18px; ${borders}">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td valign="top" width="42">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
                <td width="28" height="28" align="center" valign="middle" style="background:${bg}; border-radius:99px; color:${fg}; font-family:Arial, sans-serif; font-size:14px; font-weight:700; line-height:28px;">${arrow}</td>
              </tr></table>
            </td>
            <td valign="top">
              <p style="margin:0 0 4px; font-family:${FONTS.heading}; font-weight:600; font-size:14px; color:${THEME.textPrimary};">${escapeHtml(s.title)}</p>
              <p style="margin:0; font-family:${FONTS.body}; font-size:13px; line-height:1.5; color:${THEME.textMuted};">${sanitizeRichText(s.description)}</p>
            </td>
          </tr>
        </table>
      </td>`;
    };
    const leftPos = isLast ? "bl" : "tl";
    const rightPos = isLast ? "br" : "tr";
    rows.push(`<tr>${cellOf(left, leftPos)}${cellOf(right, rightPos)}</tr>`);
  }
  const grid = items.length ? `<table role="presentation" class="em-signal-grid" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${THEME.border};">${rows.join("")}</table>` : "";

  return `
    <tr>
      <td class="em-px" style="padding:44px 36px; border-bottom:1px solid ${THEME.border};">
        ${anchor}
        ${sectionHeader(number, data.kicker)}
        <h2 class="em-h2" style="margin:12px 0 22px; font-family:${FONTS.heading}; font-weight:600; font-size:30px; line-height:1.1; letter-spacing:-0.025em; color:${THEME.textPrimary};">${escapeHtml(data.title)}</h2>
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
            <td style="font-family:${FONTS.body}; font-size:13px; color:${THEME.textSecondary};">${escapeHtml(b.label)}</td>
            <td align="right" style="font-family:${FONTS.heading}; font-weight:600; font-size:15px; color:${THEME.textPrimary};">${escapeHtml(b.value)}</td>
          </tr>
        </table>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:6px; height:6px; background-color:rgba(255,255,255,0.08); border-radius:99px;">
          <tr><td style="font-size:1px; line-height:1px;">
            <table role="presentation" width="${pct}%" cellpadding="0" cellspacing="0" border="0" style="height:6px; background-color:${THEME.accentSecondary}; background-image:linear-gradient(90deg, ${THEME.accentSecondary}, #00FFFF); border-radius:99px;">
              <tr><td style="height:6px; line-height:6px; font-size:1px;">&nbsp;</td></tr>
            </table>
          </td></tr>
        </table>
        <p style="margin:4px 0 0; font-family:${FONTS.body}; font-size:11px; color:${THEME.textDim}; letter-spacing:0.02em;">${escapeHtml(b.caption)}</p>
      </td>
    </tr>`;
  }).join("");
  return rows ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table>` : "";
}

function renderMacroBars(data) {
  const content = buildBarsHtml(data.bars);
  if (!content) return "";
  return `
    <tr>
      <td class="em-px" style="padding:28px 36px; background-color:${THEME.bgSection}; border-bottom:1px solid ${THEME.border};">
        ${content}
      </td>
    </tr>`;
}

function renderMacro(data, number, anchor = "") {
  const quoteBlock = data.quote ? `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#1a0c2e; background-image:linear-gradient(135deg, rgba(135,1,255,0.18), rgba(255,0,170,0.10)); border:0; border-radius:14px;">
      <tr><td style="padding:24px 24px;">
        <p style="margin:0; font-family:${FONTS.heading}; font-weight:500; font-size:18px; line-height:1.4; letter-spacing:-0.01em; color:${THEME.textPrimary};">«&nbsp;${sanitizeRichText(data.quote)}&nbsp;»</p>
        <p style="margin:14px 0 0; font-family:${FONTS.body}; font-size:12px; color:${THEME.textMuted}; letter-spacing:0.04em;">${sanitizeRichText(data.quote_author)}</p>
      </td></tr>
    </table>` : "";

  return `
    <tr>
      <td class="em-px" style="padding:44px 36px; border-bottom:1px solid ${THEME.border};">
        ${anchor}
        ${sectionHeader(number, data.kicker)}
        <h2 class="em-h2" style="margin:12px 0 22px; font-family:${FONTS.heading}; font-weight:600; font-size:30px; line-height:1.1; letter-spacing:-0.025em; color:${THEME.textPrimary};">${escapeHtml(data.title)}</h2>
        <p style="margin:0 0 22px; font-family:${FONTS.body}; font-size:15px; line-height:1.65; color:${THEME.textSecondary};">${sanitizeRichText(data.body)}</p>
        ${quoteBlock}
      </td>
    </tr>`;
}

function renderEvent(data, anchor = "") {
  return `
    <tr>
      <td class="em-px" style="padding:36px;">
        ${anchor}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${THEME.bgEventCard}; background-image:radial-gradient(ellipse at 0% 100%, ${THEME.accentSecondary} 0%, transparent 60%), radial-gradient(ellipse at 100% 0%, ${THEME.accentPrimary} 0%, transparent 50%); border-radius:18px;" bgcolor="${THEME.bgEventCard}">
          <tr><td>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td class="em-stack em-stack-pad" valign="middle" width="180" style="padding:32px 28px; border-right:1px solid ${THEME.borderStrong};">
                  <p class="em-event-day" style="margin:0; font-family:${FONTS.heading}; font-weight:700; font-size:80px; line-height:0.9; letter-spacing:-0.04em; color:${THEME.textPrimary};">${escapeHtml(data.day)}</p>
                  <p style="margin:8px 0 2px; font-family:${FONTS.heading}; font-weight:600; font-size:18px; letter-spacing:0.1em; color:${THEME.textPrimary};">${escapeHtml(data.month)}</p>
                  <p style="margin:0; font-family:${FONTS.body}; font-size:12px; color:${THEME.textMuted}; letter-spacing:0.1em;">${escapeHtml(data.year)}</p>
                </td>
                <td class="em-stack em-event-text" valign="middle" style="padding:32px 28px;">
                  <p style="margin:0 0 12px; font-family:${FONTS.body}; font-size:11px; letter-spacing:0.2em; text-transform:uppercase; font-weight:600; color:${THEME.positive};">${escapeHtml(data.kicker)}</p>
                  <h3 style="margin:0; font-family:${FONTS.heading}; font-weight:700; font-size:28px; letter-spacing:-0.025em; line-height:1.05; color:${THEME.textPrimary};">${escapeHtml(data.title)}</h3>
                  <p style="margin:12px 0 0; font-family:${FONTS.body}; font-size:13px; line-height:1.5; color:${THEME.textSecondary};">${sanitizeRichText(data.description)}</p>
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:18px;">
                    <tr><td bgcolor="#ffffff" style="border-radius:99px;">
                      <a href="${escapeAttr(data.cta_url)}" style="display:inline-block; padding:11px 20px; font-family:${FONTS.heading}; font-weight:600; font-size:13px; color:${THEME.bgEventCard}; text-decoration:none; border-radius:99px;">${escapeHtml(data.cta_label)}</a>
                    </td></tr>
                  </table>
                </td>
              </tr>
            </table>
          </td></tr>
        </table>
      </td>
    </tr>`;
}

function renderFocus(data, number, anchor = "") {
  // Image : si pas d'URL renseignée, on affiche un placeholder gris
  const imgUrl =
    data.image_url ||
    "https://placehold.co/568x280/1a0c2e/ffffff?text=VISUEL+%C2%B7+568+%C3%97+280";
  const altText = data.image_alt || "Visuel d'illustration";

  // CTA primaire (gradient) — version bulletproof avec fallback Outlook VML
  const primaryBtn = data.cta_primary_label
    ? `<td valign="middle" style="padding-right:10px;">
        <!--[if mso]>
        <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${escapeAttr(data.cta_primary_url || "#")}" style="height:46px; v-text-anchor:middle; width:260px;" arcsize="50%" stroke="f" fillcolor="${THEME.accentTertiary}">
          <w:anchorlock/>
          <center style="color:#ffffff; font-family:Arial, sans-serif; font-size:13px; font-weight:bold;">${escapeHtml(data.cta_primary_label)}</center>
        </v:roundrect>
        <![endif]-->
        <!--[if !mso]><!-->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td bgcolor="${THEME.accentTertiary}" style="border-radius:99px; background-color:${THEME.accentTertiary}; background-image:linear-gradient(90deg, ${THEME.accentSecondary} 0%, ${THEME.accentTertiary} 50%, ${THEME.accentPrimary} 100%);">
              <a href="${escapeAttr(data.cta_primary_url || "#")}" style="display:inline-block; padding:13px 22px; font-family:${FONTS.heading}; font-weight:600; font-size:13px; color:#ffffff; text-decoration:none; border-radius:99px; letter-spacing:0.01em;">${escapeHtml(data.cta_primary_label)}</a>
            </td>
          </tr>
        </table>
        <!--<![endif]-->
      </td>`
    : "";

  // CTA secondaire (outline)
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
    ? `<table role="presentation" class="em-cta-row" cellpadding="0" cellspacing="0" border="0" style="margin-top:26px;">
        <tr>${primaryBtn}${secondaryBtn}</tr>
      </table>`
    : "";

  return `
    <tr>
      <td class="em-px" style="padding:44px 36px; border-bottom:1px solid ${THEME.border};">
        ${anchor}
        ${sectionHeader(number, data.kicker)}
        <h2 class="em-h2" style="margin:12px 0 22px; font-family:${FONTS.heading}; font-weight:600; font-size:30px; line-height:1.1; letter-spacing:-0.025em; color:${THEME.textPrimary};">${escapeHtml(data.title)}</h2>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:26px;">
          <tr>
            <td>
              <img src="${escapeAttr(imgUrl)}" width="568" height="280" alt="${escapeAttr(altText)}" style="display:block; width:100%; max-width:568px; height:auto; border-radius:14px; border:1px solid ${THEME.borderSubtle};" />
            </td>
          </tr>
        </table>

        <p style="margin:0; font-family:${FONTS.body}; font-size:15px; line-height:1.65; color:${THEME.textSecondary};">
          ${sanitizeRichText(data.body)}
        </p>

        ${ctaRow}
      </td>
    </tr>`;
}

function renderImageBlock(data) {
  const imgUrl =
    data.image_url ||
    "https://placehold.co/568x280/1a0c2e/ffffff?text=VISUEL+%C2%B7+568+%C3%97+280";
  const altText = data.image_alt || "Visuel d'illustration";
  const image = `<img src="${escapeAttr(imgUrl)}" width="568" height="280" alt="${escapeAttr(altText)}" style="display:block; width:100%; max-width:568px; height:auto; border-radius:14px; border:1px solid ${THEME.borderSubtle};" />`;
  const linkedImage = data.link_url
    ? `<a href="${escapeAttr(data.link_url)}" target="_blank" style="display:block; text-decoration:none;">${image}</a>`
    : image;

  return `
    <tr>
      <td class="em-px" style="padding:36px; border-bottom:1px solid ${THEME.border};">
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

function renderTextBlock(data, number, anchor = "") {
  const ctaBtn = data.cta_label
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:28px;">
        <tr>
          <td bgcolor="${THEME.accentTertiary}" style="border-radius:99px; background-color:${THEME.accentTertiary}; background-image:linear-gradient(90deg, ${THEME.accentSecondary} 0%, ${THEME.accentTertiary} 50%, ${THEME.accentPrimary} 100%);">
            <a href="${escapeAttr(data.cta_url || "#")}" style="display:inline-block; padding:13px 22px; font-family:${FONTS.heading}; font-weight:600; font-size:13px; color:#ffffff; text-decoration:none; border-radius:99px; letter-spacing:0.01em;">${escapeHtml(data.cta_label)}</a>
          </td>
        </tr>
      </table>`
    : "";

  return `
    <tr>
      <td class="em-px" style="padding:44px 36px; border-bottom:1px solid ${THEME.border};">
        ${anchor}
        ${sectionHeader(number, data.kicker)}
        ${sectionTitle(data.title)}
        <p style="margin:22px 0 0; font-family:${FONTS.body}; font-size:15px; line-height:1.65; color:${THEME.textSecondary};">${sanitizeRichText(data.body)}</p>
        ${ctaBtn}
      </td>
    </tr>`;
}

function renderDivider(data) {
  if (data.style === "gradient") {
    return `<tr><td style="height:3px; line-height:3px; font-size:1px; background-color:${THEME.accentTertiary}; background-image:linear-gradient(90deg, ${THEME.accentSecondary} 0%, ${THEME.accentTertiary} 50%, ${THEME.accentPrimary} 100%);">&nbsp;</td></tr>`;
  }
  const height = data.style === "thick" ? "4" : "1";
  return `<tr><td style="height:${height}px; line-height:${height}px; font-size:1px; background-color:${THEME.borderStrong};">&nbsp;</td></tr>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Dispatcher : section → fonction de rendu
// ─────────────────────────────────────────────────────────────────────────────

function renderSection(sec, allSections, assetMode) {
  const number = computeSectionNumber(allSections, sec.id);
  const anchor = number ? sectionAnchor(sec.id) : "";
  switch (sec.type) {
    case "hero":       return renderHero(sec.data);
    case "index":      return renderIndex(sec.data, allSections);
    case "edito":      return renderEdito(sec.data, number, anchor);
    case "chart":      return renderChart(sec.data, assetMode);
    case "fear_greed": return renderFearGreed(sec.data, number, assetMode, anchor);
    case "signals":    return renderSignals(sec.data, number, anchor);
    case "macro":      return renderMacro(sec.data, number, anchor);
    case "macro_bars": return renderMacroBars(sec.data);
    case "event":      return renderEvent(sec.data, anchor);
    case "focus":      return renderFocus(sec.data, number, anchor);
    case "image_block": return renderImageBlock(sec.data);
    case "text_block": return renderTextBlock(sec.data, number, anchor);
    case "divider":    return renderDivider(sec.data);
    default:           return `<tr><td>Type inconnu : ${escapeHtml(sec.type)}</td></tr>`;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Header & footer fixes
// ─────────────────────────────────────────────────────────────────────────────

function renderHeader(state, assetMode) {
  return `
    <tr>
      <td style="height:4px; line-height:4px; font-size:1px; background-color:${THEME.accentTertiary}; background-image:linear-gradient(90deg, ${THEME.accentSecondary} 0%, ${THEME.accentTertiary} 30%, ${THEME.accentPrimary} 60%, ${THEME.accentWarm} 100%);">&nbsp;</td>
    </tr>
    <tr>
      <td class="em-px" style="padding:22px 36px; border-bottom:1px solid ${THEME.border};">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="left" valign="middle">
              <img src="https://cdn.braze.eu/appboy/communication/assets/image_assets/images/6a032aec37800e0085f8e2ac/original.png?1778592492" width="180" alt="Coinhouse" style="display:inline-block; vertical-align:middle; border:0; max-width:180px; height:auto;" />
            </td>
            <td align="right" valign="middle" style="font-family:${FONTS.body}; font-size:11px; letter-spacing:0.14em; text-transform:uppercase; color:${THEME.textMuted};">
              ${escapeHtml(state.issue_date)}
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

function renderFooter(footer, assetMode) {
  const links = (footer.links || []).filter(l => l.label && l.url).map(l => `
    <td style="padding:0 11px;">
      <a href="${escapeAttr(l.url)}" style="font-family:${FONTS.body}; font-size:12px; color:${THEME.textMuted}; letter-spacing:0.04em; text-decoration:none;">${escapeHtml(l.label)}</a>
    </td>`).join("");

  return `
    <tr>
      <td bgcolor="${THEME.bgFooter}" style="background-color:${THEME.bgFooter}; padding:40px 36px 32px; border-top:1px solid ${THEME.borderSubtle};" align="center">
        <div style="margin-bottom:10px;"><img src="https://cdn.braze.eu/appboy/communication/assets/image_assets/images/6a032aec37800e0085f8e2ac/original.png?1778592492" width="180" alt="Coinhouse" style="display:block; margin:0 auto; border:0; max-width:180px; height:auto;" /></div>
        ${links ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;" align="center"><tr>${links}</tr></table>` : ""}
        <p style="margin:0; font-family:${FONTS.body}; font-size:11px; color:${THEME.textDim}; line-height:1.6; letter-spacing:0.02em;">
          ${escapeHtml(footer.address)}<br /><br />
          <span style="color:${THEME.textFaint};">${sanitizeRichText(footer.legal)}</span>
        </p>
        <p style="margin:18px 0 0; font-family:${FONTS.body}; font-size:11px; color:${THEME.textFaint};">
          <a href="${escapeAttr(footer.unsub_url || "{{${set_user_to_unsubscribed_url}}}")}" style="color:${THEME.textFaint}; text-decoration:underline;">Se désinscrire</a>
        </p>
      </td>
    </tr>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Document complet
// ─────────────────────────────────────────────────────────────────────────────

export function buildEmailHtml(state, options = {}) {
  const assetMode = options.assetMode || "inline"; // "inline" ou "external"
  const sectionsHtml = (state.sections || [])
    .map(s => renderSection(s, state.sections, assetMode))
    .join("");

  return `<!doctype html>
<html lang="fr" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="format-detection" content="telephone=no, date=no, address=no, email=no" />
<meta name="color-scheme" content="dark" />
<meta name="supported-color-schemes" content="dark" />
<title>Décrypto — ${escapeHtml(state.issue_date)}</title>
<!--[if mso]>
<noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
<style>
  table, td, div, h1, h2, h3, p, a { font-family: Arial, sans-serif !important; }
</style>
<![endif]-->
<style>
  @font-face {
    font-family: 'Sora';
    src: url('${FONTS.customFontUrl}') format('truetype');
    font-weight: 100 900; font-style: normal; font-display: swap;
  }
  @font-face {
    font-family: 'DM Sans';
    src: url('${FONTS.customFontUrl}') format('truetype');
    font-weight: 100 900; font-style: normal; font-display: swap;
  }
  html, body { margin: 0 !important; padding: 0 !important; height: 100% !important; width: 100% !important; }
  * { -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; }
  table, td { mso-table-lspace: 0pt !important; mso-table-rspace: 0pt !important; border-collapse: collapse !important; border-spacing: 0 !important; }
  img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; display: block; }
  a { text-decoration: none; }
  body { background-color: ${THEME.bgPage}; }
  @media only screen and (max-width: 640px) {
    .em-container { width: 100% !important; max-width: 100% !important; }
    .em-px { padding-left: 24px !important; padding-right: 24px !important; }
    .em-stack { display: block !important; width: 100% !important; box-sizing: border-box !important; border-right: none !important; }
    .em-stack-pad { padding-bottom: 16px !important; border-bottom: 1px solid rgba(255,255,255,0.16) !important; }
    .em-h1 { font-size: 44px !important; line-height: 1 !important; }
    .em-h2 { font-size: 24px !important; }
    .em-event-day { font-size: 60px !important; }
    .em-chart-value { font-size: 28px !important; }
    .em-kpi-grid td { display: block !important; width: 100% !important; box-sizing: border-box !important; border-right: none !important; border-bottom: 1px solid rgba(255,255,255,0.06) !important; }
    .em-signal-col { display: block !important; width: 100% !important; box-sizing: border-box !important; }
    .em-event-text { word-break: break-word !important; overflow-wrap: break-word !important; }
  }
</style>
</head>
<body style="margin:0; padding:0; background-color:${THEME.bgPage}; font-family:${FONTS.body};">

<div style="display:none; font-size:1px; color:${THEME.bgPage}; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden;">
  ${escapeHtml(state.preview_text)} ⏤ ⏤ ⏤ ⏤ ⏤ ⏤ ⏤ ⏤ ⏤ ⏤
</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${THEME.bgPage}" style="background-color:${THEME.bgPage};">
  <tr><td align="center" style="padding:0;">
    <table role="presentation" class="em-container" width="640" cellpadding="0" cellspacing="0" border="0" style="width:640px; max-width:640px; background-color:${THEME.bgEmail};">
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

export function getChartSvgFull(points, yAxisTicks = []) {
  return buildChartSvg(points, "inline", { yAxisTicks });
}

export function getGaugeSvgFull(value) {
  return buildFgGauge(value, "inline");
}
