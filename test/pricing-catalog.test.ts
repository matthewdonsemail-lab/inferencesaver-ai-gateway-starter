import assert from "node:assert/strict";
import test from "node:test";
import { normalizePricingModels } from "../src/pricing-catalog.js";
import { mergeCatalogs } from "../src/model-catalog.js";

test("normalizes pricing catalog fields and drops unknown/secret fields", () => {
  assert.deepEqual(normalizePricingModels({ data: [
    {
      rawName: "veo-3.1",
      label: "Veo 3.1",
      provider: "google",
      tier: "Standard",
      capability: "video",
      supportedEndpoints: ["video_generation"],
      contextWindow: 200000,
      maxOutputTokens: 16384,
      inputPricePerMillionUsd: "1.2",
      outputPricePerMillionUsd: 1.2,
      savingsPercent: 70,
      enableGroups: ["default"],
      pricingVersion: "abc",
      api_key: "should-not-leak"
    }
  ] }), [
    {
      id: "veo-3.1",
      label: "Veo 3.1",
      provider: "google",
      tier: "Standard",
      capability: "video",
      supportedEndpoints: ["video_generation"],
      contextWindow: 200000,
      maxOutputTokens: 16384,
      inputPricePerMillionUsd: 1.2,
      outputPricePerMillionUsd: 1.2,
      savingsPercent: 70,
      enableGroups: ["default"],
      pricingVersion: "abc"
    }
  ]);
});

test("mergeCatalogs unions auth + pricing and flags availability", () => {
  const merged = mergeCatalogs(
    [
      { id: "agnes-2.0-flash", supported_endpoint_types: ["openai"] },
      { id: "gpt-5.4", supported_endpoint_types: ["openai"] }
    ],
    [
      { id: "gpt-5.4", label: "Gpt 5.4", inputPricePerMillionUsd: 2.5 },
      { id: "veo-3.1", label: "Veo 3.1", inputPricePerMillionUsd: 1.2 }
    ]
  );
  assert.deepEqual(merged, [
    { id: "agnes-2.0-flash", supported_endpoint_types: ["openai"], available_to_key: true },
    { id: "gpt-5.4", supported_endpoint_types: ["openai"], label: "Gpt 5.4", inputPricePerMillionUsd: 2.5, available_to_key: true },
    { id: "veo-3.1", label: "Veo 3.1", inputPricePerMillionUsd: 1.2, available_to_key: false }
  ]);
});

test("mergeCatalogs sorts by id", () => {
  const merged = mergeCatalogs([{ id: "z" }], [{ id: "a", label: "A" }]);
  assert.deepEqual(merged.map((m) => m.id), ["a", "z"]);
});
