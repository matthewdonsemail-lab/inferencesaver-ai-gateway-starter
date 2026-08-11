import Anthropic from "@anthropic-ai/sdk";
import { requireConfiguredModel } from "./select-model.js";

const apiKey = process.env.INFERENCESAVER_API_KEY;
if (!apiKey) throw new Error("INFERENCESAVER_API_KEY is required");
const model = await requireConfiguredModel("INFERENCESAVER_ANTHROPIC_MODEL", "anthropic");
const client = new Anthropic({ apiKey, baseURL: "https://api.inferencesaver.com" });
const response = await client.messages.create({
  model,
  max_tokens: 8,
  messages: [{ role: "user", content: "Reply with the word OK." }]
});
console.log(JSON.stringify({ ok: true, model: response.model, request_id: response._request_id ?? null }));
