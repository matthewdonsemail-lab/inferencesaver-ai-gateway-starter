import { readFile } from "node:fs/promises";
import type { ModelRecord } from "./model-catalog.js";

export async function selectModel(predicate: (model: ModelRecord) => boolean, path = "data/models.json") {
  const catalog = JSON.parse(await readFile(path, "utf8")) as { data?: ModelRecord[] };
  const model = catalog.data?.find(predicate);
  if (!model) throw new Error("No model in data/models.json satisfies the requested endpoint capability");
  return model.id;
}

export async function selectFirstModel(path = "data/models.json") {
  return selectModel(() => true, path);
}
