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
  getLogoSvg,
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

  // Logo header (22px → on rend en 64px pour avoir une réserve de qualité)
  const headerLogo = getLogoSvg(64, "#ffffff");
  assets["logo-header.png"] = await svgToPngBlob(headerLogo, 64, 64);

  // Logo footer (42px → rendu en 128px)
  const footerLogo = getLogoSvg(128, "#ffffff");
  assets["logo-footer.png"] = await svgToPngBlob(footerLogo, 128, 128);

  // Pour chaque section "chart" et "fear_greed" présente, on génère son PNG.
  // Note : si plusieurs sections du même type existent, elles se partagent
  // le même asset (chart.png, gauge.png). C'est volontaire pour limiter le
  // poids du pack — l'utilisateur peut renommer dans le HTML s'il veut
  // différencier.
  let needChart = false;
  let chartPoints = null;
  let needGauge = false;
  let gaugeValue = null;

  for (const sec of state.sections || []) {
    if (sec.type === "chart" && !needChart) {
      needChart = true;
      chartPoints = sec.data.points;
    }
    if (sec.type === "fear_greed" && !needGauge) {
      needGauge = true;
      gaugeValue = sec.data.value;
    }
  }

  if (needChart) {
    const chartSvg = getChartSvgFull(chartPoints).replace(
      /width="[^"]*"/,
      'width="1120"'
    );
    assets["chart.png"] = await svgToPngBlob(chartSvg, 1120, 360);
  }

  if (needGauge) {
    const gaugeSvg = getGaugeSvgFull(gaugeValue);
    assets["gauge.png"] = await svgToPngBlob(gaugeSvg, 200, 120);
  }

  return assets;
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

  // 1. Génère les PNG
  const assets = await buildPngAssets(state);

  // 2. HTML avec références externes
  const html = buildEmailHtml(state, { assetMode: "external" });
  zip.file("email.html", html);

  // 3. Assets PNG
  const assetsFolder = zip.folder("assets");
  for (const [name, blob] of Object.entries(assets)) {
    assetsFolder.file(name, blob);
  }

  // 4. README
  zip.file("README.md", buildReadme(state));

  // 5. Génère et déclenche le téléchargement
  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
