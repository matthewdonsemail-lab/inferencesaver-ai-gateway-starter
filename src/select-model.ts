import { readFile } from "node:fs/promises";
import type { ModelRecord } from "./model-catalog.js";

export async function requireConfiguredModel(
  variableName: string,
  expectedEndpointType?: string,
  path = "data/models.json"
) {
  const configuredId = process.env[variableName];
  if (!configuredId) throw new Error(`${variableName} is required; set it to an independently verified model for this endpoint`);
  const catalog = JSON.parse(await readFile(path, "utf8")) as {
    data?: Array<ModelRecord & { available_to_key?: boolean }>;
  };
  const model = catalog.data?.find((m) => m.id === configuredId);
  if (!model) {
    throw new Error(`${variableName} does not name a model in the authenticated data/models.json catalog`);
  }
  if (model.available_to_key === false) {
    throw new Error(
      `${variableName}=${configuredId} exists in the pricing catalog but is not available to the configured INFERENCESAVER_API_KEY`
    );
  }
  if (
    expectedEndpointType &&
    model.supported_endpoint_types &&
    !model.supported_endpoint_types.includes(expectedEndpointType)
  ) {
    throw new Error(
      `${variableName}=${configuredId} does not list "${expectedEndpointType}" in its catalog supported_endpoint_types (${model.supported_endpoint_types.join(", ")})`
    );
  }
  return configuredId;
}
