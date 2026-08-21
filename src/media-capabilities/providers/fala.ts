import type { MediaModelCapability } from "../schema.js";

const FAL_API_BASE = "https://fal.run";

/** Fal.ai model endpoints known to handle media generation. The OpenAPI
 *  schemas aren't served at the API level, so we capture capabilities from
 *  known model specs directly. */
const FAL_ENDPOINTS: Array<{
  path: string;
  modality: "video" | "audio" | "image";
  capability: string;
  name: string;
  aspectRatios?: string[];
  qualityOptions?: string[];
  durationOptions?: string[];
  outputFormats?: string[];
  generationModes?: string[];
  supportsReferenceImages?: boolean;
}> = [
  // Image
  { path: "fal-ai/flux-pro", modality: "image", capability: "image_generation", name: "Flux Pro", aspectRatios: ["1:1", "9:16", "16:9", "4:5", "3:4", "21:9"] },
  { path: "fal-ai/flux-pro/v1.1", modality: "image", capability: "image_generation", name: "Flux Pro v1.1", aspectRatios: ["1:1", "9:16", "16:9", "4:5", "3:4"] },
  { path: "fal-ai/flux-pro/v1.1-ultra", modality: "image", capability: "image_generation", name: "Flux Pro Ultra", aspectRatios: ["1:1", "9:16", "16:9", "4:5", "3:4"] },
  { path: "fal-ai/flux-dev", modality: "image", capability: "image_generation", name: "Flux Dev", aspectRatios: ["1:1", "9:16", "16:9", "4:5", "3:4"] },
  { path: "fal-ai/flux-schnell", modality: "image", capability: "image_generation", name: "Flux Schnell", aspectRatios: ["1:1", "9:16", "16:9", "4:5", "3:4"] },
  { path: "fal-ai/stable-diffusion-v3-medium", modality: "image", capability: "image_generation", name: "SD3 Medium", aspectRatios: ["1:1", "9:16", "16:9", "4:5", "3:4"] },
  { path: "fal-ai/stable-diffusion-xl", modality: "image", capability: "image_generation", name: "SDXL", aspectRatios: ["1:1", "9:16", "16:9", "4:5", "3:4"] },
  { path: "fal-ai/ideogram", modality: "image", capability: "image_generation", name: "Ideogram", aspectRatios: ["1:1", "9:16", "16:9", "4:5", "3:4"] },
  { path: "fal-ai/ideogram/v2", modality: "image", capability: "image_generation", name: "Ideogram v2", aspectRatios: ["1:1", "9:16", "16:9", "4:5", "3:4"] },
  { path: "fal-ai/recraft-v3", modality: "image", capability: "image_generation", name: "Recraft v3", aspectRatios: ["1:1", "9:16", "16:9", "4:5", "3:4"] },
  // Video
  { path: "fal-ai/minimax-video", modality: "video", capability: "video_generation", name: "MiniMax Video", aspectRatios: ["9:16", "16:9", "1:1"], durationOptions: ["5", "10", "15"] },
  { path: "fal-ai/cogvideox-5b", modality: "video", capability: "video_generation", name: "CogVideoX 5B", aspectRatios: ["9:16", "16:9", "1:1"], durationOptions: ["4", "6", "8"] },
  { path: "fal-ai/hunyuan-video", modality: "video", capability: "video_generation", name: "Hunyuan Video", aspectRatios: ["9:16", "16:9", "1:1"], durationOptions: ["5", "10", "15"] },
  { path: "fal-ai/kling-video", modality: "video", capability: "video_generation", name: "Kling Video", aspectRatios: ["9:16", "16:9", "1:1"], durationOptions: ["5"], qualityOptions: ["standard", "pro"] },
  { path: "fal-ai/kling-video/v1.5", modality: "video", capability: "video_generation", name: "Kling Video v1.5", aspectRatios: ["9:16", "16:9", "1:1"], durationOptions: ["5", "10"], qualityOptions: ["standard", "pro"] },
  { path: "fal-ai/veo-3", modality: "video", capability: "video_generation", name: "Veo 3", aspectRatios: ["16:9", "1:1", "9:16"], durationOptions: ["5", "10", "15"] },
  { path: "fal-ai/luma-sorcerer", modality: "video", capability: "video_generation", name: "Luma Sorcerer", aspectRatios: ["9:16", "16:9", "1:1"] },
  { path: "fal-ai/runway-gen3", modality: "video", capability: "video_generation", name: "Runway Gen3", aspectRatios: ["9:16", "16:9", "1:1"] },
  { path: "fal-ai/stable-video-diffusion", modality: "video", capability: "video_generation", name: "SVD", aspectRatios: ["9:16", "16:9", "1:1"] },
  // Audio
  { path: "fal-ai/playht-text-to-speech", modality: "audio", capability: "audio_generation", name: "PlayHT TTS", outputFormats: ["mp3", "wav"] },
  { path: "fal-ai/fish-speech", modality: "audio", capability: "audio_generation", name: "Fish Speech", outputFormats: ["mp3", "wav"], supportsReferenceImages: true },
  { path: "fal-ai/whisper", modality: "audio", capability: "audio_transcription", name: "Whisper", outputFormats: ["text", "json", "srt", "vtt"] },
  { path: "fal-ai/musicgen", modality: "audio", capability: "audio_generation", name: "MusicGen", outputFormats: ["mp3", "wav"] },
  { path: "fal-ai/suno-music", modality: "audio", capability: "audio_generation", name: "Suno Music", outputFormats: ["mp3", "wav"] },
];

export async function fetchFalCapabilities(
  apiKey?: string,
): Promise<MediaModelCapability[]> {
  return FAL_ENDPOINTS.map((ep) => ({
    id: `fala/${ep.path}`,
    name: ep.name,
    provider: "fala" as const,
    modelId: ep.path,
    modality: ep.modality as "video" | "audio" | "image",
    capability: ep.capability,
    aspectRatios: ep.aspectRatios,
    durationOptions: ep.durationOptions,
    qualityOptions: ep.qualityOptions,
    outputFormats: ep.outputFormats,
    generationModes: ep.generationModes,
    supportsReferenceImages: ep.supportsReferenceImages,
    inputTypes: ep.modality === "image" ? ["text", "image"] : ["text", "image", "video"],
    outputTypes: [ep.modality],
    endpointUrl: `${FAL_API_BASE}/${ep.path}`,
    schemaUrl: `https://fal.ai/models/${ep.path}`,
    source: "fala" as const,
    lastSyncedAt: new Date().toISOString(),
  } satisfies MediaModelCapability));
}