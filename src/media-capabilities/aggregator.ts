import { readFile, writeFile } from "node:fs/promises";
import type { MediaModelCapability, MediaModelCatalog } from "./schema.js";
import { fetchReplicateCapabilities } from "./providers/replicate.js";
import { fetchFalCapabilities } from "./providers/fala.js";
import { fetchHuggingFaceCapabilities } from "./providers/huggingface.js";

const CATALOG_VERSION = "0.1.0";
const CATALOG_PATH = "data/media-capabilities.json";

/** Known InferenceSaver media models with their capability metadata. */
const INFERENCESAVER_MEDIA_MODELS: MediaModelCapability[] = [
  {
    id: "inferencesaver/agnes-video-v2.0",
    name: "Agnes Video 2.0",
    provider: "inferencesaver",
    modelId: "agnes-video-v2.0",
    modality: "video",
    capability: "video_generation",
    aspectRatios: ["1:1", "9:16", "16:9"],
    qualityOptions: ["standard"],
    inputTypes: ["text", "image"],
    outputTypes: ["video"],
    supportsReferenceImages: true,
    endpointUrl: "https://api.inferencesaver.com/v1/images/generations",
    source: "inferencesaver",
  },
  {
    id: "inferencesaver/agnes-image-2.1-flash",
    name: "Agnes Image 2.1 Flash",
    provider: "inferencesaver",
    modelId: "agnes-image-2.1-flash",
    modality: "image",
    capability: "image_generation",
    aspectRatios: ["1:1", "9:16", "16:9"],
    qualityOptions: ["standard"],
    inputTypes: ["text", "image"],
    outputTypes: ["image"],
    supportsReferenceImages: true,
    endpointUrl: "https://api.inferencesaver.com/v1/images/generations",
    source: "inferencesaver",
  },
  {
    id: "inferencesaver/gpt-image-2",
    name: "GPT Image 2",
    provider: "inferencesaver",
    modelId: "gpt-image-2",
    modality: "image",
    capability: "image_generation",
    aspectRatios: ["auto", "1:1", "9:16", "16:9", "4:5", "3:4"],
    qualityOptions: ["standard", "hd"],
    inputTypes: ["text", "image"],
    outputTypes: ["image"],
    supportsReferenceImages: true,
    endpointUrl: "https://api.inferencesaver.com/v1/images/generations",
    source: "inferencesaver",
  },
  {
    id: "inferencesaver/mimo-v2.5-tts",
    name: "MiMo V2.5 TTS",
    provider: "inferencesaver",
    modelId: "mimo-v2.5-tts",
    modality: "audio",
    capability: "audio_generation",
    outputFormats: ["mp3", "wav"],
    qualityOptions: ["standard"],
    inputTypes: ["text"],
    outputTypes: ["audio"],
    supportsCustomVoice: true,
    endpointUrl: "https://api.inferencesaver.com/v1/audio/speech",
    source: "inferencesaver",
  },
  {
    id: "inferencesaver/music-2.6-free",
    name: "Music 2.6 Free",
    provider: "inferencesaver",
    modelId: "music-2.6-free",
    modality: "audio",
    capability: "audio_generation",
    outputFormats: ["wav", "mp3"],
    inputTypes: ["text"],
    outputTypes: ["audio"],
    endpointUrl: "https://api.inferencesaver.com/v1/audio/generations",
    source: "inferencesaver",
  },
  {
    id: "inferencesaver/veo-3.1",
    name: "Veo 3.1",
    provider: "inferencesaver",
    modelId: "veo-3.1",
    modality: "video",
    capability: "video_generation",
    aspectRatios: ["16:9", "1:1", "9:16"],
    inputTypes: ["text", "image"],
    outputTypes: ["video"],
    supportsReferenceImages: true,
    endpointUrl: "https://api.inferencesaver.com/v1/video/generations",
    source: "inferencesaver",
  },
  {
    id: "inferencesaver/grok-imagine-video",
    name: "Grok Imagine Video",
    provider: "inferencesaver",
    modelId: "grok-imagine-video",
    modality: "video",
    capability: "video_generation",
    aspectRatios: ["9:16", "16:9", "1:1"],
    inputTypes: ["text", "image"],
    outputTypes: ["video"],
    endpointUrl: "https://api.inferencesaver.com/v1/video/generations",
    source: "inferencesaver",
  },
  {
    id: "inferencesaver/agnes-image-2.0-flash",
    name: "Agnes Image 2.0 Flash",
    provider: "inferencesaver",
    modelId: "agnes-image-2.0-flash",
    modality: "image",
    capability: "image_generation",
    aspectRatios: ["1:1", "9:16", "16:9"],
    qualityOptions: ["standard"],
    inputTypes: ["text", "image"],
    outputTypes: ["image"],
    endpointUrl: "https://api.inferencesaver.com/v1/images/generations",
    source: "inferencesaver",
  },
  {
    id: "inferencesaver/sora-2",
    name: "Sora 2",
    provider: "inferencesaver",
    modelId: "sora-2",
    modality: "video",
    capability: "video_generation",
    aspectRatios: ["9:16", "16:9"],
    durationOptions: ["4", "8", "12", "16", "20"],
    inputTypes: ["text", "image"],
    outputTypes: ["video"],
    supportsReferenceImages: false,
    endpointUrl: "https://api.inferencesaver.com/v1/video/generations",
    source: "inferencesaver",
  },
  {
    id: "inferencesaver/kling-3.0",
    name: "Kling 3.0",
    provider: "inferencesaver",
    modelId: "kling-3.0",
    modality: "video",
    capability: "video_generation",
    aspectRatios: ["9:16", "16:9", "1:1"],
    durationOptions: ["5"],
    qualityOptions: ["standard", "pro"],
    inputTypes: ["text", "image"],
    outputTypes: ["video"],
    supportsReferenceImages: true,
    endpointUrl: "https://api.inferencesaver.com/v1/video/generations",
    source: "inferencesaver",
  },
  {
    id: "inferencesaver/kling-3-motion-control",
    name: "Kling 3 Motion Control",
    provider: "inferencesaver",
    modelId: "kling-3-motion-control",
    modality: "video",
    capability: "motion_control",
    qualityOptions: ["720p", "1080p"],
    inputTypes: ["video", "image"],
    outputTypes: ["video"],
    endpointUrl: "https://api.inferencesaver.com/v1/video/generations",
    source: "inferencesaver",
  },
  {
    id: "inferencesaver/seedance-1.0-fast",
    name: "Seedance 1.0 Fast",
    provider: "inferencesaver",
    modelId: "seedance-1.0-fast",
    modality: "video",
    capability: "video_generation",
    aspectRatios: ["9:16", "16:9", "1:1"],
    durationOptions: ["5", "10", "15"],
    qualityOptions: ["480p", "720p"],
    generationModes: ["fast"],
    inputTypes: ["text", "image"],
    outputTypes: ["video"],
    supportsReferenceImages: true,
    endpointUrl: "https://api.inferencesaver.com/v1/video/generations",
    source: "inferencesaver",
  },
  {
    id: "inferencesaver/seedance-1.0-pro",
    name: "Seedance 1.0 Pro",
    provider: "inferencesaver",
    modelId: "seedance-1.0-pro",
    modality: "video",
    capability: "video_generation",
    aspectRatios: ["9:16", "16:9", "1:1"],
    durationOptions: ["5", "10", "15"],
    qualityOptions: ["480p", "720p"],
    generationModes: ["pro"],
    inputTypes: ["text", "image"],
    outputTypes: ["video"],
    supportsReferenceImages: true,
    endpointUrl: "https://api.inferencesaver.com/v1/video/generations",
    source: "inferencesaver",
  },
  {
    id: "inferencesaver/speech-2.5-hd-preview",
    name: "Speech 2.5 HD Preview",
    provider: "inferencesaver",
    modelId: "speech-2.5-hd-preview",
    modality: "audio",
    capability: "audio_generation",
    outputFormats: ["mp3", "wav"],
    qualityOptions: ["hd"],
    inputTypes: ["text"],
    outputTypes: ["audio"],
    supportsCustomVoice: true,
    endpointUrl: "https://api.inferencesaver.com/v1/audio/speech",
    source: "inferencesaver",
  },
  {
    id: "inferencesaver/whisper-large-v3",
    name: "Whisper Large V3",
    provider: "inferencesaver",
    modelId: "whisper-large-v3",
    modality: "audio",
    capability: "audio_transcription",
    outputFormats: ["text", "json"],
    qualityOptions: ["large-v3"],
    inputTypes: ["audio"],
    outputTypes: ["text"],
    endpointUrl: "https://api.inferencesaver.com/v1/audio/transcriptions",
    source: "inferencesaver",
  },
  {
    id: "inferencesaver/gpt-4o-mini-tts",
    name: "GPT-4o Mini TTS",
    provider: "inferencesaver",
    modelId: "gpt-4o-mini-tts",
    modality: "audio",
    capability: "audio_generation",
    outputFormats: ["mp3", "wav"],
    qualityOptions: ["standard", "hd"],
    inputTypes: ["text"],
    outputTypes: ["audio"],
    supportsCustomVoice: false,
    endpointUrl: "https://api.inferencesaver.com/v1/audio/speech",
    source: "inferencesaver",
  },
  {
    id: "inferencesaver/gpt-4o-mini-tts-voice",
    name: "GPT-4o Mini TTS Voice",
    provider: "inferencesaver",
    modelId: "gpt-4o-mini-tts-voice",
    modality: "audio",
    capability: "audio_generation",
    outputFormats: ["mp3", "wav"],
    qualityOptions: ["standard", "hd"],
    inputTypes: ["text"],
    outputTypes: ["audio"],
    supportsCustomVoice: true,
    endpointUrl: "https://api.inferencesaver.com/v1/audio/speech",
    source: "inferencesaver",
  },
];

/** Aggregate model capabilities — first writes InferenceSaver's own models
 *  (always available), then optionally fetches from external providers. */
export async function aggregateCapabilities(options?: {
  replicateToken?: string;
  falApiKey?: string;
}): Promise<MediaModelCatalog> {
  const allCapabilities: MediaModelCapability[] = [...INFERENCESAVER_MEDIA_MODELS];

  // Try external providers in parallel (each has individual timeouts)
  if (options?.replicateToken || options?.falApiKey) {
    try {
      const results = await Promise.allSettled([
        fetchReplicateCapabilities(options?.replicateToken).catch(() => []),
        fetchFalCapabilities(options?.falApiKey).catch(() => []),
        fetchHuggingFaceCapabilities().catch(() => []),
      ]);

      if (Array.isArray(results)) {
        for (const result of results) {
          if (result.status === "fulfilled" && Array.isArray(result.value) && result.value.length) {
            process.stdout.write(`+ ${result.value.length} models from provider\n`);
            allCapabilities.push(...result.value);
          }
        }
      }
    } catch {
      // External fetch failed, use only IS models
    }
  }

  // Deduplicate by (id, provider)
  const seen = new Set<string>();
  const capabilities = allCapabilities.filter((c) => {
    const key = `${c.id}:${c.provider}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return {
    version: CATALOG_VERSION,
    generatedAt: new Date().toISOString(),
    capabilities,
  };
}

export async function writeCatalog(
  catalog: MediaModelCatalog,
  path = CATALOG_PATH,
): Promise<void> {
  await writeFile(path, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
}

export async function loadCatalog(
  path = CATALOG_PATH,
): Promise<MediaModelCatalog | null> {
  try {
    const content = await readFile(path, "utf8");
    return JSON.parse(content) as MediaModelCatalog;
  } catch {
    return null;
  }
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}` || import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, "/")}`) {
  const catalog = await aggregateCapabilities({
    replicateToken: process.env.REPLICATE_API_TOKEN,
    falApiKey: process.env.FAL_API_KEY,
  });
  await writeCatalog(catalog);
  console.log(`Wrote ${catalog.capabilities.length} media model capabilities to ${CATALOG_PATH}`);
  console.log(`  Schema version: ${catalog.version}`);
  console.log(`  Generated at: ${catalog.generatedAt}`);

  const byModality = new Map<string, number>();
  for (const c of catalog.capabilities) {
    byModality.set(c.modality, (byModality.get(c.modality) ?? 0) + 1);
  }
  for (const [modality, count] of byModality) {
    console.log(`  ${modality}: ${count} models`);
  }
}