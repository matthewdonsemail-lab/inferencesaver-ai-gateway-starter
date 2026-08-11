import { readFile, writeFile } from "node:fs/promises";
import type { PricingRecord } from "./pricing-catalog.js";


export type ModelRecord = {
  id: string;
  object?: string;
  created?: number;
  owned_by?: string;
  supported_endpoint_types?: string[];
};

function normalizeEndpointTypes(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const types = value.filter((t): t is string => typeof t === "string");
  return types.length > 0 ? types : undefined;
}

export function normalizeModels(payload: unknown): ModelRecord[] {
  if (!payload || typeof payload !== "object" || !Array.isArray((payload as { data?: unknown }).data)) {
    throw new Error("Unexpected /v1/models response: expected an object with a data array");
  }
  return (payload as { data: unknown[] }).data.map((item, index) => {
    if (!item || typeof item !== "object" || typeof (item as { id?: unknown }).id !== "string") {
      throw new Error(`Unexpected /v1/models item at index ${index}: missing id`);
    }
    const value = item as Record<string, unknown>;
    const supportedEndpointTypes = normalizeEndpointTypes(value.supported_endpoint_types);
    return {
      id: value.id as string,
      ...(typeof value.object === "string" ? { object: value.object } : {}),
      ...(typeof value.created === "number" ? { created: value.created } : {}),
      ...(typeof value.owned_by === "string" ? { owned_by: value.owned_by } : {}),
      ...(supportedEndpointTypes ? { supported_endpoint_types: supportedEndpointTypes } : {})
    };
  }).sort((a, b) => a.id.localeCompare(b.id));
}

export async function fetchModels(baseUrl = process.env.INFERENCESAVER_API_BASE_URL ?? "https://api.inferencesaver.com") {
  const key = process.env.INFERENCESAVER_API_KEY;
  if (!key) throw new Error("INFERENCESAVER_API_KEY is required");
  const response = await fetch(`${baseUrl}/v1/models`, {
    headers: { Authorization: `Bearer ${key}`, Accept: "application/json" }
  });
  if (!response.ok) throw new Error(`/v1/models failed with HTTP ${response.status}`);
  return normalizeModels(await response.json());
}

export async function writeCatalog(models: ModelRecord[], path = "data/models.json") {
  await writeFile(path, `${JSON.stringify({ object: "list", data: models }, null, 2)}\n`, "utf8");
}

if (import.meta.url === `file://${process.argv[1]?.replaceAll("\\\\", "/")}`) {
  const models = await fetchModels();
  await writeCatalog(models);
  console.log(`Wrote ${models.length} normalized models to data/models.json`);
}



export type MergedModelRecord = ModelRecord & PricingRecord & { available_to_key: boolean };

export function mergeCatalogs(
  authModels: ModelRecord[],
  pricingModels: PricingRecord[],
): MergedModelRecord[] {
  const pricingById = new Map<string, PricingRecord>();
  for (const record of pricingModels) pricingById.set(record.id, record);

  const byId = new Map<string, MergedModelRecord>();
  for (const model of authModels) {
    byId.set(model.id, { ...model, ...(pricingById.get(model.id) ?? {}), available_to_key: true });
  }
  for (const record of pricingModels) {
    if (!byId.has(record.id)) {
      byId.set(record.id, { id: record.id, ...record, available_to_key: false });
    }
  }
  return Array.from(byId.values()).sort((a, b) => a.id.localeCompare(b.id));
}
