// Import Markdown: front matter scalar fields + newsletter directives.

import { INITIAL_STATE, SECTION_TYPES } from "../config/schema.js";

const SECTION_FIELDS = {
  hero: ["kicker", "title_part1", "title_part2", "title_highlight", "subtitle"],
  edito: ["kicker", "title"],
  text_block: ["kicker", "title", "cta_label", "cta_url"],
  focus: ["kicker", "title"],
  focus_text: [],
  focus_image: ["image_url", "image_alt", "link_url"],
  focus_cta: [
    "label",
    "url",
    "arrow",
    "centered",
    "secondary_label",
    "secondary_url",
    "secondary_arrow",
  ],
  focus_callout: [
    "label",
    "footer",
    "footer_url",
    "show_icon",
    "picto",
    "callout_color",
  ],
  focus_spacer: ["height"],
  signals: ["kicker", "title"],
  editorial_list: ["kicker"],
  image_block: ["image_url", "image_alt", "link_url"],
  divider: ["style"],
  macro: ["kicker", "title", "quote", "quote_author", "bg_image_url"],
  macro_bars: [],
  fear_greed: ["kicker", "title", "value", "classification"],
  commented_number: ["kicker", "value", "unit", "caption", "title"],
  event: [
    "day",
    "month",
    "year",
    "kicker",
    "title",
    "description",
    "cta_label",
    "cta_url",
    "bg_image_url",
  ],
};

const BODY_FIELD_BY_TYPE = {
  edito: "body",
  text_block: "body",
  macro: "body",
  fear_greed: "commentary",
  commented_number: "body",
};

const FRONT_MATTER_FIELDS = new Set([
  "title",
  "brand_name",
  "issue_number",
  "issue_date",
  "preview_text",
  "theme_variant",
  "show_section_numbers",
  "show_block_separators",
]);

const IMAGE_MARKDOWN_RE = /^!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)\s*$/i;
const BODY_DIRECTIVE_TYPES = new Set([
  ...Object.keys(BODY_FIELD_BY_TYPE),
  "focus",
  "signals",
  "editorial_list",
  "macro_bars",
  "focus_text",
  "focus_callout",
]);
const FOCUS_ITEM_TYPES = new Set([
  "focus_text",
  "focus_image",
  "focus_cta",
  "focus_callout",
  "focus_spacer",
]);

let nextImportedSectionId = 0;

export class MarkdownImportError extends Error {
  constructor(message) {
    super(message);
    this.name = "MarkdownImportError";
  }
}

function importId(prefix = "md") {
  nextImportedSectionId += 1;
  return `${prefix}_${Date.now()}_${nextImportedSectionId}`;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function emptyValue(value) {
  if (Array.isArray(value)) return [];
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, emptyValue(child)])
    );
  }
  if (typeof value === "boolean") return false;
  if (typeof value === "number") return 0;
  return "";
}

function emptySectionData(type) {
  return emptyValue(SECTION_TYPES[type].factory());
}

function trimOuterBlankLines(text = "") {
  return String(text).replace(/^\s*\n+|\n+\s*$/g, "").trimEnd();
}

function splitLines(text) {
  return String(text || "").replace(/\r\n?/g, "\n").split("\n");
}

function parseScalar(rawValue) {
  const raw = String(rawValue || "").trim();
  if (!raw) return "";
  if (
    (raw.startsWith('"') && raw.endsWith('"')) ||
    (raw.startsWith("'") && raw.endsWith("'"))
  ) {
    return raw.slice(1, -1);
  }
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (/^-?\d+(?:\.\d+)?$/.test(raw)) return Number(raw);
  return raw;
}

function parseScalarMap(lines, context, warnings, allowedFields = null) {
  const values = {};

  lines.forEach((line, index) => {
    if (!line.trim() || line.trim().startsWith("#")) return;
    const match = line.match(/^([a-zA-Z][a-zA-Z0-9_]*)\s*:\s*(.*)$/);
    if (!match) {
      throw new MarkdownImportError(
        `${context}: ligne ${index + 1} invalide. Utilise "champ: valeur".`
      );
    }
    const [, key, value] = match;
    if (allowedFields && !allowedFields.has(key)) {
      warnings.push(`${context}: champ "${key}" ignoré.`);
      return;
    }
    values[key] = parseScalar(value);
  });

  return values;
}

function extractFrontMatter(markdown, warnings) {
  const lines = splitLines(markdown);
  if (lines[0]?.trim() !== "---") {
    throw new MarkdownImportError(
      'Front matter manquant. Le fichier doit commencer par "---" et définir "title".'
    );
  }

  const end = lines.findIndex((line, index) => index > 0 && line.trim() === "---");
  if (end === -1) {
    throw new MarkdownImportError('Front matter non fermé. Ajoute une ligne "---".');
  }

  return {
    meta: parseScalarMap(
      lines.slice(1, end),
      "Front matter",
      warnings,
      FRONT_MATTER_FIELDS
    ),
    content: lines.slice(end + 1).join("\n"),
  };
}

function assertHttpUrl(url, fieldName) {
  if (!url) return;
  try {
    const parsed = new URL(String(url));
    if (parsed.protocol === "http:" || parsed.protocol === "https:") return;
  } catch {
    // Error below keeps the message focused on the field.
  }
  throw new MarkdownImportError(`${fieldName} doit être une URL http(s) valide.`);
}

function parsePipeItems(markdownBody, directive, expectedParts) {
  const lines = splitLines(markdownBody).filter((line) => line.trim());
  if (!lines.length) {
    throw new MarkdownImportError(`:::${directive} exige au moins une entrée.`);
  }

  return lines.map((line, index) => {
    const bullet = line.match(/^\s*-\s+(.+)$/);
    if (!bullet) {
      throw new MarkdownImportError(
        `:::${directive}: entrée ${index + 1} invalide. Commence chaque ligne par "- ".`
      );
    }
    const parts = bullet[1].split("|").map((part) => part.trim());
    if (parts.length < expectedParts || parts.slice(0, expectedParts).some((part) => !part)) {
      throw new MarkdownImportError(
        `:::${directive}: entrée ${index + 1} incomplète.`
      );
    }
    return parts;
  });
}

function focusTextItem(body) {
  const text = trimOuterBlankLines(body);
  return text ? { id: importId("focus"), type: "text", body: text } : null;
}

function focusItemFromDirective(token, body) {
  const data = token.fields;
  const markdownBody = trimOuterBlankLines(body);

  if (token.type === "focus_text") {
    const item = focusTextItem(markdownBody);
    if (!item) throw new MarkdownImportError(":::focus_text exige un corps Markdown.");
    return item;
  }

  if (token.type === "focus_image") {
    if (!data.image_url) throw new MarkdownImportError(":::focus_image exige image_url.");
    assertHttpUrl(data.image_url, "image_url");
    if (data.link_url) assertHttpUrl(data.link_url, "link_url");
    return {
      id: importId("focus"),
      type: "image",
      image_url: data.image_url,
      image_path: "",
      image_alt: data.image_alt || "Visuel importé",
      link_url: data.link_url || "",
    };
  }

  if (token.type === "focus_cta") {
    if (!data.label) throw new MarkdownImportError(":::focus_cta exige label.");
    if (data.url) assertHttpUrl(data.url, "url");
    if (data.secondary_url) assertHttpUrl(data.secondary_url, "secondary_url");
    return {
      id: importId("focus"),
      type: "cta",
      label: data.label,
      url: data.url || "",
      arrow: data.arrow === true,
      centered: data.centered === true,
      secondary_label: data.secondary_label || "",
      secondary_url: data.secondary_url || "",
      secondary_arrow: data.secondary_arrow === true,
    };
  }

  if (token.type === "focus_callout") {
    if (!markdownBody) throw new MarkdownImportError(":::focus_callout exige un corps Markdown.");
    if (data.footer_url) assertHttpUrl(data.footer_url, "footer_url");
    return {
      id: importId("focus"),
      type: "callout",
      label: data.label || "Note de la rédac",
      body: markdownBody,
      footer: data.footer || "",
      footer_url: data.footer_url || "",
      show_icon: data.show_icon !== false,
      picto: data.picto || "info",
      callout_color: data.callout_color || "#00FFFF",
    };
  }

  if (token.type === "focus_spacer") {
    const height = Number(data.height);
    if (!Number.isFinite(height) || height < 0 || height > 120) {
      throw new MarkdownImportError(":::focus_spacer height doit être compris entre 0 et 120.");
    }
    return { id: importId("focus"), type: "spacer", height };
  }

  throw new MarkdownImportError(`Directive :::${token.type} inconnue dans un focus.`);
}

function createSection(type, data, extra = {}) {
  return {
    id: importId("section"),
    type,
    data: { ...emptySectionData(type), ...data },
    ...extra,
  };
}

function createTextBlock(title, body) {
  const text = trimOuterBlankLines(body);
  if (!title && !text) return null;
  return createSection("text_block", {
    kicker: "",
    title: title || "",
    body: text,
    cta_label: "",
    cta_url: "",
  });
}

function createHeroFromTitle(title) {
  return createSection("hero", {
    kicker: "",
    title_part1: title,
    title_part2: "",
    title_highlight: "",
    subtitle: "",
    chips: [],
  });
}

function flushSimpleText(lines, sections) {
  const trimmed = trimOuterBlankLines(lines.join("\n"));
  if (!trimmed) return;
  const last = sections.at(-1);
  if (last?.type === "text_block" && !last.data.body) {
    last.data.body = trimmed;
    return;
  }
  const block = createTextBlock("", trimmed);
  if (block) sections.push(block);
}

function sectionsFromSimpleMarkdown(markdown, sections = []) {
  const textBuffer = [];
  const lines = splitLines(markdown);
  let currentText = null;

  const flushCurrentText = () => {
    if (!currentText) {
      flushSimpleText(textBuffer.splice(0), sections);
      return;
    }
    currentText.data.body = trimOuterBlankLines(textBuffer.splice(0).join("\n"));
    sections.push(currentText);
    currentText = null;
  };

  lines.forEach((line) => {
    const h1 = line.match(/^#\s+(.+?)\s*$/);
    const h2 = line.match(/^##\s+(.+?)\s*$/);
    const image = line.match(IMAGE_MARKDOWN_RE);

    if (h1) {
      flushCurrentText();
      if (!sections.some((section) => section.type === "hero")) {
        sections.push(createHeroFromTitle(h1[1]));
      } else {
        currentText = createTextBlock(h1[1], "");
      }
      return;
    }

    if (h2) {
      flushCurrentText();
      currentText = createTextBlock(h2[1], "");
      return;
    }

    if (/^\s*---+\s*$/.test(line)) {
      flushCurrentText();
      sections.push(createSection("divider", { style: "thin" }));
      return;
    }

    if (image) {
      flushCurrentText();
      sections.push(createSection("image_block", {
        image_url: image[2],
        image_alt: image[1] || "Visuel importé",
        image_path: "",
        link_url: "",
      }));
      return;
    }

    textBuffer.push(line);
  });

  flushCurrentText();
  return sections;
}

function extractDirectives(content, warnings) {
  const tokens = [];
  const lines = splitLines(content);
  let textBuffer = [];

  const flushText = () => {
    const text = trimOuterBlankLines(textBuffer.join("\n"));
    if (text) tokens.push({ kind: "markdown", text });
    textBuffer = [];
  };

  for (let index = 0; index < lines.length; index += 1) {
    const open = lines[index].match(/^:::([a-z_][a-z0-9_]*)\s*$/i);
    if (!open) {
      textBuffer.push(lines[index]);
      continue;
    }

    flushText();
    const type = open[1];
    const close = lines.findIndex(
      (line, lineIndex) => lineIndex > index && line.trim() === ":::"
    );
    if (close === -1) {
      throw new MarkdownImportError(`Directive :::${type} non fermée.`);
    }
    tokens.push({
      kind: "directive",
      type,
      fields: parseScalarMap(
        lines.slice(index + 1, close),
        `Directive :::${type}`,
        warnings,
        new Set([...(SECTION_FIELDS[type] || []), "counts_for_numbering"])
      ),
    });
    index = close;
  }

  flushText();
  return tokens;
}

function normalizeExplicitSection(token, body, warnings) {
  const { type, fields } = token;
  if (!SECTION_FIELDS[type]) {
    throw new MarkdownImportError(`Directive :::${type} inconnue dans le format Markdown.`);
  }

  const { counts_for_numbering: countsForNumbering, ...data } = fields;
  const extra = typeof countsForNumbering === "boolean"
    ? { counts_for_numbering: countsForNumbering }
    : {};
  const markdownBody = trimOuterBlankLines(body);

  if (type === "image_block") {
    if (!data.image_url) throw new MarkdownImportError(":::image_block exige image_url.");
    assertHttpUrl(data.image_url, "image_url");
    if (data.link_url) assertHttpUrl(data.link_url, "link_url");
  }

  if (type === "divider") {
    data.style = data.style || "thin";
    if (!["thin", "thick", "gradient"].includes(data.style)) {
      throw new MarkdownImportError(":::divider style doit valoir thin, thick ou gradient.");
    }
  }

  if (type === "fear_greed" && (data.value < 0 || data.value > 100)) {
    throw new MarkdownImportError(":::fear_greed value doit être compris entre 0 et 100.");
  }

  if (type === "event") {
    if (data.cta_url) assertHttpUrl(data.cta_url, "cta_url");
    if (!data.title) warnings.push("Directive :::event: title vide.");
  }

  if (type === "text_block" && data.cta_url) assertHttpUrl(data.cta_url, "cta_url");
  if (type === "macro" && data.bg_image_url) assertHttpUrl(data.bg_image_url, "bg_image_url");

  if (type === "focus") {
    return createSection(type, {
      ...data,
      items: markdownBody
        ? [{ id: importId("focus"), type: "text", body: markdownBody }]
        : [],
    }, extra);
  }

  if (type === "signals") {
    const signals = parsePipeItems(markdownBody, type, 3).map(([direction, title, description]) => {
      if (!["up", "down"].includes(direction)) {
        throw new MarkdownImportError(':::signals direction doit valoir "up" ou "down".');
      }
      return { direction, title, description };
    });
    return createSection(type, { ...data, signals }, extra);
  }

  if (type === "editorial_list") {
    const items = parsePipeItems(markdownBody, type, 3).map(([tag, title, body, tagColor]) => ({
      id: importId("editorial"),
      tag,
      title,
      body,
      tag_color: tagColor || "#FF00AA",
    }));
    return createSection(type, { ...data, items }, extra);
  }

  if (type === "macro_bars") {
    const bars = parsePipeItems(markdownBody, type, 4).map(([label, value, percent, caption]) => {
      const width = Number(percent);
      if (!Number.isFinite(width) || width < 0 || width > 100) {
        throw new MarkdownImportError(":::macro_bars percent doit être compris entre 0 et 100.");
      }
      return { label, value, percent: String(percent), caption };
    });
    return createSection(type, { bars }, extra);
  }

  const bodyField = BODY_FIELD_BY_TYPE[type];
  if (bodyField) data[bodyField] = markdownBody;
  return createSection(type, data, extra);
}

function sectionsFromTokens(tokens, warnings) {
  const sections = [];

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.kind === "markdown") {
      sectionsFromSimpleMarkdown(token.text, sections);
      continue;
    }

    if (token.type === "focus") {
      const next = tokens[index + 1];
      const simpleBody = next?.kind === "markdown" ? next.text : "";
      const focusSection = normalizeExplicitSection(token, simpleBody, warnings);
      if (simpleBody) index += 1;

      while (tokens[index + 1]?.kind === "directive" && FOCUS_ITEM_TYPES.has(tokens[index + 1].type)) {
        const itemToken = tokens[index + 1];
        const bodyToken = BODY_DIRECTIVE_TYPES.has(itemToken.type) && tokens[index + 2]?.kind === "markdown"
          ? tokens[index + 2]
          : null;
        focusSection.data.items.push(focusItemFromDirective(itemToken, bodyToken?.text || ""));
        index += bodyToken ? 2 : 1;
      }

      sections.push(focusSection);
      continue;
    }

    if (FOCUS_ITEM_TYPES.has(token.type)) {
      throw new MarkdownImportError(`Directive :::${token.type} doit suivre une directive :::focus.`);
    }

    const next = tokens[index + 1];
    const body = BODY_DIRECTIVE_TYPES.has(token.type) && next?.kind === "markdown"
      ? next.text
      : "";
    sections.push(normalizeExplicitSection(token, body, warnings));
    if (body) index += 1;
  }

  return sections;
}

function validateGlobalMeta(meta, warnings) {
  if (!String(meta.title || "").trim()) {
    throw new MarkdownImportError('Front matter: "title" est obligatoire.');
  }
  if (meta.theme_variant && !["dark", "light"].includes(meta.theme_variant)) {
    throw new MarkdownImportError('Front matter: "theme_variant" doit valoir dark ou light.');
  }
  if (!meta.preview_text) warnings.push("Front matter: preview_text absent.");
}

export function importNewsletterMarkdown(markdown) {
  const warnings = [];
  const { meta, content } = extractFrontMatter(markdown, warnings);
  validateGlobalMeta(meta, warnings);

  const sections = sectionsFromTokens(extractDirectives(content, warnings), warnings);
  if (!sections.length) {
    throw new MarkdownImportError("Aucune section importable trouvée dans le Markdown.");
  }
  if (!sections.some((section) => section.type === "hero")) {
    warnings.push("Aucun hero importé.");
  }

  return {
    title: String(meta.title).trim(),
    warnings,
    state: {
      ...clone(INITIAL_STATE),
      brand_name: meta.brand_name || INITIAL_STATE.brand_name,
      issue_number: meta.issue_number === undefined ? "" : String(meta.issue_number),
      issue_date: meta.issue_date === undefined ? "" : String(meta.issue_date),
      preview_text: meta.preview_text === undefined ? "" : String(meta.preview_text),
      theme_variant: meta.theme_variant || "dark",
      show_section_numbers: meta.show_section_numbers !== false,
      show_block_separators: meta.show_block_separators !== false,
      sections,
    },
  };
}
