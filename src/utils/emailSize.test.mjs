import test from "node:test";
import assert from "node:assert/strict";
import { estimateExportSize, heaviestSections } from "./emailSize.js";
import { INITIAL_STATE } from "../config/schema.js";

test("default newsletter stays well under the Gmail clipping limit", () => {
  const size = estimateExportSize(INITIAL_STATE);
  assert.equal(size.level, "ok");
  assert.ok(size.bytes < size.limit);
});

test("oversized newsletter raises an alert and names the heaviest blocks", () => {
  const sections = Array.from({ length: 5 }, () => INITIAL_STATE.sections).flat();
  const state = { ...INITIAL_STATE, sections };
  const size = estimateExportSize(state);
  assert.notEqual(size.level, "ok");
  const heavy = heaviestSections(state, 2);
  assert.equal(heavy.length, 2);
  assert.ok(heavy[0].bytes >= heavy[1].bytes && heavy[0].bytes > 0);
});
