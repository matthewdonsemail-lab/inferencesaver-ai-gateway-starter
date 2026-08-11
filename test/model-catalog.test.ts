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

test("captures supported_endpoint_types as capability signal", () => {
  assert.deepEqual(normalizeModels({ data: [
    { id: "veo-3.1", supported_endpoint_types: ["openai-video"] },
    { id: "gpt-5.4", supported_endpoint_types: ["openai"] },
    { id: "no-endpoint-types", owned_by: "lab" }
  ] }), [
    { id: "gpt-5.4", supported_endpoint_types: ["openai"] },
    { id: "no-endpoint-types", owned_by: "lab" },
    { id: "veo-3.1", supported_endpoint_types: ["openai-video"] }
  ]);
});

test("drops non-string entries and empty supported_endpoint_types arrays", () => {
  assert.deepEqual(normalizeModels({ data: [
    { id: "a", supported_endpoint_types: [] },
    { id: "b", supported_endpoint_types: [1, null, "openai"] },
    { id: "c", supported_endpoint_types: "openai" }
  ] }), [
    { id: "a" },
    { id: "b", supported_endpoint_types: ["openai"] },
    { id: "c" }
  ]);
});
