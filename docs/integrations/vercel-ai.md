# Vercel AI SDK

Use `@ai-sdk/openai-compatible` against the OpenAI-compatible base URL.

```ts
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

const inferencesaver = createOpenAICompatible({
  name: "inferencesaver",
  apiKey: process.env.INFERENCESAVER_API_KEY,
  baseURL: "https://api.inferencesaver.com/v1"
});
```

Run `npm run sync-models`, set `INFERENCESAVER_AI_SDK_MODEL` to a model independently verified for chat completions, then run `npm run example:ai-sdk`. The example verifies that the ID is in the account-scoped catalog. It exercises text generation through chat completions and does not claim support for every AI SDK feature.
