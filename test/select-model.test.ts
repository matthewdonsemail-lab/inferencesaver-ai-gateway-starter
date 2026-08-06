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
  assert.equal(await requireConfiguredModel("TEST_MODEL", catalogPath), "verified-model");
});

test("rejects missing and unavailable model configuration", async (t) => {
  t.after(async () => {
    delete process.env.TEST_MODEL;
    await rm(catalogPath, { force: true });
  });
  await writeFile(catalogPath, JSON.stringify({ data: [{ id: "available-model" }] }));
  await assert.rejects(requireConfiguredModel("TEST_MODEL", catalogPath), /TEST_MODEL is required/);
  process.env.TEST_MODEL = "unverified-model";
  await assert.rejects(requireConfiguredModel("TEST_MODEL", catalogPath), /does not name a model/);
});
