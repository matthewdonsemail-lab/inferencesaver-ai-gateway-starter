/** Normalized capability schema for non-LLM media models (video, audio, image).
 *  InferenceSaver's own equivalent of models.dev but focused on the media-model
 *  ecosystem. Each record represents a model as surfaced by one or more
 *  providers (Replicate, Fal.ai, Hugging Face, our own relay). */
export type MediaModelCapability = {
  /** Unique identifier, e.g. "replicate/kandinsky-community/kandinsky-3" */
  id: string;
  /** Human-readable name */
  name: string;
  /** Provider slug (e.g. "replicate", "fala", "huggingface") */
  provider: string;
  /** The underlying lab/model ID, e.g. "black-forest-labs/FLUX.1-pro" */
  modelId: string;
  /** Primary modality: video, audio, or image */
  modality: "video" | "audio" | "image";
  /** Sub-capability: e.g. "video_generation", "image_generation", "audio_generation",
   *  "audio_transcription", "motion_control" */
  capability: string;
  /** Supported aspect ratios (e.g. ["9:16", "16:9", "1:1", "4:5", "3:4", "auto"]) */
  aspectRatios?: string[];
  /** Maximum supported duration in seconds */
  maxDurationSeconds?: number;
  /** Allowed duration options (e.g. ["5", "10", "15"]) */
  durationOptions?: string[];
  /** Supported resolution/quality options (e.g. ["480p", "720p", "1080p", "standard", "hd", "pro"]) */
  qualityOptions?: string[];
  /** Supported output formats (e.g. ["mp3", "wav", "mp4", "png", "jpeg"]) */
  outputFormats?: string[];
  /** Input types accepted (e.g. ["text", "image", "video", "audio"]) */
  inputTypes?: string[];
  /** Output types produced (e.g. ["video", "audio", "image"]) */
  outputTypes?: string[];
  /** Whether reference/guide images are supported */
  supportsReferenceImages?: boolean;
  /** Whether custom voice cloning is supported */
  supportsCustomVoice?: boolean;
  /** Generation modes (e.g. ["fast", "pro", "turbo"]) */
  generationModes?: string[];
  /** Maximum prompt length in characters */
  maxPromptLength?: number;
  /** Supported resolutions as width x height tuples */
  supportedResolutions?: { width: number; height: number }[];
  /** Whether the model requires the provider's own API key vs. going through
   *  InferenceSaver's relay */
  requiresOwnKey?: boolean;
  /** URL to the model's API endpoint */
  endpointUrl?: string;
  /** URL to the model's OpenAPI / schema documentation */
  schemaUrl?: string;
  /** Timestamp of last sync */
  lastSyncedAt?: string;
  /** Source of truth for this record */
  source: "replicate" | "fala" | "huggingface" | "inferencesaver" | "manual";
};

/** The full catalog of media model capabilities */
export type MediaModelCatalog = {
  /** Schema version */
  version: string;
  /** When this catalog was generated */
  generatedAt: string;
  /** All capability records */
  capabilities: MediaModelCapability[];
};