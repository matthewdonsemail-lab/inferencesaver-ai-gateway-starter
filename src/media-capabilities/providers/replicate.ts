import type { MediaModelCapability } from "../schema.js";

const REPLICATE_API_BASE = "https://api.replicate.com/v1";

/** Fetch all models from Replicate's public collections and extract
 *  capability metadata from the OpenAPI schemas baked into each model's
 *  latest_version object (the collections endpoint returns them inline —
 *  no separate version fetch required). */
export async function fetchReplicateCapabilities(
  apiToken?: string,
): Promise<MediaModelCapability[]> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (apiToken) {
    headers.Authorization = `Bearer ${apiToken}`;
  }

  // Replicate lists models by collection. We care about image/video/audio.
  const collectionSlugs = [
    "image-to-image",
    "image-to-video",
    "text-to-image",
    "text-to-video",
    "video-to-video",
    "speech-recognition",
    "text-to-speech",
    "music-and-audio-generation",
  ];

  const results: MediaModelCapability[] = [];
  const seen = new Set<string>();

  for (const collection of collectionSlugs) {
    try {
      const response = await fetch(
        `${REPLICATE_API_BASE}/collections/${collection}`,
        { headers, signal: AbortSignal.timeout(15000) },
      );
      if (!response.ok) continue;
      const body = (await response.json()) as { models?: unknown[] };
      if (!Array.isArray(body.models)) continue;

      for (const model of body.models) {
        const m = model as Record<string, unknown>;
        const owner = String(m.owner ?? "");
        const name = String(m.name ?? "");
        const id = `replicate/${owner}/${name}`;
        const description = String(m.description ?? "");

        if (!owner || !name || seen.has(id)) continue;
        seen.add(id);

        // Determine modality from collection, name, and description
        const modality = inferModality(collection, name, description);
        const capability = inferCapability(collection, modality, description);

        // The schema is already on the latest_version object — parse it inline
        const latestVersion = m.latest_version as Record<string, unknown> | undefined;
        const schemaCapabilities = latestVersion
          ? parseVersionSchema(latestVersion)
          : {};

        const endpointUrl = `https://api.replicate.com/v1/models/${owner}/${name}/predictions`;

        results.push({
          id,
          name: String(m.name ?? ""),
          provider: "replicate",
          modelId: `${owner}/${name}`,
          modality,
          capability,
          inputTypes: modality === "audio" ? ["text", "audio"] : ["text", "image"],
          outputTypes: [modality],
          ...schemaCapabilities,
          endpointUrl,
          schemaUrl: `https://replicate.com/${owner}/${name}`,
          source: "replicate",
          lastSyncedAt: new Date().toISOString(),
        } satisfies MediaModelCapability);
      }
    } catch {
      // Collection fetch failed, skip
    }
  }

  return results;
}

/** Parse the OpenAPI/JSON Schema from a version object to extract supported
 *  aspect ratios, durations, quality options, and output formats. The schema
 *  is already on the version object returned by the collections endpoint.
 *  Replicate/Cog schemas declare input params as properties that reference
 *  component schemas via $ref (e.g. {"allOf":[{"$ref":"#/components/schemas/aspect_ratio"}]}),
 *  so we resolve $refs into the components registry before reading enums. */
function parseVersionSchema(
  version: Record<string, unknown>,
): Partial<MediaModelCapability> {
  const extracted: Partial<MediaModelCapability> = {};

  // The openapi_schema may be a string or already parsed
  const rawSchema = version.openapi_schema;
  if (!rawSchema) return {};

  let schema: Record<string, unknown>;
  try {
    schema =
      typeof rawSchema === "string"
        ? (JSON.parse(rawSchema) as Record<string, unknown>)
        : (rawSchema as Record<string, unknown>);
  } catch {
    return {};
  }

  // Build the component schema registry for $ref resolution
  const components = schema.components as Record<string, unknown> | undefined;
  const componentSchemas = (components?.schemas as Record<string, unknown>) ?? {};

  /** Resolve a $ref like "#/components/schemas/aspect_ratio" against the
   *  component registry and return the merged schema definition. */
  function resolveRef(ref: string): Record<string, unknown> | undefined {
    const parts = ref.replace(/^#\//, "").split("/").map(decodeURIComponent);
    // parts = ["components", "schemas", "aspect_ratio"]
    let current: unknown = componentSchemas;
    for (const part of parts) {
      if (part === "components" || part === "schemas") continue;
      if (current && typeof current === "object" && part in (current as Record<string, unknown>)) {
        current = (current as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }
    return typeof current === "object" && current !== null
      ? (current as Record<string, unknown>)
      : undefined;
  }

  /** Check a property definition for enum values, following $ref/allOf. */
  function enumOf(pd: Record<string, unknown>): string[] | undefined {
    const direct = pd.enum as unknown[] | undefined;
    if (direct?.length) return direct.map(String);

    // allOf references
    const allOf = pd.allOf as unknown[] | undefined;
    if (allOf?.length) {
      const merged: string[] = [];
      for (const item of allOf) {
        const ref = (item as Record<string, unknown>).$ref as string | undefined;
        if (ref) {
          const resolved = resolveRef(ref);
          if (resolved?.enum) {
            return (resolved.enum as unknown[]).map(String);
          }
          if (resolved?.type === "string" && resolved.const) {
            return [String(resolved.const)];
          }
          continue;
        }
        // Nested allOf/anyOf resolution
        const nested = enumOf(item as Record<string, unknown>);
        if (nested) merged.push(...nested);
      }
      if (merged.length) return merged;
    }

    // anyOf references
    const anyOf = pd.anyOf as unknown[] | undefined;
    if (anyOf?.length) {
      for (const item of anyOf) {
        const ref = (item as Record<string, unknown>).$ref as string | undefined;
        if (ref) {
          const resolved = resolveRef(ref);
          if (resolved?.enum) {
            return (resolved.enum as unknown[]).map(String);
          }
        }
      }
    }

    return undefined;
  }

  // Input properties (Cog standard: components.schemas.Input.properties)
  const inputSchema = (componentSchemas.Input as Record<string, unknown>) ?? {};
  const inputProps = (inputSchema.properties as Record<string, unknown>) ?? {};

  // Also check the openapi top-level schemas
  const topSchemas = (schema.schemas as Record<string, unknown>) ?? {};
  const topInput = (topSchemas.Input as Record<string, unknown>) ?? {};
  const topInputProps = (topInput.properties as Record<string, unknown>) ?? {};

  const allProps = { ...inputProps, ...topInputProps } as Record<string, unknown>;

  for (const [paramName, paramDef] of Object.entries(allProps)) {
    const pd = paramDef as Record<string, unknown>;
    const normalized = paramName.toLowerCase().replace(/[_-]/g, "_");
    const enums = enumOf(pd);

    // Aspect ratio / size / format / resolution
    if (/aspect|ratio|size|dimension|resolution|format/.test(normalized)) {
      if (enums?.length) {
        // Extract aspect ratios (either "1:1" style or "1024x1024" resolutions)
        const ratios = new Set<string>();
        const resolutions: { width: number; height: number }[] = [];
        for (const value of enums) {
          if (/^\d+x\d+$/i.test(value)) {
            const [w, h] = value.split("x").map(Number);
            if (w && h) {
              resolutions.push({ width: w, height: h });
              const gcd = findGcd(w, h);
              ratios.add(`${w / gcd}:${h / gcd}`);
            }
          } else if (/^\d+:\d+$/.test(value)) {
            ratios.add(value);
          } else if (/^(auto|none|custom)$/i.test(value)) {
            ratios.add(value.toLowerCase());
          }
        }
        if (ratios.size) extracted.aspectRatios = [...ratios];
        if (resolutions.length) extracted.supportedResolutions = resolutions;
      }
    }

    // Duration / time
    if (/duration|time|seconds|length/.test(normalized) && !/gradient/.test(normalized)) {
      const max = pd.maximum as number | undefined;
      if (max) extracted.maxDurationSeconds = max;
      if (enums?.length) {
        // Only numeric duration options are valid
        const numeric = enums.filter((v) => !Number.isNaN(Number(v)) && Number(v) > 0);
        if (numeric.length) extracted.durationOptions = numeric;
      }
    }

    // Quality / resolution
    if (/quality|resolution|res_mode|mode$/.test(normalized) && !/aspect|ratio/.test(normalized)) {
      if (enums?.length) {
        const q = enums.filter((v) => !/^none$/i.test(v));
        if (q.length) extracted.qualityOptions = q;
      }
    }

    // Output format
    if (/format|output_format|response_format|encode/.test(normalized) && !/aspect|ratio|resolution/.test(normalized)) {
      if (enums?.length) {
        extracted.outputFormats = enums;
      }
    }

    // Mode
    if (/mode|generation_type|style_type/.test(normalized) && !/aspect|ratio|quality|res_mode/.test(normalized)) {
      if (enums?.length) {
        const modes = enums.filter((v) => !/^none$/i.test(v));
        if (modes.length) extracted.generationModes = modes;
      }
    }
  }

  return extracted;
}

function inferModality(
  collection: string,
  name: string,
  description: string,
): "video" | "audio" | "image" {
  const text = `${collection} ${name} ${description}`.toLowerCase();
  if (/video|motion|animation/i.test(text)) return "video";
  if (/audio|speech|music|voice|tts|transcription|whisper/i.test(text)) return "audio";
  return "image";
}

function inferCapability(
  collection: string,
  modality: "video" | "audio" | "image",
  description: string,
): string {
  const text = description.toLowerCase();
  if (modality === "video") {
    if (/motion.control|motion_transfer|drag/i.test(text)) return "motion_control";
    return "video_generation";
  }
  if (modality === "audio") {
    if (/transcription|speech.recognition|stt/i.test(text)) return "audio_transcription";
    if (/tts|text.to.speech|voice/i.test(text)) return "audio_generation";
    return "audio_generation";
  }
  return "image_generation";
}

function findGcd(a: number, b: number): number {
  return b === 0 ? a : findGcd(b, a % b);
}