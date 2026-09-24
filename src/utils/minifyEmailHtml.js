// Minification sûre du HTML email exporté (Gmail tronque au-delà de ~102 Ko).
// Ne touche ni au texte visible, ni aux balises Liquid/HubL, ni aux commentaires conditionnels MSO.

const BLOCK_TAGS =
  "table|tbody|thead|tfoot|tr|td|th|div|p|h[1-6]|ul|ol|li|center|meta|link|title|head|body|html|style|noscript|xml|v:[a-z]+|o:[a-z]+";

const SHORT_HEX = /#([0-9a-f])\1([0-9a-f])\2([0-9a-f])\3(?![0-9a-f])/gi;

function shortenHex(css) {
  return css.replace(SHORT_HEX, (_, a, b, c) => `#${a}${b}${c}`.toLowerCase());
}

function minifyCss(css) {
  return shortenHex(
    css
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\s+/g, " ")
      .replace(/\s*([{};,>])\s*/g, "$1")
      .replace(/:\s+/g, ":")
      .replace(/\s*!important/g, "!important")
      .replace(/;}/g, "}")
      .trim()
  );
}

function minifyInlineStyle(style) {
  if (style.includes("{")) return style;
  return shortenHex(
    style
      .replace(/\s+/g, " ")
      .replace(/\s*;\s*/g, ";")
      .replace(/,\s+/g, ",")
      .replace(/'([A-Za-z][\w-]*)'/g, "$1")
      .replace(/\s*:\s*/g, ":")
      .replace(/\s*!important/g, "!important")
      .replace(/;$/, "")
      .trim()
  );
}

function usedClasses(html) {
  const used = new Set();
  for (const m of html.matchAll(/\bclass="([^"]*)"/g)) {
    m[1].split(/\s+/).forEach((c) => c && used.add(c));
  }
  return used;
}

function pruneUnusedRules(css, used) {
  // Supprime les règles dont tous les sélecteurs de classe sont absents du HTML.
  const pruneBlock = (block) =>
    block.replace(/([^{}]+)\{([^{}]*)\}/g, (rule, selectors) => {
      const list = selectors.split(",").map((s) => s.trim());
      const kept = list.filter((sel) => {
        const classes = [...sel.matchAll(/\.([\w-]+)/g)].map((m) => m[1]);
        return classes.length === 0 || classes.every((c) => used.has(c));
      });
      if (!kept.length) return "";
      return rule.replace(selectors, kept.join(","));
    });
  const medias = [];
  const withoutMedia = css.replace(/(@media[^{]+)\{((?:[^{}]*\{[^{}]*\})*)\}/g, (all, head, inner) => {
    const pruned = pruneBlock(inner);
    medias.push(pruned ? `${head}{${pruned}}` : "");
    return `zz${medias.length - 1}zz{}`;
  });
  return pruneBlock(withoutMedia).replace(/zz(\d+)zz\{\}/g, (_, i) => medias[i]);
}

function pruneFontFaces(css, body) {
  const weights = new Set(["400", "700"]);
  for (const m of body.matchAll(/font-weight:\s*(\d+)/g)) weights.add(m[1]);
  return css.replace(/@font-face\{[^}]*\}/g, (face) => {
    const family = face.match(/font-family:'?([^';}]+)'?/)?.[1];
    const weight = face.match(/font-weight:(\d+)/)?.[1];
    const familyUsed = family && new RegExp(`font-family:[^;"}]*\\b${family}\\b`).test(body);
    return familyUsed && weights.has(weight) ? face : "";
  });
}

export function minifyEmailHtml(html = "") {
  let out = String(html);
  const used = usedClasses(out);
  const bodyOnly = out.replace(/<style>[\s\S]*?<\/style>/g, "");

  // <style> : minification + suppression des règles inutilisées
  out = out.replace(/<style>([\s\S]*?)<\/style>/g, (_, css) => {
    const min = minifyCss(css);
    const pruned = minifyCss(pruneFontFaces(pruneUnusedRules(min, used), bodyOnly));
    return pruned ? `<style>${pruned}</style>` : "";
  });

  // Styles inline
  out = out.replace(/ style="([^"]*)"/g, (_, s) => ` style="${minifyInlineStyle(s)}"`);

  // Commentaires HTML (on garde les conditionnels MSO)
  out = out.replace(/<!--(?!>|\[if|\[endif|\s*<!\[endif)[\s\S]*?-->/g, "");

  // Espaces autour des balises de structure (sans toucher au texte inline)
  out = out
    .replace(new RegExp(`(<\\/?(?:${BLOCK_TAGS})\\b[^>]*>)\\s+`, "gi"), "$1")
    .replace(new RegExp(`\\s+(<\\/?(?:${BLOCK_TAGS})\\b)`, "gi"), "$1");

  // Espaces multiples restants (hors entités &nbsp; qui ne sont pas des espaces)
  out = out.replace(/[ \t]{2,}/g, " ").replace(/\n{2,}/g, "\n");

  // Auto-fermeture : " />" -> "/>"
  out = out.replace(/ \/>/g, "/>");

  return out.trim();
}
