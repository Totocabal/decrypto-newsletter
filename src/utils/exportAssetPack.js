// ─────────────────────────────────────────────────────────────────────────────
// exportAssetPack — génère un ZIP avec HTML + dossier assets/ contenant les PNG
// ─────────────────────────────────────────────────────────────────────────────
// Workflow :
//   1. On rend les SVG visuels (logo, chart, gauge) en PNG via canvas
//   2. On régénère le HTML email avec des <img src="assets/xxx.png"> au lieu
//      des SVG inline
//   3. On empaquette le tout dans un ZIP téléchargeable
//
// Tout se fait côté navigateur — pas de serveur nécessaire.

import JSZip from "jszip";
import {
  buildEmailHtml,
  getCalloutPictoFilename,
  getFeatureGridPictoFilename,
  getChartSvgFull,
  getGaugeSvgFull,
} from "../render/buildEmail.js";
import { CALLOUT_PICTOS_MAP, DEFAULT_PICTO_ID, DEFAULT_CALLOUT_COLOR } from "../config/calloutPictos.js";

// Densité PNG : 2× pour les écrans Retina + une marge de sécurité pour le zoom
const PIXEL_RATIO = 2;
const GRADIENT_HEADER_FILENAME = "gradient-header.png";
const GRADIENT_HEADER_URL = "https://decrypto-newsletter.vercel.app/gradient-header.png";
const EVENT_BG_FILENAME = "event-bg.png";
const EVENT_BG_URL = "https://decrypto-newsletter.vercel.app/event-bg.png";
const MACRO_QUOTE_BG_FILENAME = "macro-quote-bg.png";
const MACRO_QUOTE_BG_URL = "https://decrypto-newsletter.vercel.app/macro-quote-bg.png";
export const GRADIENT_CTA_FILENAME = "gradient-cta.png";

function hexToParts(hex = DEFAULT_CALLOUT_COLOR) {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return match
    ? [parseInt(match[1], 16), parseInt(match[2], 16), parseInt(match[3], 16)]
    : [0, 255, 255];
}

function readableTextOn(hex) {
  const [r, g, b] = hexToParts(hex).map((value) => {
    const v = value / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.45 ? "#111318" : "#FFFFFF";
}

// ─────────────────────────────────────────────────────────────────────────────
// SVG → PNG côté navigateur
// ─────────────────────────────────────────────────────────────────────────────

function svgToPngBlob(svgString, width, height) {
  return new Promise((resolve, reject) => {
    // Encodage UTF-8-safe pour les caractères spéciaux
    const svg64 = btoa(unescape(encodeURIComponent(svgString)));
    const dataUrl = `data:image/svg+xml;base64,${svg64}`;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width * PIXEL_RATIO;
      canvas.height = height * PIXEL_RATIO;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Canvas toBlob a échoué"));
        },
        "image/png",
        1.0
      );
    };
    img.onerror = () => reject(new Error("Chargement SVG → PNG échoué"));
    img.src = dataUrl;
  });
}

/**
 * Génère un PNG du dégradé CTA (#4141FF → #8701FF → #FF00AA) via canvas.
 * Ce PNG est utilisé comme background-image sur les boutons CTA pour
 * conserver le dégradé dans Gmail app (qui ignore les CSS linear-gradient).
 */
function gradientCtaPngBlob() {
  return new Promise((resolve, reject) => {
    const W = 600;
    const H = 46;
    const canvas = document.createElement("canvas");
    canvas.width = W * PIXEL_RATIO;
    canvas.height = H * PIXEL_RATIO;
    const ctx = canvas.getContext("2d");
    const grad = ctx.createLinearGradient(0, 0, W * PIXEL_RATIO, 0);
    grad.addColorStop(0, "#4141FF");
    grad.addColorStop(0.5, "#8701FF");
    grad.addColorStop(1, "#FF00AA");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W * PIXEL_RATIO, H * PIXEL_RATIO);
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("Canvas toBlob CTA gradient échoué")),
      "image/png",
      1.0
    );
  });
}

function imageBlobToPngBlob(blob) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(objectUrl);
      canvas.toBlob(
        (pngBlob) => pngBlob ? resolve(pngBlob) : reject(new Error("Conversion image → PNG échouée")),
        "image/png",
        1.0
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Chargement image → PNG échoué"));
    };
    img.src = objectUrl;
  });
}

function signalArrowPngBlob(direction, themeVariant) {
  return new Promise((resolve, reject) => {
    const isLight = themeVariant === "light";
    const bg = direction === "up"
      ? (isLight ? "#DDF7F1" : "#003D33")
      : (isLight ? "#FFE8D7" : "#3A1F12");
    const fg = direction === "up"
      ? (isLight ? "#00A889" : "#03FFCF")
      : (isLight ? "#D65F00" : "#FF8B28");
    const SIZE = 28;
    const W = SIZE * PIXEL_RATIO;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = W;
    const ctx = canvas.getContext("2d");
    ctx.beginPath();
    ctx.arc(W / 2, W / 2, W / 2, 0, Math.PI * 2);
    ctx.fillStyle = bg;
    ctx.fill();
    ctx.fillStyle = fg;
    ctx.font = `900 ${16 * PIXEL_RATIO}px Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(direction === "up" ? "↗" : "↘", W / 2, W / 2);
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("Canvas toBlob signal arrow échoué")),
      "image/png",
      1.0
    );
  });
}

function buildStandalonePictoSvg(svgInner, color, size = 32) {
  const inner = svgInner.replace(/currentColor/g, color);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Génère tous les PNG du pack
// ─────────────────────────────────────────────────────────────────────────────

async function buildPngAssets(state) {
  const assets = {};
  const calloutPictos = [];
  const featureGridPictos = [];

  // Pour chaque section "chart" et "fear_greed" présente, on génère son PNG.
  let needChart = false;
  let chartPoints = null;
  let needGauge = false;
  let gaugeValue = null;
  let needCtaGradient = false;
  let needSignalArrows = false;
  // Map { sectionId → { url, filename } } pour les images de blocs focus/image
  const focusImages = [];

  let chartYAxisLabels = [];
  for (const sec of state.sections || []) {
    if (sec.type === "signals") needSignalArrows = true;
    if (sec.type === "chart" && !needChart) {
      needChart = true;
      chartPoints = sec.data.points;
      chartYAxisLabels = {
        priceStart: sec.data.price_start ?? "",
        priceEnd:   sec.data.value       ?? "",
        priceHigh:  sec.data.price_high  ?? "",
        priceLow:   sec.data.price_low   ?? "",
      };
    }
    if (sec.type === "fear_greed" && !needGauge) {
      needGauge = true;
      gaugeValue = sec.data.value;
    }
    if (sec.type === "macro" && sec.data.bg_image_url) {
      const ext = guessImageExtension(sec.data.bg_image_url);
      focusImages.push({ sectionId: sec.id, kind: "macro_bg", originalUrl: sec.data.bg_image_url, filename: `macro-bg-${sec.id}.${ext}` });
    }
    if (sec.type === "feature_grid") {
      if (sec.data.bg_image_url) {
        focusImages.push({
          sectionId: sec.id,
          kind: "feature_grid_bg",
          originalUrl: sec.data.bg_image_url,
          filename: `feature-grid-bg-${sec.id}.png`,
          convertToPng: true,
        });
      }
      const featureIcons = [
        ...(sec.data.featured?.show_icon === false ? [] : [sec.data.featured || {}]),
        ...(sec.data.items || []),
      ];
      featureIcons.forEach((item) => {
        const pictoId = item.picto || DEFAULT_PICTO_ID;
        const color = item.color || DEFAULT_CALLOUT_COLOR;
        const filename = getFeatureGridPictoFilename(pictoId, color);
        if (!featureGridPictos.some((p) => p.filename === filename)) {
          featureGridPictos.push({ pictoId, color, filename });
        }
      });
    }
    if (sec.type === "image_block" && sec.data.image_url) {
      const ext = guessImageExtension(sec.data.image_url);
      focusImages.push({ sectionId: sec.id, originalUrl: sec.data.image_url, filename: `image_block-${sec.id}.${ext}` });
    }
    if (sec.type === "focus") {
      if (!needCtaGradient && sec.data.items?.some((it) => it.type === "cta")) {
        needCtaGradient = true;
      }
      if (sec.data.items) {
        // New items-based format
        sec.data.items.filter((it) => it.type === "image" && it.image_url).forEach((it, idx) => {
          const ext = guessImageExtension(it.image_url);
          focusImages.push({ sectionId: sec.id, itemId: it.id, originalUrl: it.image_url, filename: `focus-${sec.id}-${idx}.${ext}` });
        });
        sec.data.items.filter((it) => it.type === "callout" && it.show_icon !== false).forEach((it) => {
          const pictoId = it.picto || DEFAULT_PICTO_ID;
          const color = it.callout_color || DEFAULT_CALLOUT_COLOR;
          const filename = getCalloutPictoFilename(pictoId, color);
          if (!calloutPictos.some((p) => p.filename === filename)) {
            calloutPictos.push({ pictoId, color, filename });
          }
        });
      } else if (sec.data.image_url) {
        // Legacy flat format
        const ext = guessImageExtension(sec.data.image_url);
        focusImages.push({ sectionId: sec.id, originalUrl: sec.data.image_url, filename: `focus-${sec.id}.${ext}` });
      }
    }
  }

  if (needChart) {
    const chartSvg = getChartSvgFull(chartPoints, {
      ...chartYAxisLabels,
      themeVariant: state.theme_variant,
    }).replace(
      /width="[^"]*"/,
      'width="1120"'
    );
    assets["chart.png"] = await svgToPngBlob(chartSvg, 1120, 360);
  }

  if (needGauge) {
    const gaugeSvg = getGaugeSvgFull(gaugeValue, { themeVariant: state.theme_variant });
    assets["gauge.png"] = await svgToPngBlob(gaugeSvg, 200, 120);
  }

  if (needSignalArrows) {
    assets["signal-arrow-up.png"] = await signalArrowPngBlob("up", state.theme_variant);
    assets["signal-arrow-down.png"] = await signalArrowPngBlob("down", state.theme_variant);
  }

  for (const item of calloutPictos) {
    const picto = CALLOUT_PICTOS_MAP[item.pictoId] || CALLOUT_PICTOS_MAP[DEFAULT_PICTO_ID];
    const stroke = readableTextOn(item.color);
    const svg = buildStandalonePictoSvg(picto.svgInner, stroke, 32);
    assets[item.filename] = await svgToPngBlob(svg, 32, 32);
  }

  for (const item of featureGridPictos) {
    const picto = CALLOUT_PICTOS_MAP[item.pictoId] || CALLOUT_PICTOS_MAP[DEFAULT_PICTO_ID];
    const svg = buildStandalonePictoSvg(picto.svgInner, item.color, 32);
    assets[item.filename] = await svgToPngBlob(svg, 32, 32);
  }

  if (needCtaGradient) {
    try {
      assets[GRADIENT_CTA_FILENAME] = await gradientCtaPngBlob();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("[export] gradient-cta.png non généré :", e);
    }
  }

  try {
    const resp = await fetch(GRADIENT_HEADER_URL);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    assets[GRADIENT_HEADER_FILENAME] = await resp.blob();
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("[export] gradient-header.png non récupéré :", e);
  }

  const needEventBg = (state.sections || []).some(
    (sec) => sec.type === "event" && !String(sec.data?.bg_image_url || "").trim()
  );
  if (needEventBg) {
    try {
      const resp = await fetch(EVENT_BG_URL);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      assets[EVENT_BG_FILENAME] = await resp.blob();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("[export] event-bg.png non récupéré :", e);
    }
  }

  const needMacroQuoteBg = (state.sections || []).some(
    (sec) => ["macro", "feature_grid"].includes(sec.type) && !String(sec.data?.bg_image_url || "").trim()
  );
  if (needMacroQuoteBg) {
    try {
      const resp = await fetch(MACRO_QUOTE_BG_URL);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      assets[MACRO_QUOTE_BG_FILENAME] = await resp.blob();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("[export] macro-quote-bg.png non récupéré :", e);
    }
  }

  // Télécharge chaque image de bloc focus/image
  for (const fi of focusImages) {
    try {
      const resp = await fetch(fi.originalUrl);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const blob = await resp.blob();
      assets[fi.filename] = fi.convertToPng ? await imageBlobToPngBlob(blob) : blob;
    } catch (e) {
      // Échec → on log, on continue, le HTML pointera vers l'URL originale
      // eslint-disable-next-line no-console
      console.warn(`[export] image ${fi.filename} non récupérée :`, e);
    }
  }

  return { assets, focusImages };
}

function buildExternalAssetState(state, focusImages, assets, assetUrlMap = {}) {
  return {
    ...state,
    sections: (state.sections || []).map((sec) => {
      if (sec.type === "image_block" && sec.data.image_url) {
        const fi = focusImages.find((f) => f.sectionId === sec.id && !f.itemId);
        if (fi && assets[fi.filename]) {
          return { ...sec, data: { ...sec.data, image_url: assetUrlMap[fi.filename] || `assets/${fi.filename}` } };
        }
      }
      if (sec.type === "macro" && sec.data.bg_image_url) {
        const fi = focusImages.find((f) => f.sectionId === sec.id && f.kind === "macro_bg");
        if (fi && assets[fi.filename]) {
          return { ...sec, data: { ...sec.data, bg_image_url: assetUrlMap[fi.filename] || `assets/${fi.filename}` } };
        }
      }
      if (sec.type === "feature_grid" && sec.data.bg_image_url) {
        const fi = focusImages.find((f) => f.sectionId === sec.id && f.kind === "feature_grid_bg");
        if (fi && assets[fi.filename]) {
          return { ...sec, data: { ...sec.data, bg_image_url: assetUrlMap[fi.filename] || `assets/${fi.filename}` } };
        }
      }
      if (sec.type === "focus") {
        if (sec.data.items) {
          const nextItems = sec.data.items.map((it) => {
            if (it.type !== "image" || !it.image_url) return it;
            const fi = focusImages.find((f) => f.sectionId === sec.id && f.itemId === it.id);
            if (fi && assets[fi.filename]) {
              return { ...it, image_url: assetUrlMap[fi.filename] || `assets/${fi.filename}` };
            }
            return it;
          });
          return { ...sec, data: { ...sec.data, items: nextItems } };
        } else if (sec.data.image_url) {
          const fi = focusImages.find((f) => f.sectionId === sec.id && !f.itemId);
          if (fi && assets[fi.filename]) {
            return { ...sec, data: { ...sec.data, image_url: assetUrlMap[fi.filename] || `assets/${fi.filename}` } };
          }
        }
      }
      return sec;
    }),
  };
}

function replaceGeneratedAssetUrls(html, assetUrlMap) {
  return Object.entries(assetUrlMap).reduce(
    (nextHtml, [filename, url]) =>
      nextHtml.replaceAll(`assets/${filename}`, url),
    html
  );
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      resolve(result.includes(",") ? result.split(",")[1] : result);
    };
    reader.onerror = () => reject(reader.error || new Error("Lecture du fichier impossible"));
    reader.readAsDataURL(blob);
  });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function downloadText(text, filename, type = "text/html;charset=utf-8") {
  downloadBlob(new Blob([text], { type }), filename);
}

// Devine l'extension d'une URL image. Défaut : "jpg".
function guessImageExtension(url) {
  const m = url.match(/\.(png|jpe?g|gif|webp|svg)(\?|$)/i);
  if (m) return m[1].toLowerCase().replace("jpeg", "jpg");
  return "jpg";
}

// ─────────────────────────────────────────────────────────────────────────────
// README inclus dans le ZIP pour expliquer comment héberger les images
// ─────────────────────────────────────────────────────────────────────────────

function buildReadme(state) {
  return `# Décrypto · Export newsletter

Newsletter générée le ${new Date().toLocaleString("fr-FR")}.

## Contenu du pack

- \`email.html\` — le HTML email prêt à intégrer
- \`assets/\` — les visuels au format PNG référencés par le HTML

## Comment utiliser

Le HTML utilise des chemins **relatifs** vers les images :

\`\`\`html
<img src="assets/chart.png" ... />
\`\`\`

Avant de pouvoir envoyer cet email, tu dois héberger les images **quelque part
de publiquement accessible**, puis remplacer ces chemins par des URL absolues.

### Option 1 — Mailjet / Brevo / Sendinblue

Ces ESP gèrent l'upload pour toi. Crée une campagne, importe le ZIP entier, et
le système remappe automatiquement les chemins. Vérifie l'aperçu avant envoi.

### Option 2 — Cloudinary, AWS S3, Bunny, ou ton CDN interne

1. Upload tous les fichiers du dossier \`assets/\` sur ton bucket / CDN
2. Récupère l'URL publique de base (ex: \`https://cdn.coinhouse.com/decrypto/${state.issue_number}/\`)
3. Dans \`email.html\`, fais un find/replace :
   - **Chercher** : \`src="assets/\`
   - **Remplacer par** : \`src="https://cdn.coinhouse.com/decrypto/${state.issue_number}/\`

### Option 3 — Serveur Coinhouse

Upload les assets sur ton serveur, puis adapte les chemins comme ci-dessus.

## Compatibilité

- Conçu pour Outlook 2016+, Apple Mail, Gmail web/mobile, iOS Mail, Yahoo
- Largeur fixe 640px, responsive en dessous de 640px
- Dark mode forcé (les couleurs ne sont pas inversées par les clients)
- Texte de prévisualisation : "${state.preview_text}"

## Newsletter

- **Numéro** : ${state.issue_number}
- **Date** : ${state.issue_date}
- **Nombre de sections** : ${(state.sections || []).length}
`;
}

function buildHubSpotReadme(state) {
  return `# Décrypto · Export HubSpot

Newsletter générée le ${new Date().toLocaleString("fr-FR")}.

## Contenu du pack

- \`email.html\` — HTML email standard avec chemins relatifs \`assets/...\`
- \`email.hubl\` — variante HubL pour HubSpot Design Manager
- \`assets/\` — visuels PNG référencés par les deux fichiers

## Import dans HubSpot

1. Upload les fichiers du dossier \`assets/\` dans HubSpot Files.
2. Ouvre \`email.hubl\` dans HubSpot Design Manager ou dans ton workflow de template codé.
3. Remplace les chemins \`assets/...\` par les URLs HubSpot Files, ou adapte-les avec \`{{ get_asset_url(...) }}\` si les assets sont gérés dans Design Tools.
4. Vérifie l'aperçu email HubSpot avant envoi.

## Variables HubL incluses

- Désinscription : \`{{ unsubscribe_link }}\`
- Prénom contact si détecté depuis une variable Braze : \`{{ contact.firstname|default("...") }}\`

## Newsletter

- **Numéro** : ${state.issue_number}
- **Date** : ${state.issue_date}
- **Nombre de sections** : ${(state.sections || []).length}
`;
}

function convertBrazeLiquidToHubL(html = "") {
  return String(html)
    .replace(
      /\{\{\s*\$?\{?first_name\}?\s*\|\s*default:\s*["']([^"']*)["']\s*\}\}/gi,
      '{{ contact.firstname|default("$1") }}'
    )
    .replace(
      /\{\{\s*\$?\{?first_name\}?\s*\}\}/gi,
      "{{ contact.firstname }}"
    )
    .replace(
      /\{\{\s*\$?\{?set_user_to_unsubscribed_url\}?\s*\}\}/gi,
      "{{ unsubscribe_link }}"
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// API publique
// ─────────────────────────────────────────────────────────────────────────────

export async function exportAssetPack(state, filename = "decrypto-export.zip") {
  const zip = new JSZip();

  // 1. Génère les PNG + télécharge les images intégrées aux blocs
  const { assets, focusImages } = await buildPngAssets(state);

  // 2. HTML avec références externes. On clone l'état pour réécrire les URL
  // des images intégrées vers leur chemin local dans assets/.
  const stateForExport = buildExternalAssetState(state, focusImages, assets);
  const ctaGradientUrl = assets[GRADIENT_CTA_FILENAME] ? `assets/${GRADIENT_CTA_FILENAME}` : null;
  const html = buildEmailHtml(stateForExport, { assetMode: "external", ctaGradientUrl });
  zip.file("email.html", html);

  // 3. Assets (PNG + images intégrées)
  const assetsFolder = zip.folder("assets");
  for (const [name, blob] of Object.entries(assets)) {
    assetsFolder.file(name, blob);
  }

  // 4. README
  zip.file("README.md", buildReadme(state));

  // 5. Génère et déclenche le téléchargement
  const blob = await zip.generateAsync({ type: "blob" });
  downloadBlob(blob, filename);
}

async function buildExternalHtmlPayload(state) {
  const { assets, focusImages } = await buildPngAssets(state);
  const stateForExport = buildExternalAssetState(state, focusImages, assets);
  const ctaGradientUrl = assets[GRADIENT_CTA_FILENAME] ? `assets/${GRADIENT_CTA_FILENAME}` : null;
  const html = buildEmailHtml(stateForExport, { assetMode: "external", ctaGradientUrl });

  const serializedAssets = await Promise.all(
    Object.entries(assets).map(async ([name, blob]) => {
      const focusImage = focusImages.find((fi) => fi.filename === name);
      if (focusImage?.originalUrl) {
        return {
          name,
          assetUrl: focusImage.originalUrl,
        };
      }
      return {
        name,
        contentType: blob.type || "image/png",
        base64: await blobToBase64(blob),
      };
    })
  );

  return { html, serializedAssets };
}

async function exportHostedAssetHtml(state, filename, accessToken) {
  const { html, serializedAssets } = await buildExternalHtmlPayload(state);

  const resp = await fetch("/api/export-braze", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({ assets: serializedAssets }),
  });

  const payload = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error(payload?.error || `Export Braze impossible (HTTP ${resp.status})`);
  }

  const assetUrlMap = payload.assets || {};
  const finalHtml = replaceGeneratedAssetUrls(html, assetUrlMap);
  downloadText(finalHtml, filename);
  return { html: finalHtml, assets: assetUrlMap };
}

export async function exportBrazeHtml(state, filename = "decrypto-braze.html", accessToken) {
  return exportHostedAssetHtml(state, filename, accessToken);
}

export async function exportHubSpotPack(state, filename = "decrypto-hubspot.zip") {
  const zip = new JSZip();
  const { assets, focusImages } = await buildPngAssets(state);
  const stateForExport = buildExternalAssetState(state, focusImages, assets);
  const ctaGradientUrl = assets[GRADIENT_CTA_FILENAME] ? `assets/${GRADIENT_CTA_FILENAME}` : null;
  const html = buildEmailHtml(stateForExport, { assetMode: "external", ctaGradientUrl });
  const hubl = convertBrazeLiquidToHubL(html);

  zip.file("email.html", html);
  zip.file("email.hubl", hubl);

  const assetsFolder = zip.folder("assets");
  for (const [name, blob] of Object.entries(assets)) {
    assetsFolder.file(name, blob);
  }

  zip.file("README-HUBSPOT.md", buildHubSpotReadme(state));

  const blob = await zip.generateAsync({ type: "blob" });
  downloadBlob(blob, filename);
  return { html, hubl, assets };
}
