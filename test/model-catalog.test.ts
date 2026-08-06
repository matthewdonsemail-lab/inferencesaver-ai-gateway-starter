import assert from "node:assert/strict";
import test from "node:test";
import { normalizeModels } from "../src/model-catalog.js";

test("normalizes and sorts the safe model subset", () => {
  assert.deepEqual(normalizeModels({ data: [
    { id: "z", object: "model", created: 2, owned_by: "lab", secret: "drop" },
    { id: "a", object: "model" }
  ] }), [
    { id: "a", object: "model" },
    { id: "z", object: "model", created: 2, owned_by: "lab" }
  ]);
});

test("rejects malformed payloads", () => {
  assert.throws(() => normalizeModels({ data: [{ object: "model" }] }), /missing id/);
});
