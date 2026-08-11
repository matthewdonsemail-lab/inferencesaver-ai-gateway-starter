import assert from "node:assert/strict";
import { rm, writeFile } from "node:fs/promises";
import test from "node:test";
import { requireConfiguredModel } from "../src/select-model.js";

const catalogPath = ".test-models.json";

test("returns an explicitly configured model present in the catalog", async (t) => {
  t.after(async () => {
    delete process.env.TEST_MODEL;
    await rm(catalogPath, { force: true });
  });
  await writeFile(catalogPath, JSON.stringify({ data: [{ id: "verified-model" }] }));
  process.env.TEST_MODEL = "verified-model";
  assert.equal(await requireConfiguredModel("TEST_MODEL", undefined, catalogPath), "verified-model");
});

test("rejects missing and unavailable model configuration", async (t) => {
  t.after(async () => {
    delete process.env.TEST_MODEL;
    await rm(catalogPath, { force: true });
  });
  await writeFile(catalogPath, JSON.stringify({ data: [{ id: "available-model" }] }));
  await assert.rejects(requireConfiguredModel("TEST_MODEL", undefined, catalogPath), /TEST_MODEL is required/);
  process.env.TEST_MODEL = "unverified-model";
  await assert.rejects(requireConfiguredModel("TEST_MODEL", undefined, catalogPath), /does not name a model/);
});

test("rejects a configured model that doesn't support the expected endpoint type", async (t) => {
  t.after(async () => {
    delete process.env.TEST_MODEL;
    await rm(catalogPath, { force: true });
  });
  await writeFile(catalogPath, JSON.stringify({
    data: [{ id: "video-only-model", supported_endpoint_types: ["openai-video"] }]
  }));
  process.env.TEST_MODEL = "video-only-model";
  await assert.rejects(
    requireConfiguredModel("TEST_MODEL", "anthropic", catalogPath),
    /does not list "anthropic"/
  );
  assert.equal(await requireConfiguredModel("TEST_MODEL", "openai-video", catalogPath), "video-only-model");
});

test("skips the endpoint-type check for catalog entries without supported_endpoint_types", async (t) => {
  t.after(async () => {
    delete process.env.TEST_MODEL;
    await rm(catalogPath, { force: true });
  });
  await writeFile(catalogPath, JSON.stringify({ data: [{ id: "legacy-model" }] }));
  process.env.TEST_MODEL = "legacy-model";
  assert.equal(await requireConfiguredModel("TEST_MODEL", "anthropic", catalogPath), "legacy-model");
});
