import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Readable } from "node:stream";
import test from "node:test";

import {
  MarkdownImportError,
  importNewsletterMarkdown,
} from "./markdownImport.js";
import {
  applyEmailSubjectTitle,
  cleanGeneratedMarkdown,
  extractEmailSubject,
} from "../../api/generate-markdown-import.js";
import { importFromBody, parseRequestBody } from "../../api/import-markdown.js";
import { buildEmailHtml } from "../render/buildEmail.js";

test("imports the complete Markdown example", () => {
  const example = readFileSync(
    new URL("../../examples/newsletter-markdown-import-complet.md", import.meta.url),
    "utf8"
  );
  const imported = importNewsletterMarkdown(example);

  assert.equal(imported.title, "Exemple complet import Markdown - Decrypto");
  assert.deepEqual(
    imported.state.sections.map((section) => section.type),
    [
      "hero",
      "index",
      "text_block",
      "image_block",
      "chart",
      "edito",
      "fear_greed",
      "signals",
      "divider",
      "focus",
      "text_block",
      "macro",
      "macro_bars",
      "editorial_list",
      "chart",
      "feature_grid",
      "commented_number",
      "event",
    ]
  );
  assert.deepEqual(imported.warnings, [
    "Directive :::chart: rafraîchis les données CoinGecko du graphique bitcoin.",
  ]);
});

test("applies API Markdown import options before creation", () => {
  const imported = importFromBody({
    markdown: `---
title: "API import"
preview_text: "API."
theme_variant: dark
show_section_numbers: true
show_block_separators: false
---

# API edition
`,
    options: {
      theme_variant: "light",
      show_section_numbers: false,
      show_block_separators: true,
    },
  });

  assert.equal(imported.title, "API import");
  assert.equal(imported.state.theme_variant, "light");
  assert.equal(imported.state.show_section_numbers, false);
  assert.equal(imported.state.show_block_separators, true);
});

test("reads raw text/markdown API request bodies", async () => {
  const request = Readable.from([
    Buffer.from("---\ntitle: \"Raw API\"\npreview_text: \"Raw.\"\n---\n\n# Raw API\n"),
  ]);
  request.headers = { "content-type": "text/markdown" };

  const body = await parseRequestBody(request);

  assert.match(body.markdown, /title: "Raw API"/);
  assert.equal(importFromBody(body).title, "Raw API");
});

test("cleans Gemini directive openings with a trailing colon", () => {
  const markdown = cleanGeneratedMarkdown(`---
title: "Gemini import"
preview_text: "Preview."
---

:::hero:
title_part1: "Bienvenue"
title_part2: ""
title_highlight: "Coinhouse"
:::
`);
  const imported = importNewsletterMarkdown(markdown);

  assert.equal(imported.state.sections[0].type, "hero");
  assert.equal(imported.state.sections[0].data.title_part1, "Bienvenue");
});

test("moves Gemini body lines out of directive metadata", () => {
  const markdown = cleanGeneratedMarkdown(`---
title: "Gemini import"
preview_text: "Preview."
---

:::editorial_list
kicker: "EN 3 ETAPES"
- 01 | Alimentez votre compte | Par virement SEPA ou carte de paiement. | #03FFCF
- 02 | Choisissez votre crypto-actif | Bitcoin, Ethereum et plus de 100 autres actifs. | #FF8B28
:::
`);
  const imported = importNewsletterMarkdown(markdown);

  assert.equal(imported.state.sections[0].type, "editorial_list");
  assert.equal(imported.state.sections[0].data.items.length, 2);
  assert.equal(imported.state.sections[0].data.items[0].title, "Alimentez votre compte");
});

test("repairs misplaced editorial list colors from Gemini output", () => {
  const markdown = cleanGeneratedMarkdown(`---
title: "Gemini colors"
preview_text: "Preview."
---

:::editorial_list
kicker: "POINTS CLES"
:::

- REACTIVITE TOTALE | Vos fonds sont disponibles immediatement pour vos achats. | #03FFCF
- STRATEGIE DCA | Mettez en place vos achats recurrents en quelques clics. | | #FF8B28
- GESTION SIMPLIFIEE | Un compte a votre nom pour piloter vos investissements. | #B36BFF |
`);
  const imported = importNewsletterMarkdown(markdown);
  const items = imported.state.sections[0].data.items;

  assert.equal(items[0].body, "Vos fonds sont disponibles immediatement pour vos achats.");
  assert.equal(items[0].tag_color, "#03FFCF");
  assert.equal(items[1].body, "Mettez en place vos achats recurrents en quelques clics.");
  assert.equal(items[1].tag_color, "#FF8B28");
  assert.equal(items[2].body, "Un compte a votre nom pour piloter vos investissements.");
  assert.equal(items[2].tag_color, "#B36BFF");
});

test("uses the Gemini email subject as imported newsletter title", () => {
  const brief = `## Variante 1 — Framework AIDA

**Objet : [Bienvenue chez **Coinhouse**, {{first_name}} !](https://www.coinhouse.com/) (38 caractères)**
**Pré-header : Découvrez comment piloter vos crypto-actifs avec sérénité. (68 caractères)**
`;
  const markdown = applyEmailSubjectTitle(`---
title: "Variante 1"
preview_text: "Preview."
---

# Bienvenue
`, brief);
  const imported = importNewsletterMarkdown(markdown);

  assert.equal(extractEmailSubject(brief), "[Bienvenue chez **Coinhouse**, {{first_name}} !](https://www.coinhouse.com/) (38 caractères)");
  assert.equal(imported.title, "Bienvenue chez Coinhouse, {{first_name}} !");
});

test("repairs incomplete Gemini feature grid items", () => {
  const markdown = cleanGeneratedMarkdown(`---
title: "Feature grid import"
preview_text: "Preview."
---

:::feature_grid
kicker: "OFFRES"
:::

- Classique
- Investisseur | Optimisez vos frais chaque mois.
- Gestion Privée | Accompagnement patrimonial | user
`);
  const imported = importNewsletterMarkdown(markdown);
  const [featureGrid] = imported.state.sections;

  assert.equal(featureGrid.type, "feature_grid");
  assert.equal(featureGrid.data.items.length, 3);
  assert.equal(featureGrid.data.items[0].title, "Classique");
  assert.equal(featureGrid.data.items[0].body, "Classique");
  assert.equal(featureGrid.data.items[1].picto, "target");
  assert.equal(featureGrid.data.items[2].color, "#03FFCF");
});

test("repairs Gemini focus CTA without label and cleans front matter markdown", () => {
  const markdown = cleanGeneratedMarkdown(`---
brand_name: "COINHOUSE"
title: "** Optimisez vos frais de transaction"
preview_text: "**Découvrez [l'offre Investisseur](https://www.coinhouse.com/).**"
---

:::focus
title: "Passez à l'action"
:::

:::focus_cta
url: "https://www.coinhouse.com/"
arrow: true
:::
`);
  const imported = importNewsletterMarkdown(markdown);
  const [focus] = imported.state.sections;

  assert.equal(imported.title, "Optimisez vos frais de transaction");
  assert.equal(imported.state.preview_text, "Découvrez l'offre Investisseur.");
  assert.equal(focus.data.items[0].type, "cta");
  assert.equal(focus.data.items[0].label, "Découvrir");
});

test("closes trailing Gemini metadata directives", () => {
  const markdown = cleanGeneratedMarkdown(`---
title: "CTA import"
preview_text: "Preview."
---

:::focus
:::

:::focus_cta
label: "Découvrir notre engagement"
url: "https://www.coinhouse.com/"
arrow: true
`);
  const imported = importNewsletterMarkdown(markdown);
  const [focus] = imported.state.sections;

  assert.equal(focus.type, "focus");
  assert.equal(focus.data.items[0].type, "cta");
  assert.equal(focus.data.items[0].label, "Découvrir notre engagement");
});

test("wraps orphan Gemini focus CTA directives", () => {
  const markdown = cleanGeneratedMarkdown(`---
title: "CTA import"
preview_text: "Preview."
---

:::editorial_list
:::

- IBAN | Compte à votre nom | Un IBAN français gratuit et sécurisé. | #03FFCF
- Économies | Frais réduits | Moins de frais que sur vos achats par carte de paiement. | #FF8B28
- Automation | Achats récurrents | Programmez vos investissements sans y penser. | #B36BFF

:::focus_cta
label: "Activer mon compte euro"
url: "https://www.coinhouse.com/"
arrow: true
:::
`);
  const imported = importNewsletterMarkdown(markdown);

  assert.deepEqual(
    imported.state.sections.map((section) => section.type),
    ["editorial_list", "focus"]
  );
  assert.equal(imported.state.sections[1].data.items[0].type, "cta");
  assert.equal(imported.state.sections[1].data.items[0].label, "Activer mon compte euro");
});

test("tool normalizes text CTA text into a single focus when trailing text has no title", () => {
  const markdown = `---
title: "Text CTA text"
preview_text: "Preview."
---

:::text_block
:::

Votre compte euro est disponible dès maintenant.

:::focus_cta
label: "Activer mon compte"
url: "https://www.coinhouse.com/"
arrow: true
:::

:::text_block
:::

Notre équipe reste disponible pour vous accompagner.
`;
  const imported = importNewsletterMarkdown(markdown);
  const [focus] = imported.state.sections;

  assert.equal(focus.type, "focus");
  assert.deepEqual(
    focus.data.items.map((item) => item.type),
    ["text", "cta", "text"]
  );
  assert.match(focus.data.items[0].body, /compte euro/);
  assert.equal(focus.data.items[1].label, "Activer mon compte");
  assert.match(focus.data.items[2].body, /équipe/);
});

test("tool keeps titled trailing text separate after a CTA", () => {
  const markdown = `---
title: "Text CTA titled text"
preview_text: "Preview."
---

:::text_block
:::

Votre compte euro est disponible dès maintenant.

:::focus_cta
label: "Activer mon compte"
url: "https://www.coinhouse.com/"
arrow: true
:::

:::text_block
title: "Besoin d'aide ?"
:::

Notre équipe reste disponible pour vous accompagner.
`;
  const imported = importNewsletterMarkdown(markdown);

  assert.deepEqual(
    imported.state.sections.map((section) => section.type),
    ["focus", "text_block"]
  );
  assert.deepEqual(
    imported.state.sections[0].data.items.map((item) => item.type),
    ["text", "cta"]
  );
  assert.equal(imported.state.sections[1].data.title, "Besoin d'aide ?");
});

test("flattens Gemini nested focus items inside a focus block", () => {
  const raw = `---
title: "Nested focus"
preview_text: "Preview."
---

:::focus
:::focus_callout
tone: "positive"
title: "Ce qu'il faut retenir"
:::
Un IBAN français. Frais réduits.

:::focus_cta
label: "Activer"
url: "https://www.coinhouse.com/"
arrow: true
:::
:::
`;
  const markdown = cleanGeneratedMarkdown(raw);
  const imported = importNewsletterMarkdown(markdown);
  const sections = imported.state.sections.filter((s) => s.type === "focus");

  const callout = sections.flatMap((s) => s.data.items).find((i) => i.type === "callout");
  const cta = sections.flatMap((s) => s.data.items).find((i) => i.type === "cta");

  assert.ok(callout, "callout item should exist");
  assert.ok(cta, "cta item should exist");
  assert.match(callout.body, /IBAN/);
  assert.equal(cta.label, "Activer");
});

test("flattens Gemini nested focus items without outer focus close", () => {
  const raw = `---
title: "Nested focus without outer close"
preview_text: "Preview."
---

:::focus
:::focus_text
:::
Votre compte euro est disponible.

:::focus_cta
label: "Activer"
url: "https://www.coinhouse.com/"
arrow: true
:::

:::focus_text
:::
Notre équipe reste disponible pour vous accompagner.
`;
  const markdown = cleanGeneratedMarkdown(raw);
  const imported = importNewsletterMarkdown(markdown);
  const [focus] = imported.state.sections;

  assert.equal(focus.type, "focus");
  assert.deepEqual(
    focus.data.items.map((item) => item.type),
    ["text", "cta", "text"]
  );
  assert.match(focus.data.items[0].body, /compte euro/);
  assert.equal(focus.data.items[1].label, "Activer");
  assert.match(focus.data.items[2].body, /équipe/);
});

test("absorbs focus_text body into preceding focus_callout without body", () => {
  const raw = `---
title: "Callout body merge"
preview_text: "Preview."
---

:::focus
:::focus_callout
label: "Ce qu'il faut retenir"
:::
:::focus_text
- Un IBAN français à votre nom et gratuit
- Moins de frais
- Achats récurrents possibles
:::
:::focus_cta
label: "Activer"
url: "https://www.coinhouse.com/"
arrow: true
:::
:::
`;
  const markdown = cleanGeneratedMarkdown(raw);
  const imported = importNewsletterMarkdown(markdown);
  const sections = imported.state.sections.filter((s) => s.type === "focus");

  const callout = sections.flatMap((s) => s.data.items).find((i) => i.type === "callout");
  const cta = sections.flatMap((s) => s.data.items).find((i) => i.type === "cta");

  assert.ok(callout, "callout item should exist");
  assert.equal(callout.label, "Ce qu'il faut retenir");
  assert.match(callout.body, /IBAN/);
  assert.ok(cta, "cta item should exist");
  assert.equal(cta.label, "Activer");
});

test("moves focus callout markdown out of directive metadata", () => {
  const markdown = cleanGeneratedMarkdown(`---
title: "Callout import"
preview_text: "Preview."
---

:::focus_callout
label: "À retenir"
#03FFCF
Un IBAN français à votre nom, gratuit et sécurisé.
:::
`);
  const imported = importNewsletterMarkdown(markdown);
  const [focus] = imported.state.sections;

  assert.equal(focus.type, "focus");
  assert.equal(focus.data.items[0].type, "callout");
  assert.equal(focus.data.items[0].body, "#03FFCF\nUn IBAN français à votre nom, gratuit et sécurisé.");
});

test("imports simple Markdown into newsletter sections", () => {
  const imported = importNewsletterMarkdown(`---
title: "Weekly import"
preview_text: "The week in crypto."
theme_variant: light
show_section_numbers: false
show_block_separators: false
---

# The market pauses

## Signals

Bitcoin **holds** its range.

![BTC chart](https://example.com/btc.png)

---

Tail text.
`);

  assert.equal(imported.title, "Weekly import");
  assert.equal(imported.state.theme_variant, "light");
  assert.equal(imported.state.show_section_numbers, false);
  assert.equal(imported.state.show_block_separators, false);
  assert.deepEqual(
    imported.state.sections.map((section) => section.type),
    ["hero", "text_block", "image_block", "divider", "text_block"]
  );
  assert.equal(imported.state.sections[1].data.title, "Signals");
  assert.equal(imported.state.sections[1].data.body, "Bitcoin **holds** its range.");
  assert.equal(imported.state.sections[2].data.image_alt, "BTC chart");
});

test("imports directive metadata and Markdown body", () => {
  const imported = importNewsletterMarkdown(`---
title: "Directive import"
---

:::text_block
kicker: "ANALYSE"
title: "Flows"
cta_label: "Read"
cta_url: "https://example.com/read"
counts_for_numbering: false
:::

- ETF flows return
- Macro remains tight
`);

  const [section] = imported.state.sections;
  assert.equal(section.type, "text_block");
  assert.equal(section.counts_for_numbering, false);
  assert.equal(section.data.kicker, "ANALYSE");
  assert.equal(section.data.body, "- ETF flows return\n- Macro remains tight");
  assert.deepEqual(imported.warnings, ["Front matter: preview_text absent.", "Aucun hero importé."]);
});

test("rejects unsupported image URLs", () => {
  assert.throws(
    () => importNewsletterMarkdown(`---
title: "Bad image"
---

:::image_block
image_url: "file:///tmp/chart.png"
:::
`),
    (error) =>
      error instanceof MarkdownImportError &&
      error.message.startsWith("image_url doit")
  );
});

test("imports structured signals and editorial list directives", () => {
  const imported = importNewsletterMarkdown(`---
title: "Structured list import"
preview_text: "Lists."
---

:::signals
kicker: "ANALYSE"
title: "Signals"
:::

- up | ETF flows | Allocations return.
- down | Macro | Rates stay high.

:::editorial_list
kicker: "Three reasons"
:::

- ETF | Flows return | Support comes back. | #03FFCF
- Macro | Inflation matters | Data remains decisive.
`);

  const [signals, editorialList] = imported.state.sections;
  assert.deepEqual(
    signals.data.signals.map((signal) => signal.direction),
    ["up", "down"]
  );
  assert.equal(signals.data.signals[0].title, "ETF flows");
  assert.equal(editorialList.data.items[0].tag_color, "#03FFCF");
  assert.equal(editorialList.data.items[1].tag_color, "#FF00AA");
});

test("imports focus items and macro bars directives", () => {
  const imported = importNewsletterMarkdown(`---
title: "Focus import"
preview_text: "Focus and bars."
---

:::focus
kicker: "FOCUS"
title: "Inside the block"
:::

Opening text.

:::focus_image
image_url: "https://example.com/focus.png"
image_alt: "Focus visual"
:::

:::focus_cta
label: "Read more"
url: "https://example.com/read"
arrow: true
secondary_label: "Academy"
secondary_url: "https://example.com/academy"
:::

:::focus_callout
label: "To remember"
picto: "target"
callout_color: "#03FFCF"
:::

Stay disciplined.
:::

:::focus_spacer
height: 32
:::

:::macro_bars
:::

- Cuts priced | 1.5 | 38 | vs last month
- Inflation | 3.2 | 53 | target 2 percent
`);

  const [focus, macroBars] = imported.state.sections;
  assert.deepEqual(
    focus.data.items.map((item) => item.type),
    ["text", "image", "cta", "callout", "spacer"]
  );
  assert.equal(focus.data.items[2].secondary_label, "Academy");
  assert.equal(focus.data.items[3].body, "Stay disciplined.");
  assert.equal(macroBars.type, "macro_bars");
  assert.equal(macroBars.data.bars[1].percent, "53");
});

test("imports standalone CTA and spacer directives", () => {
  const imported = importNewsletterMarkdown(`---
title: "Standalone CTA"
preview_text: "CTA and spacer."
---

:::cta
label: "Activer mon compte"
url: "https://example.com/activate"
arrow: true
centered: true
secondary_label: "En savoir plus"
secondary_url: "https://example.com/help"
:::

:::spacer
height: 48
:::
`);

  const [cta, spacer] = imported.state.sections;
  assert.deepEqual(
    imported.state.sections.map((section) => section.type),
    ["cta", "spacer"]
  );
  assert.equal(cta.data.label, "Activer mon compte");
  assert.equal(cta.data.centered, true);
  assert.equal(cta.data.secondary_label, "En savoir plus");
  assert.equal(spacer.data.height, 48);
});

test("imports an auto chart directive with CoinGecko settings", () => {
  const imported = importNewsletterMarkdown(`---
title: "Chart import"
preview_text: "Chart."
---

:::chart
chart_crypto: solana
chart_currency: usd
chart_days: 30
:::
`);

  const [chart] = imported.state.sections;
  assert.equal(chart.type, "chart");
  assert.equal(chart.data.chart_mode, "auto");
  assert.equal(chart.data.chart_crypto, "solana");
  assert.equal(chart.data.chart_currency, "usd");
  assert.equal(chart.data.chart_days, 30);
  assert.ok(imported.warnings.some((warning) => warning.includes("CoinGecko")));
});

test("imports hero chips, edito KPI and generated index entries", () => {
  const imported = importNewsletterMarkdown(`---
title: "Rich block import"
preview_text: "Rich blocks."
---

:::hero
title_part1: "Market pulse"
:::

:::hero_chips
:::

- btc | BTC +2.1 %
- fear_greed | F&G 72 - Greed

:::index
label: "Au sommaire"
:::

:::edito
kicker: "EDITO"
title: "Flows return"
:::

Body text.

:::edito_kpis
:::

- BTC | 64 000 EUR | +2.1 % | positive
- ETH | 3 100 EUR | -0.4 % | negative

:::text_block
title: "Next section"
:::

Details.
`);

  const [hero, index, edito, textBlock] = imported.state.sections;
  assert.equal(hero.data.chips[0].type, "btc");
  assert.equal(index.type, "index");
  assert.deepEqual(
    index.data.items.map((item) => item.title),
    [edito.data.title, textBlock.data.title]
  );
  assert.equal(edito.data.kpis[1].tone, "negative");
});

test("imports manual chart points and labels", () => {
  const imported = importNewsletterMarkdown(`---
title: "Manual chart"
preview_text: "Manual."
---

:::chart
chart_mode: manual
label: "BTC scenario"
value: "Projection"
delta: "Stable"
delta_tone: muted
points: "10, 45, 30, 80"
x_labels: "Lun, Mar, Mer, Jeu"
:::
`);

  const [chart] = imported.state.sections;
  assert.equal(chart.data.chart_mode, "manual");
  assert.deepEqual(chart.data.points, [10, 45, 30, 80]);
  assert.deepEqual(chart.data.x_labels, ["Lun", "Mar", "Mer", "Jeu"]);
});

test("imports feature grid featured card and secondary cards", () => {
  const imported = importNewsletterMarkdown(`---
title: "Feature import"
preview_text: "Benefits."
---

:::feature_grid
kicker: "Benefits"
bg_image_url: "https://example.com/grid-bg.png"
:::

- Friction | Buy without card rejects. | euro | #00FFFF
- Recurring | Keep your plan running. | pin | #FF8B28

:::feature_grid_featured
label: "Main benefit"
title: "A calmer crypto workflow"
picto: "shield"
show_icon: true
color: "#03FFCF"
:::

Security and clarity stay together.
`);

  const [featureGrid] = imported.state.sections;
  assert.equal(featureGrid.type, "feature_grid");
  assert.equal(featureGrid.data.featured.title, "A calmer crypto workflow");
  assert.equal(featureGrid.data.featured.body, "Security and clarity stay together.");
  assert.equal(featureGrid.data.items[0].picto, "euro");
  assert.equal(featureGrid.data.items[1].color, "#FF8B28");
});

test("renders feature grid with exactly three secondary cards", () => {
  const imported = importNewsletterMarkdown(`---
title: "Three benefits"
preview_text: "Benefits."
---

:::feature_grid
kicker: "Benefits"
:::

- First | First body. | euro | #00FFFF
- Second | Second body. | pin | #FF8B28
- Third | Third body. | shield | #03FFCF
`);
  const html = buildEmailHtml(imported.state);

  assert.equal(imported.state.sections[0].data.items.length, 3);
  assert.match(html, /First body\./);
  assert.match(html, /Second body\./);
  assert.match(html, /Third body\./);
  assert.doesNotMatch(html, /macro-quote-bg\.png/);
  assert.doesNotMatch(html, /Benefice n/);
  assert.doesNotMatch(html, /undefined/);
  assert.doesNotMatch(html, /<td class="em-feature-cell"[^>]*>\s*<table[\s\S]*?<div style="margin-bottom:10px;">[\s\S]*?<p style="margin:0 0 4px;[^>]*"><\/p>/);
});
