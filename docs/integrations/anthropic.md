# Anthropic SDK

Use the gateway host without `/v1`; the Anthropic SDK appends `/v1/messages`.

```ts
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.INFERENCESAVER_API_KEY,
  baseURL: "https://api.inferencesaver.com"
});
```

Run `npm run sync-models` first, then `npm run example:anthropic`. Availability depends on the models enabled for the key. This starter demonstrates the Messages endpoint only and does not claim full Anthropic API compatibility.
