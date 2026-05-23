import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Readable } from "node:stream";
import test from "node:test";

import {
  MarkdownImportError,
  importNewsletterMarkdown,
} from "./markdownImport.js";
import { cleanGeneratedMarkdown } from "../../api/generate-markdown-import.js";
import { importFromBody, parseRequestBody } from "../../api/import-markdown.js";

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
  assert.equal(macroBars.type, "macro_bars");
  assert.equal(macroBars.data.bars[1].percent, "53");
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
