import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_HERO_OPTIONS,
  HERO_HEIGHT,
  HERO_WIDTH,
  layoutHero,
  normalizeHeroOptions,
  parseHeroMarkup,
  stripHeroMarkup,
} from "./heroRenderer.js";

// 10 px par caractère, 11 px quand le texte est surligné (graisse plus forte)
const measure = (text, highlighted) => text.length * (highlighted ? 11 : 10);
const env = { measure, capHeight: 40 };
const layout = (options) => layoutHero({ margin: 0, maxWidth: 20, ...options }, env);

test("parseHeroMarkup splits highlighted pieces and carries the highlight across lines", () => {
  assert.deepEqual(parseHeroMarkup("Accédez [[Spiko Finance]] ici"), [[
    { text: "Accédez ", hl: false },
    { text: "Spiko Finance", hl: true },
    { text: " ici", hl: false },
  ]]);

  assert.deepEqual(parseHeroMarkup("[[ligne un\nligne deux]] fin"), [
    [{ text: "ligne un", hl: true }],
    [{ text: "ligne deux", hl: true }, { text: " fin", hl: false }],
  ]);

  assert.equal(stripHeroMarkup("a [[b]] c"), "a b c");
});

test("layoutHero wraps words greedily within the box width", () => {
  const { lines } = layout({ text: "aaaaaaaa bbbbbbbb cccccccc dddddddd" });
  assert.deepEqual(lines.map((line) => line.runs.map((run) => run.text).join("")), [
    "aaaaaaaa bbbbbbbb",
    "cccccccc dddddddd",
  ]);
  assert.equal(lines[0].width, 170);
});

test("layoutHero keeps explicit line breaks, including blank lines", () => {
  const { lines } = layout({ text: "a\n\nb", maxWidth: 100 });
  assert.equal(lines.length, 3);
  assert.deepEqual(lines[1].runs, []);
});

test("highlighted words merge into one gradient run, spaces between them included", () => {
  const { lines } = layout({ text: "x [[aa bb]] y", maxWidth: 100 });
  assert.deepEqual(lines[0].runs.map((run) => [run.text, run.hl]), [
    ["x ", false],
    ["aa bb", true],
    [" y", false],
  ]);
  // "aa bb" = 5 caractères surlignés à 11 px
  assert.equal(lines[0].runs[1].width, 55);
  assert.equal(lines[0].runs[1].x, 20);
});

test("a highlight spanning several lines restarts one run per line", () => {
  const { lines } = layout({ text: "[[aaaaaaaa bbbbbbbb cccccccc]]" });
  assert.ok(lines.length >= 2);
  lines.forEach((line) => {
    assert.equal(line.runs.length, 1);
    assert.equal(line.runs[0].hl, true);
  });
});

test("layoutHero places the block according to the 3x3 position", () => {
  const base = { text: "aaaa\nbbbb", margin: 60, maxWidth: 50, fontSize: 50, lineHeight: 1.2 };
  const lineHeightPx = 60;
  const descent = 50 * 0.22;

  const topLeft = layoutHero({ ...base, position: "top-left" }, env);
  assert.equal(topLeft.lines[0].x, 60);
  assert.equal(topLeft.lines[0].baseline, 60 + 40);

  const bottomRight = layoutHero({ ...base, position: "bottom-right" }, env);
  const last = bottomRight.lines[1];
  assert.equal(last.x + last.width, HERO_WIDTH - 60);
  assert.ok(Math.abs(last.baseline - (HERO_HEIGHT - 60 - descent)) < 1e-6);
  assert.equal(last.baseline - bottomRight.lines[0].baseline, lineHeightPx);

  const middleCenter = layoutHero({ ...base, position: "middle-center" }, env);
  middleCenter.lines.forEach((line) => {
    assert.ok(Math.abs(line.x + line.width / 2 - HERO_WIDTH / 2) < 1e-6);
  });
  const blockCenter = middleCenter.top + middleCenter.blockHeight / 2;
  assert.ok(Math.abs(blockCenter - HERO_HEIGHT / 2) < 1e-6);
});

test("text alignment follows the horizontal position", () => {
  const options = { text: "aaaaaaaa\nbb", margin: 0, maxWidth: 100 };
  const left = layoutHero({ ...options, position: "middle-left" }, env);
  const center = layoutHero({ ...options, position: "middle-center" }, env);
  const right = layoutHero({ ...options, position: "middle-right" }, env);

  assert.equal(left.lines[1].x, 0);
  assert.equal(center.lines[1].x, (HERO_WIDTH - 20) / 2);
  assert.equal(right.lines[1].x, HERO_WIDTH - 20);
});

test("normalizeHeroOptions clamps values and falls back on unknown input", () => {
  const normalized = normalizeHeroOptions({ fontSize: 2, lineHeight: 9, maxWidth: 0, margin: -5, position: "nowhere", textColor: "pink" });
  assert.equal(normalized.fontSize, 16);
  assert.equal(normalized.lineHeight, 2);
  assert.equal(normalized.maxWidth, 20);
  assert.equal(normalized.margin, 0);
  assert.equal(normalized.position, DEFAULT_HERO_OPTIONS.position);
  assert.equal(normalized.textColor, "dark");
});
