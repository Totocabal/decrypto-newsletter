import assert from "node:assert/strict";
import test from "node:test";

import {
  MarkdownImportError,
  importNewsletterMarkdown,
} from "./markdownImport.js";

test("imports simple Markdown into newsletter sections", () => {
  const imported = importNewsletterMarkdown(`---
title: "Weekly import"
preview_text: "The week in crypto."
theme_variant: light
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
