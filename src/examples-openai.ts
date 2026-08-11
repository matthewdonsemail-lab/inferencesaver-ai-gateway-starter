import OpenAI from "openai";
import { requireConfiguredModel } from "./select-model.js";

const apiKey = process.env.INFERENCESAVER_API_KEY;
if (!apiKey) throw new Error("INFERENCESAVER_API_KEY is required");
const model = await requireConfiguredModel("INFERENCESAVER_OPENAI_MODEL", "openai");
const client = new OpenAI({ apiKey, baseURL: "https://api.inferencesaver.com/v1" });
const response = await client.chat.completions.create({
  model,
  messages: [{ role: "user", content: "Reply with the word OK." }],
  max_tokens: 8
});
console.log(JSON.stringify({ ok: true, model: response.model, request_id: response._request_id ?? null }));
