import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { toml } from "./toml.js";
import type { MergedModelRecord } from "./model-catalog.js";

// Gateway model id -> models.dev lab model (models/<lab>/<id>.toml).
// Only for models whose underlying lab model exists in models.dev today.
export const BASE_MODELS: Record<string, string> = {
  "claude-fable-5": "anthropic/claude-fable-5",
  "claude-haiku-4-5-20251001": "anthropic/claude-haiku-4-5-20251001",
  "claude-opus-4-6": "anthropic/claude-opus-4-6",
  "claude-opus-4-7": "anthropic/claude-opus-4-7",
  "claude-opus-4-8": "anthropic/claude-opus-4-8",
  "claude-opus-5": "anthropic/claude-opus-5",
  "claude-sonnet-4-6": "anthropic/claude-sonnet-4-6",
  "claude-sonnet-5": "anthropic/claude-sonnet-5",
  "deepseek-v4-flash": "deepseek/deepseek-v4-flash",
  "gemini-3.1-pro-preview": "google/gemini-3.1-pro-preview",
  "gemini-3.5-flash": "google/gemini-3.5-flash",
  "glm-5.2": "zhipuai/glm-5.2",
  "gpt-5.4": "openai/gpt-5.4",
  "gpt-5.4-mini": "openai/gpt-5.4-mini",
  "gpt-5.5": "openai/gpt-5.5",
  "gpt-5.6-luna": "openai/gpt-5.6-luna",
  "gpt-5.6-sol": "openai/gpt-5.6-sol",
  "gpt-5.6-terra": "openai/gpt-5.6-terra",
  "gpt-image-2": "openai/gpt-image-2",
  "grok-4.5": "xai/grok-4.5",
  "grok-imagine-video": "xai/grok-imagine-video-1.5",
  "kimi-k3": "moonshotai/kimi-k3",
  "veo-3.1": "google/veo-3.1-generate-preview",
};

// models.dev requires explicit reasoning_options on any provider model
// whose merged base declares reasoning = true. Copied from same-surface
// peers (lab + relay gateways); verify against the live gateway before PR.
export const REASONING_OPTIONS: Record<string, string[]> = {
  "claude-fable-5": ['{ type = "toggle" }', '{ type = "budget_tokens", min = 1_024, max = 63_999 }'],
  "claude-haiku-4-5-20251001": ['{ type = "toggle" }', '{ type = "budget_tokens", min = 1_024, max = 63_999 }'],
  "claude-opus-4-6": ['{ type = "toggle" }', '{ type = "budget_tokens", min = 1_024, max = 63_999 }'],
  "claude-opus-4-7": ['{ type = "toggle" }', '{ type = "budget_tokens", min = 1_024, max = 63_999 }'],
  "claude-opus-4-8": ['{ type = "toggle" }', '{ type = "budget_tokens", min = 1_024, max = 63_999 }'],
  "claude-opus-5": ['{ type = "toggle" }', '{ type = "budget_tokens", min = 1_024, max = 63_999 }'],
  "claude-sonnet-4-6": ['{ type = "toggle" }', '{ type = "budget_tokens", min = 1_024, max = 63_999 }'],
  "claude-sonnet-5": ['{ type = "toggle" }', '{ type = "budget_tokens", min = 1_024, max = 63_999 }'],
  "deepseek-v4-flash": ['{ type = "toggle" }', '{ type = "effort", values = ["high", "max"] }'],
  "gemini-3.1-pro-preview": ['{ type = "toggle" }', '{ type = "effort", values = ["low", "medium", "high"] }'],
  "gemini-3.5-flash": ['{ type = "toggle" }', '{ type = "effort", values = ["low", "medium", "high"] }'],
  "glm-5.2": ['{ type = "toggle" }', '{ type = "effort", values = ["low", "medium", "high"] }'],
  "gpt-5.4": ['{ type = "toggle" }', '{ type = "effort", values = ["low", "medium", "high"] }'],
  "gpt-5.4-mini": ['{ type = "toggle" }', '{ type = "effort", values = ["low", "medium", "high"] }'],
  "gpt-5.5": ['{ type = "toggle" }', '{ type = "effort", values = ["low", "medium", "high"] }'],
  "gpt-5.6-luna": ['{ type = "toggle" }', '{ type = "effort", values = ["low", "medium", "high"] }'],
  "gpt-5.6-sol": ['{ type = "toggle" }', '{ type = "effort", values = ["low", "medium", "high"] }'],
  "gpt-5.6-terra": ['{ type = "toggle" }', '{ type = "effort", values = ["low", "medium", "high"] }'],
  "grok-4.5": ['{ type = "toggle" }', '{ type = "effort", values = ["low", "medium", "high"] }'],
  "kimi-k3": ['{ type = "toggle" }', '{ type = "effort", values = ["low", "medium", "high"] }'],
};

// Gateway models that are unique to InferenceSaver (no lab model in
// models.dev) get a full inline definition. Facts that the public pricing
// catalog cannot provide (release_date, booleans) are set conservatively
// and MUST be reviewed before the submission PR is opened.
export const UNIQUE_MODELS: Record<string, { name: string; description: string; family?: string }> = {
  "agnes-2.0-flash": {
    name: "Agnes 2.0 Flash",
    description: "Fast general chat model served by InferenceSaver over an OpenAI-compatible API.",
  },
  "agnes-2.5-flash": {
    name: "Agnes 2.5 Flash",
    description: "Fast general chat model served by InferenceSaver over an OpenAI-compatible API.",
  },
  "agnes-image-2.1-flash": {
    name: "Agnes Image 2.1 Flash",
    description: "Image generation model served by InferenceSaver over an OpenAI-compatible API.",
  },
  "agnes-video-v2.0": {
    name: "Agnes Video 2.0",
    description: "Video generation model served by InferenceSaver over an OpenAI-compatible API.",
  },
  "gpt-5.5-openai-compact": {
    name: "GPT-5.5 OpenAI Compact",
    description: "Compact-context GPT-5.5 variant served by InferenceSaver over an OpenAI-compatible API.",
    family: "gpt",
  },
  "Hunyuan-MT": {
    name: "Hunyuan MT",
    description: "Multilingual chat model served by InferenceSaver over an OpenAI-compatible API.",
    family: "hunyuan",
  },
  "mimo-v2.5-tts": {
    name: "MiMo 2.5 TTS",
    description: "Text-to-speech model served by InferenceSaver over an OpenAI-compatible API.",
    family: "mimo",
  },
  "music-2.6": {
    name: "Music 2.6",
    description: "Music generation model served by InferenceSaver over an OpenAI-compatible API.",
  },
  "music-2.6-free": {
    name: "Music 2.6 Free",
    description: "Music generation model served by InferenceSaver over an OpenAI-compatible API.",
  },
  "music-cover": {
    name: "Music Cover",
    description: "Music cover generation model served by InferenceSaver over an OpenAI-compatible API.",
  },
  "music-cover-free": {
    name: "Music Cover Free",
    description: "Music cover generation model served by InferenceSaver over an OpenAI-compatible API.",
  },
  "Nano-Banana": {
    name: "Nano Banana",
    description: "Image generation model served by InferenceSaver over an OpenAI-compatible API.",
    family: "nano-banana",
  },
  "nano-banana-2": {
    name: "Nano Banana 2",
    description: "Image generation model served by InferenceSaver over an OpenAI-compatible API.",
    family: "nano-banana",
  },
};

const CAPABILITY_MODALITIES: Record<string, { input: string[]; output: string[] }> = {
  chat: { input: ["text"], output: ["text"] },
  image: { input: ["text"], output: ["image"] },
  video: { input: ["text"], output: ["video"] },
  audio: { input: ["text"], output: ["audio"] },
};

// Models.dev requires release_date / last_updated as YYYY-MM or YYYY-MM-DD.
// We cannot know the true first-release date from the pricing catalog, so we
// stamp today and flag it for review. Override with MODELSDEV_RELEASE_DATE.
const RELEASE_DATE = process.env.MODELSDEV_RELEASE_DATE ?? new Date().toISOString().slice(0, 10);

export function modelToml(model: MergedModelRecord): { file: string; toml: string } {
  const base = BASE_MODELS[model.id];
  const costFields: Array<[string, number]> = [];
  if (model.inputPricePerMillionUsd !== undefined) costFields.push(["input", model.inputPricePerMillionUsd]);
  if (model.outputPricePerMillionUsd !== undefined) costFields.push(["output", model.outputPricePerMillionUsd]);
  if (model.cacheReadPricePerMillionUsd !== undefined && model.cacheReadPricePerMillionUsd > 0)
    costFields.push(["cache_read", model.cacheReadPricePerMillionUsd]);
  if (model.cacheWritePricePerMillionUsd !== undefined && model.cacheWritePricePerMillionUsd > 0)
    costFields.push(["cache_write", model.cacheWritePricePerMillionUsd]);

  const limitFields: Array<[string, number]> = [];
  if (model.contextWindow !== undefined) limitFields.push(["context", model.contextWindow]);
  if (model.maxOutputTokens !== undefined) limitFields.push(["output", model.maxOutputTokens]);

  if (base) {
    // Override-only: base_model inherits model-only facts; provider file
    // keeps only provider-specific cost, limits, and reasoning options.
    const reasoningLines =
      REASONING_OPTIONS[model.id] !== undefined
        ? [`reasoning_options = [${REASONING_OPTIONS[model.id].join(", ")}]`]
        : [];
    return {
      file: `${model.id}.toml`,
      toml: toml(
        [["base_model", base]],
        {
          cost: costFields,
          limit: limitFields,
        },
        reasoningLines,
      ),
    };
  }

  const facts = UNIQUE_MODELS[model.id];
  if (!facts) throw new Error(`No models.dev definition for ${model.id}: add it to BASE_MODELS or UNIQUE_MODELS`);
  const modalities = CAPABILITY_MODALITIES[model.capability ?? "chat"] ?? CAPABILITY_MODALITIES.chat;
  const top: Array<[string, string | boolean]> = [
    ["name", facts.name],
    ["description", facts.description],
    ["attachment", false],
    ["reasoning", false],
    ["tool_call", true],
    ["release_date", RELEASE_DATE],
    ["last_updated", RELEASE_DATE],
    ["open_weights", false],
  ];
  if (facts.family) top.push(["family", facts.family]);
  return {
    file: `${model.id}.toml`,
    toml: toml(
      top,
      {
        cost: costFields,
        limit: limitFields,
        modalities: [
          ["input", modalities.input],
          ["output", modalities.output],
        ],
      },
    ),
  };
}

export function providerToml(): string {
  return toml([
    ["name", "InferenceSaver"],
    ["npm", "@ai-sdk/openai-compatible"],
    ["api", "https://api.inferencesaver.com/v1"],
    ["doc", "https://inferencesaver.com/en/models"],
    ["env", ["INFERENCESAVER_API_KEY"]],
  ]);
}

export const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
  <!-- Placeholder logo for the InferenceSaver provider. Replace with the
       official mark before submitting (currentColor only, no fixed size). -->
  <path d="M12 2 3 14h6l-1 8L19 10h-6l-1-8z"/>
</svg>
`;

export async function exportModelsDev(catalogPath = "data/models.json", outDir = "modelsdev") {
  const catalog = JSON.parse(await readFile(catalogPath, "utf8")) as { data: MergedModelRecord[] };
  const providerDir = join(outDir, "inferencesaver");
  const modelsDir = join(providerDir, "models");
  await mkdir(modelsDir, { recursive: true });
  await writeFile(join(providerDir, "provider.toml"), providerToml(), "utf8");
  await writeFile(join(providerDir, "logo.svg"), LOGO_SVG, "utf8");
  for (const model of catalog.data) {
    const { file, toml: content } = modelToml(model);
    await writeFile(join(modelsDir, file), content, "utf8");
  }
  const review = [
    "# models.dev submission — review checklist",
    "",
    `Generated ${catalog.data.length} model files for provider \`inferencesaver\`.`,
    "",
    "- `release_date` / `last_updated` are stamped with the generation date and MUST be corrected.",
    "- Boolean facts for unique models (attachment, reasoning, tool_call, open_weights) are conservative defaults; verify each.",
    "- `logo.svg` is a placeholder — replace with the official mark.",
    "- Verify `bun validate` passes in a models.dev checkout before opening the PR.",
    "",
  ].join("\n");
  await writeFile(join(outDir, "REVIEW.md"), review, "utf8");
  return catalog.data.length;
}

if (import.meta.url === `file://${process.argv[1]?.replaceAll("\\\\", "/")}`) {
  const count = await exportModelsDev();
  console.log(`Wrote models.dev provider tree for ${count} models to modelsdev/`);
}
