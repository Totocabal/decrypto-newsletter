import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { importNewsletterMarkdown } from "../src/utils/markdownImport.js";

const GEMINI_MODEL = "gemini-3.1-flash-lite";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const MAX_BRIEF_CHARS = 60_000;
const MAX_DEBUG_OUTPUT_CHARS = 20_000;
const DIRECTIVE_TYPES = [
  "hero",
  "hero_chips",
  "index",
  "edito",
  "edito_kpis",
  "text_block",
  "image_block",
  "divider",
  "chart",
  "fear_greed",
  "signals",
  "macro",
  "macro_bars",
  "commented_number",
  "editorial_list",
  "focus",
  "focus_text",
  "focus_image",
  "focus_cta",
  "focus_callout",
  "focus_spacer",
  "feature_grid",
  "feature_grid_featured",
  "event",
];
const DIRECTIVE_LINE_FIX_RE = new RegExp(`^:::(${DIRECTIVE_TYPES.join("|")}):\\s*$`, "gim");
const BODY_DIRECTIVE_TYPES = new Set([
  "edito",
  "text_block",
  "macro",
  "fear_greed",
  "commented_number",
  "focus",
  "focus_text",
  "focus_callout",
  "signals",
  "editorial_list",
  "macro_bars",
  "feature_grid",
  "feature_grid_featured",
]);
const SCALAR_FIELD_RE = /^([a-zA-Z][a-zA-Z0-9_]*)\s*:\s*(.*)$/;

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

function logGenerationIssue(type, payload) {
  // Keep logs structured so Vercel/Supabase logs can be filtered by trace_id.
  // eslint-disable-next-line no-console
  console.error(`[generate-markdown-import] ${type}`, payload);
}

function getBearerToken(req) {
  const auth = req.headers.authorization || "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || "";
}

function getSupabaseServerClient(accessToken) {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Configuration Supabase serveur manquante");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined,
  });
}

async function requireApprovedUser(req) {
  const token = getBearerToken(req);
  if (!token) {
    const err = new Error("Authentification requise");
    err.status = 401;
    throw err;
  }
  const supabase = getSupabaseServerClient(token);
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    const err = new Error("Session invalide");
    err.status = 401;
    throw err;
  }
  const { data: profile } = await supabase.from("profiles").select("approved").eq("id", user.id).maybeSingle();
  if (!profile?.approved) {
    const err = new Error("Accès non autorisé");
    err.status = 403;
    throw err;
  }
}

function parseBody(req) {
  try {
    return typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  } catch {
    const err = new Error("Corps JSON invalide");
    err.status = 400;
    throw err;
  }
}

function repairBodyLinesInsideDirectives(markdown) {
  const lines = markdown.split(/\r?\n/);
  const repaired = [];

  for (let index = 0; index < lines.length; index += 1) {
    const open = lines[index].match(/^:::([a-z_][a-z0-9_]*)\s*$/i);
    if (!open || !BODY_DIRECTIVE_TYPES.has(open[1])) {
      repaired.push(lines[index]);
      continue;
    }

    const closeIndex = lines.findIndex((line, lineIndex) => lineIndex > index && line.trim() === ":::");
    if (closeIndex === -1) {
      repaired.push(lines[index]);
      continue;
    }

    const metadataLines = [];
    const bodyLines = [];
    let foundBody = false;
    lines.slice(index + 1, closeIndex).forEach((line) => {
      const trimmed = line.trim();
      const isMetadataLine = !trimmed || trimmed.startsWith("#") || SCALAR_FIELD_RE.test(line);
      if (!foundBody && isMetadataLine) {
        metadataLines.push(line);
        return;
      }
      foundBody = true;
      bodyLines.push(line);
    });

    if (!bodyLines.some((line) => line.trim())) {
      repaired.push(...lines.slice(index, closeIndex + 1));
      index = closeIndex;
      continue;
    }

    repaired.push(lines[index], ...metadataLines, ":::", "", ...bodyLines);
    index = closeIndex;
  }

  return repaired.join("\n");
}

function repairIncompletePipeItems(markdown) {
  const lines = markdown.split(/\r?\n/);
  const repaired = [];
  let directive = "";
  let bodyDirective = "";
  const isHexColor = (value = "") => /^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i.test(String(value).trim());

  lines.forEach((line) => {
    const open = line.match(/^:::([a-z_][a-z0-9_]*)\s*$/i);
    if (open) {
      directive = open[1];
      bodyDirective = "";
      repaired.push(line);
      return;
    }
    if (line.trim() === ":::" && directive) {
      bodyDirective = BODY_DIRECTIVE_TYPES.has(directive) ? directive : "";
      directive = "";
      repaired.push(line);
      return;
    }

    const activeDirective = directive || bodyDirective;
    if (activeDirective === "feature_grid" && /^\s*-\s+/.test(line)) {
      const [, , rawItem] = line.match(/^(\s*-\s+)(.*)$/);
      const parts = rawItem.split("|").map((part) => part.trim());
      if (parts.length === 1) {
        repaired.push(`- ${parts[0]} | ${parts[0]} | target | #03FFCF`);
        return;
      }
      if (parts.length === 2) {
        repaired.push(`- ${parts[0]} | ${parts[1]} | target | #03FFCF`);
        return;
      }
      if (parts.length === 3) {
        repaired.push(`- ${parts[0]} | ${parts[1]} | ${parts[2] || "target"} | #03FFCF`);
        return;
      }
    }
    if (activeDirective === "editorial_list" && /^\s*-\s+/.test(line)) {
      const [, , rawItem] = line.match(/^(\s*-\s+)(.*)$/);
      const parts = rawItem.split("|").map((part) => part.trim());
      if (parts.length === 3 && isHexColor(parts[2])) {
        repaired.push(`- ${parts[0]} | ${parts[1]} | ${parts[1]} | ${parts[2]}`);
        return;
      }
      if (parts.length === 4 && !parts[2] && isHexColor(parts[3])) {
        repaired.push(`- ${parts[0]} | ${parts[1]} | ${parts[1]} | ${parts[3]}`);
        return;
      }
      if (parts.length === 4 && isHexColor(parts[2]) && !parts[3]) {
        repaired.push(`- ${parts[0]} | ${parts[1]} | ${parts[1]} | ${parts[2]}`);
        return;
      }
    }

    repaired.push(line);
  });

  return repaired.join("\n");
}

function stripMarkdownDecorators(value = "") {
  return String(value || "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/^#{1,6}\s+/, "")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[`*~]/g, "")
    .replace(/\s*\((?:\d+\s*)?(?:caractères?|car\.?)\)\s*$/i, "")
    .trim();
}

function repairFrontMatterValues(markdown) {
  const lines = String(markdown || "").split(/\r?\n/);
  if (lines[0]?.trim() !== "---") return markdown;
  const end = lines.findIndex((line, index) => index > 0 && line.trim() === "---");
  if (end === -1) return markdown;

  for (let index = 1; index < end; index += 1) {
    const match = lines[index].match(/^(title|preview_text)\s*:\s*(.*)$/i);
    if (!match) continue;
    const value = stripMarkdownDecorators(match[2]);
    lines[index] = `${match[1]}: ${quoteFrontMatterValue(value)}`;
  }
  return lines.join("\n");
}

function repairFocusCtaLabels(markdown) {
  const lines = String(markdown || "").split(/\r?\n/);
  const repaired = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const isFocusCta = /^:::focus_cta\s*$/i.test(line.trim());
    if (!isFocusCta) {
      repaired.push(line);
      continue;
    }

    const closeIndex = lines.findIndex((candidate, lineIndex) =>
      lineIndex > index && candidate.trim() === ":::"
    );
    if (closeIndex === -1) {
      repaired.push(line);
      continue;
    }

    const blockLines = lines.slice(index + 1, closeIndex);
    const labelIndex = blockLines.findIndex((candidate) => /^label\s*:/i.test(candidate.trim()));
    const hasLabel = labelIndex > -1 && stripMarkdownDecorators(blockLines[labelIndex].split(":").slice(1).join(":"));
    repaired.push(line);
    if (!hasLabel) repaired.push('label: "Découvrir"');
    blockLines.forEach((candidate, blockIndex) => {
      if (blockIndex === labelIndex && !hasLabel) return;
      repaired.push(candidate);
    });
    repaired.push(lines[closeIndex]);
    index = closeIndex;
  }

  return repaired.join("\n");
}

function quoteFrontMatterValue(value) {
  return `"${String(value || "").replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

export function extractEmailSubject(text = "") {
  const lines = String(text || "").split(/\r?\n/);
  const subjectLine = lines.find((line) =>
    /^\s*(?:[-*]\s*)?(?:\*\*)?Objet\s*:/i.test(line.trim())
  );
  if (!subjectLine) return "";

  return subjectLine
    .replace(/^\s*(?:[-*]\s*)?(?:\*\*)?Objet\s*:\s*/i, "")
    .replace(/\*\*\s*$/g, "")
    .trim();
}

export function applyEmailSubjectTitle(markdown, sourceText) {
  const subject = stripMarkdownDecorators(extractEmailSubject(sourceText));
  if (!subject) return markdown;

  const lines = String(markdown || "").split(/\r?\n/);
  if (lines[0]?.trim() !== "---") return markdown;
  const end = lines.findIndex((line, index) => index > 0 && line.trim() === "---");
  if (end === -1) return markdown;

  const titleIndex = lines.findIndex((line, index) =>
    index > 0 && index < end && /^title\s*:/i.test(line)
  );
  const titleLine = `title: ${quoteFrontMatterValue(subject)}`;
  if (titleIndex > -1) {
    lines[titleIndex] = titleLine;
  } else {
    lines.splice(1, 0, titleLine);
  }
  return lines.join("\n");
}

export function cleanGeneratedMarkdown(text = "") {
  let markdown = String(text || "").trim();
  markdown = markdown.replace(/^```(?:md|markdown)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const start = markdown.indexOf("---");
  if (start > 0) markdown = markdown.slice(start).trim();
  const noteIndex = markdown.search(/\n(?:Notes?|Choix structurels?)\s*:/i);
  if (noteIndex > -1) markdown = markdown.slice(0, noteIndex).trim();
  markdown = markdown.replace(DIRECTIVE_LINE_FIX_RE, ":::$1");
  markdown = repairBodyLinesInsideDirectives(markdown);
  markdown = repairIncompletePipeItems(markdown);
  markdown = repairFocusCtaLabels(markdown);
  markdown = repairFrontMatterValues(markdown);
  return markdown;
}

function boolLabel(value) {
  return value ? "oui" : "non";
}

function buildPrompt({ brief, options }) {
  const themeLabel = options.theme_variant === "light" ? "blanc" : "noir";
  const sectionNumbers = options.show_section_numbers !== false;
  const blockSeparators = options.show_block_separators !== false;

  return `Tu es un assistant spécialisé dans la conversion de briefs email en fichiers Markdown importables dans l'éditeur newsletter Décrypto de Coinhouse.

Les 3 choix obligatoires ont déjà été fournis :
- Couleur de fond : ${themeLabel}
- Blocs numérotés : ${boolLabel(sectionNumbers)}
- Séparateurs entre blocs : ${boolLabel(blockSeparators)}

Produis uniquement le Markdown brut, sans bloc de code, sans introduction, sans commentaire et sans note après le Markdown. Le fichier doit passer la validation de l'import sans erreur bloquante.

Règles critiques :
- Le fichier commence par un front matter scalaire entre lignes ---.
- brand_name vaut toujours "COINHOUSE".
- theme_variant vaut "${options.theme_variant}".
- show_section_numbers vaut ${sectionNumbers ? "true" : "false"}.
- show_block_separators vaut ${blockSeparators ? "true" : "false"}.
- title = objet email, sans suffixe de comptage de caractères.
- Si le brief contient une ligne "Objet :", le champ front matter title doit reprendre exactement cet objet, sans le comptage entre parenthèses.
- preview_text est obligatoire.
- Toute URL doit être absolue http ou https. Si aucune URL n'est fournie, utiliser https://www.coinhouse.com/.
- N'utilise que ces directives : hero, hero_chips, index, edito, edito_kpis, text_block, image_block, divider, chart, fear_greed, signals, macro, macro_bars, commented_number, editorial_list, focus, focus_text, focus_image, focus_cta, focus_callout, focus_spacer, feature_grid, feature_grid_featured, event.
- Une ligne d'ouverture de directive doit contenir uniquement les trois deux-points et le type, par exemple :::hero. N'écris jamais :::hero:, :::text_block: ou :::focus_cta:.
- Les paramètres d'une directive sont toujours sur les lignes suivantes au format champ: "valeur", puis une ligne ::: ferme le bloc.
- Le contenu Markdown d'une directive body doit être placé après la ligne de fermeture :::, jamais entre l'ouverture et la fermeture.
- Exemple correct editorial_list :
:::editorial_list
kicker: "EN 3 ETAPES"
:::

- 01 | Alimentez votre compte | Par virement SEPA ou carte de paiement. | #03FFCF
- focus_cta, focus_callout, focus_image, focus_text et focus_spacer doivent toujours suivre une directive :::focus.
- focus_cta exige toujours label. Si le CTA source est entre crochets, ce texte devient label. Si aucun libellé n'est disponible, utilise label: "Découvrir".
- hero_chips doit suivre directement :::hero.
- edito_kpis doit suivre directement le corps de :::edito.
- feature_grid_featured doit suivre directement :::feature_grid.
- editorial_list utilise exactement : - tag | title | body obligatoire | tag_color optionnel. Les 3 colonnes tag, title et body ne doivent jamais être vides.
- Dans editorial_list, la couleur hexadecimale est uniquement la 4e colonne tag_color. Ne mets jamais #03FFCF, #FF8B28, #B36BFF ou #00FFFF dans la colonne body, sinon elle sera affichee comme texte.
- feature_grid utilise exactement : - title | body obligatoire | picto | color. Les 4 colonnes doivent être présentes. Picto par défaut si incertain : target. Couleurs par défaut : #03FFCF, #FF8B28, #B36BFF, #00FFFF.
- signals direction : up ou down uniquement.
- divider.style : thin, thick ou gradient uniquement.
- chart_currency : eur ou usd uniquement. chart_days : 7 ou 30 uniquement.
- fear_greed.value, macro_bars.percent : nombre entre 0 et 100.
- focus_spacer.height : nombre entre 0 et 120.
- Tons autorisés : positive, negative, warning, muted.

Mapping recommandé :
- Accroche intro + salutation : text_block.
- N'utilise hero que pour les mails éditoriaux ou newsletters de marché. Pour un email CRM transactionnel, onboarding, activation, upsell ou relance, commence par text_block.
- Listes à puces, étapes, bénéfices, arguments produit ou points pédagogiques : privilégier editorial_list dès qu'il y a 2 à 4 items.
- Comparaison d'offres, grille d'avantages ou fonctionnalités parallèles : utiliser feature_grid seulement si chaque carte a un titre et un corps explicatif.
- Utilise commented_number uniquement si le brief contient explicitement "Chiffre clé :" ou si un nombre est clairement le message central d'une section. Ne transforme pas automatiquement chaque prix, plafond, pourcentage ou durée en chiffre commenté.
- Si le brief contient "Chiffre clé :", crée obligatoirement un bloc commented_number avec value, unit, caption, title et un court commentaire.
- Pour editorial_list, convertir chaque puce en tag court, titre clair et corps explicatif obligatoire. Exemple : - 01 | Alimentez votre compte | Par virement SEPA ou carte de paiement. | #03FFCF
- Exemple interdit editorial_list : - 01 | Alimentez votre compte | #03FFCF. Il manque le body, la couleur serait affichee.
- Utiliser text_block avec liste Markdown seulement si les puces sont très courtes, non éditorialisables, ou s'il y a plus de 4 items.
- CTA principal : focus + focus_cta avec arrow: true.
- Disclaimer légal : text_block avec kicker "INFORMATION LÉGALE" et title "".
- Séparateur visuel : divider style gradient ou thin.
- Encadré à retenir : focus + focus_callout.

Conventions éditoriales :
- Vouvoiement strict.
- Conserve la variable Braze {{\${first_name} | default: ""}} telle quelle si elle apparaît dans le brief.
- Ne renseigne kicker et title que s'ils figurent explicitement dans le brief. Ne les invente pas.
- Quand un kicker est repris, mets-le en majuscules.
- Couleurs editorial_list par défaut : #03FFCF, #FF8B28, #B36BFF, #00FFFF.
- Ne reformule pas le contenu. Restructure uniquement.

Brief à convertir :
${brief}`;
}

function normalizeOptions(options = {}) {
  const themeVariant = options.theme_variant === "light" ? "light" : "dark";
  return {
    theme_variant: themeVariant,
    show_section_numbers: options.show_section_numbers !== false,
    show_block_separators: options.show_block_separators !== false,
  };
}

export default async function handler(req, res) {
  const traceId = randomUUID();
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return json(res, 204, {});
  if (req.method !== "POST") return json(res, 405, { error: "Méthode non autorisée" });

  try {
    await requireApprovedUser(req);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return json(res, 500, { error: "Clé Gemini non configurée (variable GEMINI_API_KEY manquante)." });

    const body = parseBody(req);
    const brief = String(body.brief || "").trim();
    if (!brief) return json(res, 400, { error: "Champ 'brief' vide ou manquant." });
    if (brief.length > MAX_BRIEF_CHARS) return json(res, 413, { error: `Brief trop long (${MAX_BRIEF_CHARS} caractères max).` });

    const options = normalizeOptions(body.options);
    const prompt = buildPrompt({ brief, options });
    const geminiRes = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 6000, temperature: 0.2 },
      }),
    });

    if (!geminiRes.ok) {
      const err = await geminiRes.text();
      logGenerationIssue("gemini_error", {
        trace_id: traceId,
        status: geminiRes.status,
        body_preview: err.slice(0, 1000),
      });
      return json(res, 502, {
        error: `Erreur Gemini (${geminiRes.status}) : ${err.slice(0, 200)}`,
        trace_id: traceId,
      });
    }

    const data = await geminiRes.json();
    const rawOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const markdown = applyEmailSubjectTitle(cleanGeneratedMarkdown(rawOutput), brief);
    if (!markdown) {
      logGenerationIssue("empty_markdown", {
        trace_id: traceId,
        model: GEMINI_MODEL,
        brief_length: brief.length,
        raw_output_preview: String(rawOutput).slice(0, 1000),
      });
      return json(res, 502, {
        error: "Gemini n'a pas retourné de Markdown.",
        trace_id: traceId,
        model: GEMINI_MODEL,
        raw_output: String(rawOutput).slice(0, MAX_DEBUG_OUTPUT_CHARS),
      });
    }

    try {
      importNewsletterMarkdown(markdown);
    } catch (error) {
      const validationError = error.message || String(error);
      logGenerationIssue("invalid_markdown", {
        trace_id: traceId,
        model: GEMINI_MODEL,
        options,
        brief_length: brief.length,
        validation_error: validationError,
        markdown_preview: markdown.slice(0, 4000),
        raw_output_preview: String(rawOutput).slice(0, 4000),
      });
      return json(res, 422, {
        error: `Markdown généré invalide : ${validationError}`,
        validation_error: validationError,
        markdown,
        raw_output: String(rawOutput).slice(0, MAX_DEBUG_OUTPUT_CHARS),
        trace_id: traceId,
        model: GEMINI_MODEL,
        options,
      });
    }

    return json(res, 200, { markdown });
  } catch (err) {
    return json(res, err.status || 500, { error: err.message || "Erreur interne" });
  }
}
