export type PricingRecord = {
  id: string;
  label?: string;
  provider?: string;
  family?: string;
  tier?: string;
  capability?: string;
  supportedEndpoints?: string[];
  contextWindow?: number;
  maxOutputTokens?: number;
  inputPricePerMillionUsd?: number;
  outputPricePerMillionUsd?: number;
  originalInputPricePerMillionUsd?: number;
  originalOutputPricePerMillionUsd?: number;
  savingsPercent?: number;
  cacheReadPricePerMillionUsd?: number;
  cacheWritePricePerMillionUsd?: number;
  enableGroups?: string[];
  pricingVersion?: string | null;
};

function optionalNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function optionalStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const items = value.filter((v): v is string => typeof v === "string" && v.length > 0);
  return items.length > 0 ? items : undefined;
}

function extractId(item: Record<string, unknown>): string | undefined {
  return optionalString(item.id ?? item.rawName ?? item.slug ?? item.model ?? item.model_name);
}

export function normalizePricingModels(payload: unknown): PricingRecord[] {
  // The public catalog returns a bare array; keep the { data: [...] }
  // envelope (OpenAI-style) accepted for future/alternate endpoints.
  let items: unknown[];
  if (Array.isArray(payload)) {
    items = payload;
  } else if (
    payload &&
    typeof payload === "object" &&
    Array.isArray((payload as { data?: unknown }).data)
  ) {
    items = (payload as { data: unknown[] }).data;
  } else {
    throw new Error("Unexpected pricing response: expected a data array");
  }
  return items.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new Error(`Unexpected pricing item at index ${index}: expected an object`);
    }
    const value = item as Record<string, unknown>;
    const id = extractId(value);
    if (!id) throw new Error(`Unexpected pricing item at index ${index}: missing id`);
    return {
      id,
      ...(optionalString(value.label) ? { label: optionalString(value.label) } : {}),
      ...(optionalString(value.provider) ? { provider: optionalString(value.provider) } : {}),
      ...(optionalString(value.family) ? { family: optionalString(value.family) } : {}),
      ...(optionalString(value.tier) ? { tier: optionalString(value.tier) } : {}),
      ...(optionalString(value.capability) ? { capability: optionalString(value.capability) } : {}),
      ...(optionalStringArray(value.supportedEndpoints ?? value.supported_endpoints)
        ? { supportedEndpoints: optionalStringArray(value.supportedEndpoints ?? value.supported_endpoints) }
        : {}),
      ...(optionalNumber(value.contextWindow) ? { contextWindow: optionalNumber(value.contextWindow) } : {}),
      ...(optionalNumber(value.maxOutputTokens) ? { maxOutputTokens: optionalNumber(value.maxOutputTokens) } : {}),
      ...(optionalNumber(value.inputPricePerMillionUsd) !== undefined
        ? { inputPricePerMillionUsd: optionalNumber(value.inputPricePerMillionUsd) }
        : {}),
      ...(optionalNumber(value.outputPricePerMillionUsd) !== undefined
        ? { outputPricePerMillionUsd: optionalNumber(value.outputPricePerMillionUsd) }
        : {}),
      ...(optionalNumber(value.originalInputPricePerMillionUsd) !== undefined
        ? { originalInputPricePerMillionUsd: optionalNumber(value.originalInputPricePerMillionUsd) }
        : {}),
      ...(optionalNumber(value.originalOutputPricePerMillionUsd) !== undefined
        ? { originalOutputPricePerMillionUsd: optionalNumber(value.originalOutputPricePerMillionUsd) }
        : {}),
      ...(optionalNumber(value.savingsPercent) !== undefined
        ? { savingsPercent: optionalNumber(value.savingsPercent) }
        : {}),
      ...(optionalNumber(value.cacheReadPricePerMillionUsd) !== undefined
        ? { cacheReadPricePerMillionUsd: optionalNumber(value.cacheReadPricePerMillionUsd) }
        : {}),
      ...(optionalNumber(value.cacheWritePricePerMillionUsd) !== undefined
        ? { cacheWritePricePerMillionUsd: optionalNumber(value.cacheWritePricePerMillionUsd) }
        : {}),
      ...(optionalStringArray(value.enableGroups) ? { enableGroups: optionalStringArray(value.enableGroups) } : {}),
      ...(optionalString(value.pricingVersion) !== undefined
        ? { pricingVersion: optionalString(value.pricingVersion) }
        : value.pricingVersion === null
          ? { pricingVersion: null }
          : {}),
    };
  });
}

export const DEFAULT_PRICING_URL = "https://inferencesaver.com/api/public/models";

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

export async function fetchPricingCatalog(url = process.env.INFERENCESAVER_PRICING_URL ?? DEFAULT_PRICING_URL) {
  const response = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": BROWSER_UA },
  });
  if (!response.ok) throw new Error(`pricing catalog failed with HTTP ${response.status}`);
  return normalizePricingModels(await response.json());
}
