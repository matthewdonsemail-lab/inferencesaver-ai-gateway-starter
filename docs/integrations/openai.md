# OpenAI SDK

Use the OpenAI base URL with `/v1`. The key remains in `INFERENCESAVER_API_KEY`.

```ts
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.INFERENCESAVER_API_KEY,
  baseURL: "https://api.inferencesaver.com/v1"
});
```

Run `npm run sync-models` first, then `npm run example:openai`. The example selects the first deterministic account-scoped model and sends a minimal `POST /v1/chat/completions` request. It logs status metadata and request ID only, not response content.
