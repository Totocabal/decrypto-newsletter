// ─────────────────────────────────────────────────────────────────────────────
// heroRenderer — génère un visuel "hero" (titre Sora sur fond image) via canvas
// ─────────────────────────────────────────────────────────────────────────────
// La mise en page (retour à la ligne, alignement, placement) est volontairement
// séparée du dessin : layoutHero() est pure et testable sans canvas, renderHero()
// ne fait que dessiner le résultat.
//
// Balisage du texte : [[mot]] surligne en dégradé ; un retour à la ligne dans le
// champ texte force un retour à la ligne dans le visuel.

export const HERO_WIDTH = 996;
export const HERO_HEIGHT = 558;
export const HERO_BG_URL = "/hero-bg.webp";
// Le fond d'origine a des coins arrondis transparents : on recadre à l'intérieur
// pour ne jamais dessiner de pixel transparent. L'inset est exprimé pour une
// image de 996 px de large et mis à l'échelle (fond actuel : 1992 × 1116, soit
// 2× le format du hero, avec un inset minimal sûr de 10 px).
export const HERO_BG_INSET = 8;

// Fonds proposés dans le créateur de hero. `textColor` est la couleur de texte la plus
// lisible sur le fond : elle est appliquée au choix du fond (modifiable ensuite).
// Les fonds ajoutés sont en 1920 × 1080 (16:9, comme le hero) sans coins transparents.
export const HERO_BACKGROUNDS = [
  { id: "original", label: "Original", url: HERO_BG_URL, inset: HERO_BG_INSET, textColor: "dark" },
  { id: "color-coin", label: "Dégradé · pièce", url: "/hero-backgrounds/color-coin.webp", inset: 0, textColor: "light" },
  { id: "color", label: "Dégradé", url: "/hero-backgrounds/color.webp", inset: 0, textColor: "light" },
  { id: "light-coins", label: "Clair · pièces", url: "/hero-backgrounds/light-coins.webp", inset: 0, textColor: "dark" },
  { id: "light", label: "Clair", url: "/hero-backgrounds/light.webp", inset: 0, textColor: "dark" },
  { id: "grey-coins", label: "Gris · pièces", url: "/hero-backgrounds/grey-coins.webp", inset: 0, textColor: "dark" },
  { id: "grey", label: "Gris", url: "/hero-backgrounds/grey.webp", inset: 0, textColor: "dark" },
  { id: "dark-coins", label: "Noir · pièces", url: "/hero-backgrounds/dark-coins.webp", inset: 0, textColor: "light" },
  { id: "dark", label: "Noir", url: "/hero-backgrounds/dark.webp", inset: 0, textColor: "light" },
];
export const DEFAULT_HERO_BACKGROUND_ID = HERO_BACKGROUNDS[0].id;

// `backgrounds` : liste complète (fonds intégrés + fonds ajoutés depuis l'admin)
export function getHeroBackground(id, backgrounds = HERO_BACKGROUNDS) {
  return backgrounds.find((background) => background.id === id) || HERO_BACKGROUNDS[0];
}

export const HERO_FONT_FAMILY = "Sora";
export const HERO_BASE_WEIGHT = 500;
export const HERO_HIGHLIGHT_WEIGHT = 600;
// Dégradés disponibles pour les mots surlignés : B2C (violet → magenta → orange) et B2B
// (bleu → cyan → menthe → vert, comme les boutons du template B2B).
export const HERO_GRADIENTS = {
  b2c: {
    label: "B2C",
    stops: [
      [0, "#8701FF"],
      [0.55, "#FF00AA"],
      [1, "#FF4B28"],
    ],
  },
  b2b: {
    label: "B2B",
    stops: [
      [0, "#4141FF"],
      [0.22, "#5FA0FF"],
      [0.45, "#7DFFFF"],
      [0.7, "#7FFFD4"],
      [1, "#55B896"],
    ],
  },
};
export const HERO_TEXT_COLORS = { dark: "#111318", light: "#FFFFFF" };

export const HERO_POSITIONS = [
  "top-left", "top-center", "top-right",
  "middle-left", "middle-center", "middle-right",
  "bottom-left", "bottom-center", "bottom-right",
];

// Valeurs calibrées pour reproduire le visuel de référence 996 × 558 (titre en
// haut à gauche, 4 lignes, retour à la ligne après « Spiko Finance »).
export const DEFAULT_HERO_OPTIONS = {
  text: "Accédez aux fonds [[Spiko Finance SAS,]] valorisés chaque jour",
  fontSize: 71,
  lineHeight: 1.13,
  maxWidth: 82,
  margin: 80,
  position: "top-left",
  textColor: "dark",
  gradient: "b2c",
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, Number.isFinite(Number(value)) ? Number(value) : min));

export function normalizeHeroOptions(options = {}) {
  const merged = { ...DEFAULT_HERO_OPTIONS, ...options };
  return {
    text: String(merged.text ?? ""),
    fontSize: clamp(merged.fontSize, 16, 200),
    lineHeight: clamp(merged.lineHeight, 0.8, 2),
    maxWidth: clamp(merged.maxWidth, 20, 100),
    margin: clamp(merged.margin, 0, 240),
    position: HERO_POSITIONS.includes(merged.position) ? merged.position : DEFAULT_HERO_OPTIONS.position,
    textColor: merged.textColor === "light" ? "light" : "dark",
    gradient: merged.gradient === "b2b" ? "b2b" : "b2c",
  };
}

export function heroFontString(highlighted, fontSize) {
  const weight = highlighted ? HERO_HIGHLIGHT_WEIGHT : HERO_BASE_WEIGHT;
  return `${weight} ${fontSize}px ${HERO_FONT_FAMILY}, "DM Sans", Arial, sans-serif`;
}

export function stripHeroMarkup(text = "") {
  return String(text).replace(/\[\[|\]\]/g, "");
}

// "Accédez [[Spiko Finance]] ici" → une liste de paragraphes, chacun une liste
// de morceaux { text, hl }. L'état "surligné" se prolonge d'un paragraphe à l'autre.
export function parseHeroMarkup(text = "") {
  const paragraphs = [];
  let hl = false;
  for (const rawLine of String(text).split(/\r?\n/)) {
    const pieces = [];
    let buffer = "";
    const flush = () => {
      if (buffer) pieces.push({ text: buffer, hl });
      buffer = "";
    };
    for (let i = 0; i < rawLine.length; i += 1) {
      if (rawLine.startsWith("[[", i)) { flush(); hl = true; i += 1; continue; }
      if (rawLine.startsWith("]]", i)) { flush(); hl = false; i += 1; continue; }
      buffer += rawLine[i];
    }
    flush();
    paragraphs.push(pieces);
  }
  return paragraphs;
}

// Découpe les morceaux d'un paragraphe en mots (séparés par des espaces simples ;
// l'espace insécable ne coupe pas). Un mot = liste de morceaux { text, hl }.
function buildWords(pieces) {
  const words = [];
  let current = [];
  const flush = () => {
    if (current.length) words.push(current);
    current = [];
  };
  for (const piece of pieces) {
    piece.text.split(" ").forEach((part, index) => {
      if (index > 0) flush();
      if (part) current.push({ text: part, hl: piece.hl });
    });
  }
  flush();
  return words;
}

// Fusionne les segments consécutifs de même style en "runs" : un run surligné
// reçoit un seul dégradé continu, même s'il couvre plusieurs mots.
function mergeRuns(segments) {
  const runs = [];
  for (const segment of segments) {
    const last = runs[runs.length - 1];
    if (last && last.hl === segment.hl) {
      last.text += segment.text;
      last.width += segment.width;
    } else {
      runs.push({ ...segment });
    }
  }
  return runs;
}

/**
 * Calcule les lignes et la position absolue de chaque run.
 * @param {object} options options du hero (voir DEFAULT_HERO_OPTIONS)
 * @param {{ measure: (text: string, highlighted: boolean) => number, capHeight: number, width?: number, height?: number }} env
 */
export function layoutHero(options, { measure, capHeight, width = HERO_WIDTH, height = HERO_HEIGHT }) {
  const opts = normalizeHeroOptions(options);
  const { fontSize } = opts;
  const margin = Math.min(opts.margin, width / 2 - 20);
  const available = width - margin * 2;
  const boxWidth = Math.max(40, (available * opts.maxWidth) / 100);
  const lineHeightPx = fontSize * opts.lineHeight;
  const [vertical, horizontal] = opts.position.split("-");

  const lines = [];
  for (const pieces of parseHeroMarkup(opts.text)) {
    const words = buildWords(pieces).map((wordPieces) => {
      const segments = wordPieces.map((piece) => ({ ...piece, width: measure(piece.text, piece.hl) }));
      return {
        segments,
        width: segments.reduce((sum, segment) => sum + segment.width, 0),
        firstHl: segments[0].hl,
        lastHl: segments[segments.length - 1].hl,
      };
    });

    if (!words.length) {
      lines.push({ runs: [], width: 0 });
      continue;
    }

    let lineSegments = [];
    let lineWidth = 0;
    let previous = null;
    const commit = () => {
      lines.push({ runs: mergeRuns(lineSegments), width: lineWidth });
      lineSegments = [];
      lineWidth = 0;
    };

    for (const word of words) {
      if (!lineSegments.length) {
        lineSegments.push(...word.segments);
        lineWidth = word.width;
      } else {
        const gapHl = previous.lastHl && word.firstHl;
        const gap = { text: " ", hl: gapHl, width: measure(" ", gapHl) };
        if (lineWidth + gap.width + word.width <= boxWidth) {
          lineSegments.push(gap, ...word.segments);
          lineWidth += gap.width + word.width;
        } else {
          commit();
          lineSegments.push(...word.segments);
          lineWidth = word.width;
        }
      }
      previous = word;
    }
    commit();
  }

  const descent = fontSize * 0.22;
  const blockHeight = lines.length ? capHeight + (lines.length - 1) * lineHeightPx + descent : 0;
  const top = vertical === "top"
    ? margin
    : vertical === "bottom"
      ? height - margin - blockHeight
      : (height - blockHeight) / 2;
  const firstBaseline = top + capHeight;

  const boxLeft = horizontal === "left"
    ? margin
    : horizontal === "right"
      ? width - margin - boxWidth
      : margin + (available - boxWidth) / 2;

  lines.forEach((line, index) => {
    line.baseline = firstBaseline + index * lineHeightPx;
    line.x = horizontal === "left"
      ? boxLeft
      : horizontal === "right"
        ? boxLeft + boxWidth - line.width
        : boxLeft + (boxWidth - line.width) / 2;
    let x = line.x;
    for (const run of line.runs) {
      run.x = x;
      x += run.width;
    }
  });

  return { options: opts, lines, boxLeft, boxWidth, blockHeight, top, lineHeightPx };
}

export async function ensureHeroFonts() {
  if (typeof document === "undefined" || !document.fonts?.load) return;
  const sample = "Accédez aux fonds Spiko Finance éèêàçù 0123456789";
  await Promise.all([
    document.fonts.load(heroFontString(false, 32), sample),
    document.fonts.load(heroFontString(true, 32), sample),
  ]);
}

export function loadHeroBackground(url = HERO_BG_URL) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    // Fonds hébergés sur Supabase : sans CORS le canvas serait « tainted » et l'export PNG échouerait.
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Fond du hero introuvable."));
    image.src = url;
  });
}

function drawBackgroundCover(ctx, image, width, height, insetAt996 = HERO_BG_INSET) {
  const inset = insetAt996 * (image.naturalWidth / HERO_WIDTH);
  const maxW = image.naturalWidth - inset * 2;
  const maxH = image.naturalHeight - inset * 2;
  const ratio = width / height;
  let sw = maxW;
  let sh = sw / ratio;
  if (sh > maxH) {
    sh = maxH;
    sw = sh * ratio;
  }
  const sx = (image.naturalWidth - sw) / 2;
  const sy = (image.naturalHeight - sh) / 2;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, sx, sy, sw, sh, 0, 0, width, height);
}

export function renderHero(ctx, { bgImage, bgInset = HERO_BG_INSET, options, width = HERO_WIDTH, height = HERO_HEIGHT }) {
  const opts = normalizeHeroOptions(options);
  ctx.clearRect(0, 0, width, height);
  if (bgImage) {
    drawBackgroundCover(ctx, bgImage, width, height, bgInset);
  } else {
    ctx.fillStyle = "#E4E5EA";
    ctx.fillRect(0, 0, width, height);
  }

  const measure = (text, highlighted) => {
    ctx.font = heroFontString(highlighted, opts.fontSize);
    return ctx.measureText(text).width;
  };
  ctx.font = heroFontString(false, opts.fontSize);
  const capHeight = ctx.measureText("H").actualBoundingBoxAscent || opts.fontSize * 0.7;
  const layout = layoutHero(opts, { measure, capHeight, width, height });

  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  for (const line of layout.lines) {
    for (const run of line.runs) {
      ctx.font = heroFontString(run.hl, opts.fontSize);
      if (run.hl) {
        const gradient = ctx.createLinearGradient(run.x, 0, run.x + run.width, 0);
        HERO_GRADIENTS[opts.gradient].stops.forEach(([offset, color]) => gradient.addColorStop(offset, color));
        ctx.fillStyle = gradient;
      } else {
        ctx.fillStyle = HERO_TEXT_COLORS[opts.textColor];
      }
      ctx.fillText(run.text, run.x, line.baseline);
    }
  }
  return layout;
}
