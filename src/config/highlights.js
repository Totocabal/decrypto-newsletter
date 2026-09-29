// Palette de l'éditeur de texte riche, partagée entre surlignage et couleur de texte.
// Surlignage : stocké en <mark data-hl="clé">, converti en <span> inline par sanitizeRichText.
// Couleur de texte : stockée en <span data-tc="clé">, convertie de la même façon.
// textDark/textLight adaptent la teinte au thème pour rester lisibles (le jaune et le
// cyan bruts sont illisibles sur fond blanc, donc plus foncés en thème clair).
export const HIGHLIGHTS = {
  yellow: { label: "Jaune", bg: "#FFE45C", fg: "#111318", textDark: "#FFE45C", textLight: "#B08900" },
  cyan: { label: "Cyan", bg: "#03FFCF", fg: "#111318", textDark: "#03FFCF", textLight: "#00967A" },
  magenta: { label: "Magenta", bg: "#FF00AA", fg: "#FFFFFF", textDark: "#FF6FCB", textLight: "#D6008F" },
  violet: { label: "Violet", bg: "#8701FF", fg: "#FFFFFF", textDark: "#B06BFF", textLight: "#8701FF" },
};

export const DEFAULT_HIGHLIGHT = "yellow";

export function highlightStyle(key) {
  const { bg, fg } = HIGHLIGHTS[key] || HIGHLIGHTS[DEFAULT_HIGHLIGHT];
  return `background-color:${bg}; color:${fg}; padding:1px 4px; border-radius:4px; -webkit-box-decoration-break:clone; box-decoration-break:clone;`;
}

export function textColorStyle(key, isLightTheme = false) {
  const entry = HIGHLIGHTS[key] || HIGHLIGHTS[DEFAULT_HIGHLIGHT];
  return `color:${isLightTheme ? entry.textLight : entry.textDark};`;
}
