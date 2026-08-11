import assert from "node:assert/strict";
import test from "node:test";
import { BASE_MODELS, modelToml, providerToml, UNIQUE_MODELS } from "../src/modelsdev-export.js";

test("every base_model target points at a known lab path shape", () => {
  for (const [gatewayId, base] of Object.entries(BASE_MODELS)) {
    assert.match(base, /^[a-z0-9-]+\/[a-z0-9._-]+$/, `${gatewayId} -> ${base}`);
    assert.ok(UNIQUE_MODELS[gatewayId] === undefined, `${gatewayId} must not be both base and unique`);
  }
});

test("base_model entries are override-only (no name/description/modalities)", () => {
  const { toml } = modelToml({
    id: "claude-opus-4-6",
    inputPricePerMillionUsd: 5,
    outputPricePerMillionUsd: 25,
    cacheReadPricePerMillionUsd: 0.5,
    contextWindow: 400000,
    maxOutputTokens: 64000,
  } as never);
  assert.match(toml, /^base_model = "anthropic\/claude-opus-4-6"\n/);
  assert.ok(!toml.includes("name ="), "override-only: no name field");
  assert.ok(!toml.includes("description"), "override-only: no description");
  assert.ok(toml.includes("[cost]\ninput = 5\noutput = 25\ncache_read = 0.5"));
  assert.ok(toml.includes("[limit]\ncontext = 400000\noutput = 64000"));
});

test("unique models get full definitions with required schema fields", () => {
  const { toml } = modelToml({
    id: "agnes-2.0-flash",
    label: "Agnes 2.0 Flash",
    capability: "chat",
    contextWindow: 200000,
    maxOutputTokens: 16384,
    inputPricePerMillionUsd: 0,
    outputPricePerMillionUsd: 0,
  } as never);
  for (const required of ["name =", "description =", "attachment =", "reasoning =", "tool_call =", "release_date =", "last_updated =", "open_weights =", "[limit]", "[modalities]"]) {
    assert.ok(toml.includes(required), `missing ${required} in:\n${toml}`);
  }
  assert.ok(toml.includes('input = ["text"]'));
  assert.ok(toml.includes('output = ["text"]'));
});

test("provider.toml carries required provider fields", () => {
  const t = providerToml();
  assert.match(t, /name = "InferenceSaver"/);
  assert.match(t, /npm = "@ai-sdk\/openai-compatible"/);
  assert.match(t, /api = "https:\/\/api\.inferencesaver\.com\/v1"/);
  assert.match(t, /env = \["INFERENCESAVER_API_KEY"\]/);
  assert.match(t, /doc = "https:\/\/inferencesaver\.com\/en\/models"/);
});
