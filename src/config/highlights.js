// Surlignages disponibles dans l'éditeur de texte riche.
// Stockés en HTML sous la forme <mark data-hl="clé">…</mark> puis convertis
// en <span> inline compatible email par sanitizeRichText.
export const HIGHLIGHTS = {
  yellow: { label: "Jaune", bg: "#FFE45C", fg: "#111318" },
  cyan: { label: "Cyan", bg: "#03FFCF", fg: "#111318" },
  magenta: { label: "Magenta", bg: "#FF00AA", fg: "#FFFFFF" },
  violet: { label: "Violet", bg: "#8701FF", fg: "#FFFFFF" },
};

export const DEFAULT_HIGHLIGHT = "yellow";

export function highlightStyle(key) {
  const { bg, fg } = HIGHLIGHTS[key] || HIGHLIGHTS[DEFAULT_HIGHLIGHT];
  return `background-color:${bg}; color:${fg}; padding:1px 4px; border-radius:4px; -webkit-box-decoration-break:clone; box-decoration-break:clone;`;
}
