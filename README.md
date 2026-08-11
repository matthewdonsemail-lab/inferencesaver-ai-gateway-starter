# InferenceSaver AI Gateway Starter

![InferenceSaver AI Gateway](assets/readme-banner.svg)

A standalone MIT starter for using InferenceSaver from OpenAI-compatible clients, the Anthropic SDK, and the Vercel AI SDK OpenAI-compatible provider.

## What this demonstrates

- One environment-only `INFERENCESAVER_API_KEY`.
- OpenAI-compatible chat completions at `https://api.inferencesaver.com/v1`.
- Anthropic Messages requests at `https://api.inferencesaver.com`.
- Runtime, account-scoped model discovery from `GET /v1/models`.
- Deterministic model refreshes that open pull requests instead of writing directly to `main`.

This starter does not claim full OpenAI or Anthropic compatibility, stable model availability, universal account access, guaranteed savings, latency, or rate limits. Tool use, embeddings, audio, image, video, streaming, JSON mode, and batch support are outside this starter until tested at the application boundary.

## Quick start

Requirements: Node.js 22+ and an InferenceSaver API key.

```bash
cp .env.example .env
npm install
npm run sync-models
# Set each variable only after verifying that model supports that endpoint.
# INFERENCESAVER_OPENAI_MODEL=...
# INFERENCESAVER_ANTHROPIC_MODEL=...
# INFERENCESAVER_AI_SDK_MODEL=...
npm run example:openai
npm run example:anthropic
npm run example:ai-sdk
```

The catalog exposes each model's `supported_endpoint_types` (e.g. `openai`, `anthropic`, `gemini`, `openai-video`) as a capability signal from the upstream account catalog. Each example still requires an independently verified model ID through `INFERENCESAVER_OPENAI_MODEL`, `INFERENCESAVER_ANTHROPIC_MODEL`, or `INFERENCESAVER_AI_SDK_MODEL`; `requireConfiguredModel` rejects IDs absent from the authenticated catalog, and — when the catalog entry lists `supported_endpoint_types` — also rejects a configured model that doesn't support the endpoint the example is about to call. Set credentials and model IDs in your shell or `.env`; never commit `.env`.

## Model catalog

`npm run sync-models` calls the authenticated `/v1/models` endpoint and commits the normalized fields `id`, `object`, `created`, `owned_by`, and `supported_endpoint_types` when present. The raw response stays in process memory and is never written to disk or logged. The generated `data/models.json` is account/key-scoped and should not be treated as a universal catalog. `supported_endpoint_types` reflects only which request shape the gateway routes a model through (chat vs. video vs. Anthropic-native, etc.) as reported upstream — it is not a full capability description (context window, streaming, tool use, and similar remain untested by this starter).

## Integrations

- [OpenAI SDK and compatible clients](docs/integrations/openai.md)
- [Anthropic Python and JavaScript SDKs](docs/integrations/anthropic.md)
- [Vercel AI SDK](docs/integrations/vercel-ai.md)

## Automation

`.github/workflows/sync-models.yml` runs manually or on a schedule, uses the repository secret named `INFERENCESAVER_API_KEY`, and opens a pull request for catalog changes. It never prints the secret and never pushes generated data directly to `main`.

## License

MIT. See [LICENSE](LICENSE).
