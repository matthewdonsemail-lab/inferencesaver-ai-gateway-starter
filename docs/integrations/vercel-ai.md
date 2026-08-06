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

Run `npm run sync-models` first, then `npm run example:ai-sdk`. This example exercises text generation through chat completions; it does not claim support for every AI SDK feature.
