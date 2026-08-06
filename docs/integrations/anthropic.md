# Anthropic SDK

Use the gateway host without `/v1`; the Anthropic SDK appends `/v1/messages`.

```ts
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.INFERENCESAVER_API_KEY,
  baseURL: "https://api.inferencesaver.com"
});
```

Run `npm run sync-models`, set `INFERENCESAVER_ANTHROPIC_MODEL` to a model independently verified for Messages, then run `npm run example:anthropic`. The example verifies that the ID is in the account-scoped catalog. Availability depends on the models enabled for the key; this starter does not infer compatibility from model names or claim full Anthropic API compatibility.
