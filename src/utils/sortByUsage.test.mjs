import test from "node:test";
import assert from "node:assert/strict";
import { sortByUsage } from "../utils/sortByUsage.js";

const entries = [["a", {}], ["b", {}], ["c", {}], ["d", {}]];

test("sortByUsage orders by usage and keeps the original order on ties", () => {
  const usage = { c: { uses: 10 }, b: { uses: 3 }, d: { uses: 3 } };
  assert.deepEqual(sortByUsage(entries, usage).map(([type]) => type), ["c", "b", "d", "a"]);
});

test("sortByUsage keeps the original order without statistics", () => {
  assert.deepEqual(sortByUsage(entries).map(([type]) => type), ["a", "b", "c", "d"]);
  assert.deepEqual(sortByUsage(entries, {}).map(([type]) => type), ["a", "b", "c", "d"]);
});
