import type { MediaModelCapability } from "../schema.js";

const REPLICATE_API_BASE = "https://api.replicate.com/v1";
const REPLICATE_MODELS_URL = `${REPLICATE_API_BASE}/models`;

/** Fetch all models from Replicate's public collection and extract capability
 *  metadata from their version schemas. Replicate exposes OpenAPI/JSON Schema
 *  definitions per model version that include supported inputs, enums, limits,
 *  aspect ratios, and other constraints. */
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
        { headers, signal: AbortSignal.timeout(10000) },
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

        // Determine modality from description, name, and collection
        const modality = inferModality(collection, name, description);
        const capability = inferCapability(collection, modality, description);

        // Try to fetch the latest version's schema for detailed capabilities
        const latestVersion = m.latest_version as Record<string, unknown> | undefined;
        let schemaCapabilities: Partial<MediaModelCapability> = {};

        if (latestVersion?.id) {
          schemaCapabilities = await fetchVersionSchema(
            owner,
            String(name),
            String(latestVersion.id),
            headers,
          );
        }

        // Build the URL to the model's page
        const homepageUrl = m.homepage_url as string | undefined;
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
          schemaUrl: `${endpointUrl}/versions/${latestVersion?.id ?? ""}`,
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

async function fetchVersionSchema(
  owner: string,
  name: string,
  versionId: string,
  headers: Record<string, string>,
): Promise<Partial<MediaModelCapability>> {
  try {
    const response = await fetch(
      `https://api.replicate.com/v1/models/${owner}/${name}/versions/${versionId}`,
      { headers },
    );
    if (!response.ok) return {};

    const body = (await response.json()) as Record<string, unknown>;
    const version = body as Record<string, unknown>;
    const openapiSchema = version.openapi_schema as Record<string, unknown> | undefined;
    const cogSchema = version.cog_version_schema as Record<string, unknown> | undefined;

    // The schema has a JSON Schema definition of the model's input parameters
    const schema = openapiSchema ?? cogSchema;
    if (!schema) return {};

    const extracted: Partial<MediaModelCapability> = {};

    // Parse the input parameters from the schema
    const inputSchema = (schema as Record<string, unknown>).input as
      | Record<string, unknown>
      | undefined;
    const properties = inputSchema?.properties as Record<string, unknown> | undefined;
    const params = (schema as Record<string, unknown>).parameters as
      | Record<string, unknown>
      | undefined;
    const inputParams = (params as Record<string, unknown>)?.properties as
      | Record<string, unknown>
      | undefined;

    const allProps = { ...(properties ?? {}), ...(inputParams ?? {}) } as Record<
      string,
      unknown
    >;

    for (const [paramName, paramDef] of Object.entries(allProps)) {
      const pd = paramDef as Record<string, unknown>;
      const normalized = paramName.toLowerCase().replace(/[_-]/g, "_");

      // Aspect ratio enum
      if (/aspect|ratio/i.test(normalized)) {
        const enums = pd.enum as string[] | undefined;
        if (enums?.length) {
          extracted.aspectRatios = enums.filter(
            (e) => !e.toLowerCase().includes("auto") || true,
          );
          // If they have x:y format, normalize them
          extracted.aspectRatios = extracted.aspectRatios.map((r) => {
            if (/^\d+x\d+$/i.test(r)) {
              const [w, h] = r.split("x").map(Number);
              return `${w}:${h}`;
            }
            // If it's a URL-like or dimension string, check if it contains ratio
            if (/^\d+:\d+$/.test(r)) return r;
            // If it's a raw dimension like "1024x1024", convert to ratio
            if (/^\d+x\d+$/i.test(r)) {
              const [w, h] = r.split("x").map(Number);
              const gcd = findGcd(w, h);
              return `${w / gcd}:${h / gcd}`;
            }
            return r;
          });
        }
      }

      // Duration / time
      if (/duration|time|length|seconds/i.test(normalized)) {
        const max = pd.maximum as number | undefined;
        const enumVals = pd.enum as (number | string)[] | undefined;
        if (max) extracted.maxDurationSeconds = max;
        if (enumVals?.length) {
          extracted.durationOptions = enumVals.map(String);
        }
      }

      // Quality / resolution
      if (/quality|resolution/i.test(normalized)) {
        const enums = pd.enum as string[] | undefined;
        if (enums?.length) {
          extracted.qualityOptions = enums;
        }
      }

      // Output format
      if (/format|output_format|response_format/i.test(normalized)) {
        const enums = pd.enum as string[] | undefined;
        if (enums?.length) {
          extracted.outputFormats = enums;
        }
      }

      // Generation mode
      if (/mode|generation_type/i.test(normalized) && !/aspect/i.test(normalized)) {
        const enums = pd.enum as string[] | undefined;
        if (enums?.length) {
          extracted.generationModes = enums;
        }
      }
    }

    return extracted;
  } catch {
    return {};
  }
}

function inferModality(collection: string, name: string, description: string): "video" | "audio" | "image" {
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