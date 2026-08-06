import { readFile } from "node:fs/promises";
import type { ModelRecord } from "./model-catalog.js";

export async function requireConfiguredModel(variableName: string, path = "data/models.json") {
  const configuredId = process.env[variableName];
  if (!configuredId) throw new Error(`${variableName} is required; set it to an independently verified model for this endpoint`);
  const catalog = JSON.parse(await readFile(path, "utf8")) as { data?: ModelRecord[] };
  if (!catalog.data?.some((model) => model.id === configuredId)) {
    throw new Error(`${variableName} does not name a model in the authenticated data/models.json catalog`);
  }
  return configuredId;
}
