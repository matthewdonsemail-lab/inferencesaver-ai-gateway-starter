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

Requirements: Node.js 20+ and an InferenceSaver API key.

```bash
cp .env.example .env
npm install
npm run sync-models
npm run example:openai
npm run example:anthropic
npm run example:ai-sdk
```

The examples select a model from the authenticated catalog. They fail clearly when the catalog is empty or no model supports the requested endpoint. Set `INFERENCESAVER_API_KEY` in your shell or `.env`; never commit `.env`.

## Model catalog

`npm run sync-models` calls the authenticated `/v1/models` endpoint and commits only the normalized fields `id`, `object`, `created`, and `owned_by` when present. The raw response stays in process memory and is never written to disk or logged. The generated `data/models.json` is account/key-scoped and should not be treated as a universal catalog.

## Integrations

- [OpenAI SDK and compatible clients](docs/integrations/openai.md)
- [Anthropic Python and JavaScript SDKs](docs/integrations/anthropic.md)
- [Vercel AI SDK](docs/integrations/vercel-ai.md)

## Automation

`.github/workflows/sync-models.yml` runs manually or on a schedule, uses the repository secret named `INFERENCESAVER_API_KEY`, and opens a pull request for catalog changes. It never prints the secret and never pushes generated data directly to `main`.

## License

MIT. See [LICENSE](LICENSE).
