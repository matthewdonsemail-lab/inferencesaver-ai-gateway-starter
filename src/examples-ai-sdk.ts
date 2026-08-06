import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText } from "ai";
import { requireConfiguredModel } from "./select-model.js";

const apiKey = process.env.INFERENCESAVER_API_KEY;
if (!apiKey) throw new Error("INFERENCESAVER_API_KEY is required");
const model = await requireConfiguredModel("INFERENCESAVER_AI_SDK_MODEL");
const inferencesaver = createOpenAICompatible({
  name: "inferencesaver",
  apiKey,
  baseURL: "https://api.inferencesaver.com/v1"
});
const result = await generateText({
  model: inferencesaver(model),
  prompt: "Reply with the word OK.",
  maxOutputTokens: 8
});
console.log(JSON.stringify({ ok: true, model, finish_reason: result.finishReason }));
