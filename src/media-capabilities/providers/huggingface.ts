import type { MediaModelCapability } from "../schema.js";

const HF_API_BASE = "https://huggingface.co/api";
const HF_PIPELINE_TAGS = [
  "text-to-image",
  "image-to-image",
  "image-to-video",
  "text-to-video",
  "video-to-video",
  "text-to-speech",
  "text-to-audio",
  "audio-to-audio",
  "automatic-speech-recognition",
  "image-segmentation",
  "image-classification",
  "audio-classification",
];

/** Fetch media-model capabilities from Hugging Face. HF exposes structured
 *  model metadata via its API (tags, cardData, pipelines) that we normalize
 *  into our schema. */
export async function fetchHuggingFaceCapabilities(): Promise<MediaModelCapability[]> {
  const results: MediaModelCapability[] = [];
  const seen = new Set<string>();

  for (const pipelineTag of HF_PIPELINE_TAGS) {
    try {
      // Search the HF API for models with this pipeline tag
      const response = await fetch(
        `${HF_API_BASE}/models?pipeline_tag=${pipelineTag}&sort=downloads&direction=-1&limit=3`,
        { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(8000) },
      );
      if (!response.ok) continue;

      const models = (await response.json()) as Record<string, unknown>[];

      for (const model of models) {
        const id = String(model.id ?? "");
        const fullId = `huggingface/${id}`;
        if (!id || seen.has(fullId)) continue;
        seen.add(fullId);

        // Map pipeline tag → modality/capability
        const { modality, capability } = mapPipelineTag(pipelineTag);

        // Load the model's card data for detailed capabilities
        const cardData = await fetchCardData(id);

        const pipelineTagToInput: Record<string, string[]> = {
          "text-to-image": ["text"],
          "image-to-image": ["image", "text"],
          "image-to-video": ["image", "text"],
          "text-to-video": ["text"],
          "video-to-video": ["video", "text"],
          "text-to-speech": ["text"],
          "text-to-audio": ["text"],
          "audio-to-audio": ["audio"],
          "automatic-speech-recognition": ["audio"],
          "image-segmentation": ["image"],
          "image-classification": ["image"],
          "audio-classification": ["audio"],
        };

        results.push({
          id: fullId,
          name: String(cardData?.name ?? model.modelId ?? id.split("/").pop() ?? id),
          provider: "huggingface",
          modelId: id,
          modality,
          capability,
          inputTypes: pipelineTagToInput[pipelineTag] ?? ["text"],
          outputTypes: [modality],
          ...extractCardCapabilities(cardData),
          schemaUrl: `https://huggingface.co/${id}`,
          source: "huggingface",
          lastSyncedAt: new Date().toISOString(),
        } satisfies MediaModelCapability);
      }
    } catch {
      // Pipeline fetch failed, skip
    }
  }

  return results;
}

interface HfCardData {
  name?: string;
  tags?: string[];
  pipeline_tag?: string;
  cardData?: Record<string, unknown>;
  modelId?: string;
  config?: Record<string, unknown>;
}

async function fetchCardData(id: string): Promise<HfCardData | null> {
  try {
    const response = await fetch(`${HF_API_BASE}/models/${id}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return null;
    return (await response.json()) as HfCardData;
  } catch {
    return null;
  }
}

function extractCardCapabilities(card: HfCardData | null): Partial<MediaModelCapability> {
  if (!card) return {};

  const extracted: Partial<MediaModelCapability> = {};
  const tags = card.tags ?? [];
  const cardData = card.cardData ?? {};

  // Look for aspect ratio / resolution info in tags and card data
  const tagsJoined = tags.join(" ").toLowerCase();

  // Check some common capability tags
  if (/diffusers/.test(tagsJoined)) {
    // Diffusers models typically support multiple aspect ratios
  }

  // Try to find structured info in cardData
  const limitations = String(cardData.limitations ?? "").toLowerCase();
  const pipelineTag = String(card.pipeline_tag ?? "");

  if (pipelineTag === "text-to-video" || pipelineTag === "image-to-video") {
    // Video models — check for duration/resolution hints
    const durationMatch = /(\d+)[- ]?seconds/.exec(limitations);
    if (durationMatch) {
      extracted.maxDurationSeconds = Number(durationMatch[1]);
    }
    const resolutionMatch = /(\d{3,4}x\d{3,4})/.exec(limitations);
    if (resolutionMatch) {
      const [w, h] = resolutionMatch[1].split("x").map(Number);
      extracted.supportedResolutions = [{ width: w, height: h }];
    }
  }

  return extracted;
}

function mapPipelineTag(tag: string): { modality: "video" | "audio" | "image"; capability: string } {
  switch (tag) {
    case "text-to-video":
    case "image-to-video":
    case "video-to-video":
      return { modality: "video", capability: "video_generation" };
    case "text-to-speech":
    case "text-to-audio":
    case "audio-to-audio":
      return { modality: "audio", capability: "audio_generation" };
    case "automatic-speech-recognition":
      return { modality: "audio", capability: "audio_transcription" };
    case "image-segmentation":
    case "image-classification":
      return { modality: "image", capability: "image_generation" };
    default:
      return { modality: "image", capability: "image_generation" };
  }
}