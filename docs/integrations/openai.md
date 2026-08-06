# OpenAI SDK

Use the OpenAI base URL with `/v1`. The key remains in `INFERENCESAVER_API_KEY`.

```ts
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.INFERENCESAVER_API_KEY,
  baseURL: "https://api.inferencesaver.com/v1"
});
```

Run `npm run sync-models`, set `INFERENCESAVER_OPENAI_MODEL` to a model independently verified for chat completions, then run `npm run example:openai`. The example verifies that the ID is in the account-scoped catalog and sends a minimal `POST /v1/chat/completions` request. It logs model and request ID metadata only, not response content.
