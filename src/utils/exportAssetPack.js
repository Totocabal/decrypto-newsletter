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
  getChartSvgFull,
  getGaugeSvgFull,
} from "../render/buildEmail.js";

// Densité PNG : 2× pour les écrans Retina + une marge de sécurité pour le zoom
const PIXEL_RATIO = 2;

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
    img.onerror = (e) => reject(new Error("Chargement SVG → PNG échoué : " + e));
    img.src = dataUrl;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Génère tous les PNG du pack
// ─────────────────────────────────────────────────────────────────────────────

async function buildPngAssets(state) {
  const assets = {};

  // Pour chaque section "chart" et "fear_greed" présente, on génère son PNG.
  let needChart = false;
  let chartPoints = null;
  let needGauge = false;
  let gaugeValue = null;
  // Map { sectionId → { url, filename } } pour les images de blocs focus/image
  const focusImages = [];

  let chartPriceStart = "";
  let chartPriceEnd = "";
  for (const sec of state.sections || []) {
    if (sec.type === "chart" && !needChart) {
      needChart = true;
      chartPoints = sec.data.points;
      chartPriceStart = sec.data.price_start ?? "";
      chartPriceEnd = sec.data.value ?? "";
    }
    if (sec.type === "fear_greed" && !needGauge) {
      needGauge = true;
      gaugeValue = sec.data.value;
    }
    if ((sec.type === "focus" || sec.type === "image_block") && sec.data.image_url) {
      // On télécharge l'image et on la met dans assets/ avec un nom unique
      const ext = guessImageExtension(sec.data.image_url);
      const filename = `${sec.type}-${sec.id}.${ext}`;
      focusImages.push({
        sectionId: sec.id,
        originalUrl: sec.data.image_url,
        filename,
      });
    }
  }

  if (needChart) {
    const chartSvg = getChartSvgFull(chartPoints, chartPriceStart, chartPriceEnd).replace(
      /width="[^"]*"/,
      'width="1120"'
    );
    assets["chart.png"] = await svgToPngBlob(chartSvg, 1120, 360);
  }

  if (needGauge) {
    const gaugeSvg = getGaugeSvgFull(gaugeValue);
    assets["gauge.png"] = await svgToPngBlob(gaugeSvg, 200, 120);
  }

  // Télécharge chaque image de bloc focus/image
  for (const fi of focusImages) {
    try {
      const resp = await fetch(fi.originalUrl);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const blob = await resp.blob();
      assets[fi.filename] = blob;
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
      if ((sec.type === "focus" || sec.type === "image_block") && sec.data.image_url) {
        const fi = focusImages.find((f) => f.sectionId === sec.id);
        if (fi && assets[fi.filename]) {
          return {
            ...sec,
            data: {
              ...sec.data,
              image_url: assetUrlMap[fi.filename] || `assets/${fi.filename}`,
            },
          };
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
  const html = buildEmailHtml(stateForExport, { assetMode: "external" });
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

export async function exportBrazeHtml(state, filename = "decrypto-braze.html", accessToken) {
  const { assets, focusImages } = await buildPngAssets(state);
  const stateForExport = buildExternalAssetState(state, focusImages, assets);
  const html = buildEmailHtml(stateForExport, { assetMode: "external" });

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
  const brazeHtml = replaceGeneratedAssetUrls(html, assetUrlMap);
  downloadText(brazeHtml, filename);
  return { html: brazeHtml, assets: assetUrlMap };
}
