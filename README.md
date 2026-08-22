<div align="center">
  <img src="assets/readme-banner.svg" alt="InferenceSaver AI Gateway Starter" width="600" />
</div>

<h1 align="center">InferenceSaver AI Gateway Starter</h1>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#usage">Usage</a> •
  <a href="#configuration">Configuration</a> •
  <a href="#media-model-capabilities">Media Capabilities</a>
</p>

---

## Features

- **OpenAI-compatible client** — drop-in replacement for `openai`, `@ai-sdk/openai`, and `@anthropic-ai/sdk`
- **Zero credential risk** — your API key stays on your machine; the starter never sends it elsewhere
- **Model catalog** — syncs available models on startup via `GET /v1/models`
- **Pricing catalog** — fetches live pricing from the public endpoint
- **Model selection** — pick the best model for a task based on capability, pricing, and availability
- **Media Model Capabilities** — watchdog aggregator that inspects video, audio, and image generation models across providers (Replicate, Fal.ai, Hugging Face)

## Quick Start

```bash
# Clone
git clone https://github.com/matthewdonsemail-lab/inferencesaver-ai-gateway-starter.git
cd inferencesaver-ai-gateway-starter

# Install
npm install

# Set your API key
export INFERENCESAVER_API_KEY="your-key-here"

# Run the smoke test
npm run smoke

# Sync the model catalog
npm run sync-models
```

## Usage

### OpenAI-compatible example

```typescript
import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://api.inferencesaver.com/v1",
  apiKey: process.env.INFERENCESAVER_API_KEY,
});

const completion = await client.chat.completions.create({
  model: "gpt-5.4",
  messages: [{ role: "user", content: "Hello!" }],
});
```

### AI SDK example

```typescript
import { generateText } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

const provider = createOpenAICompatible({
  baseURL: "https://api.inferencesaver.com/v1",
  apiKey: process.env.INFERENCESAVER_API_KEY,
});

const result = await generateText({
  model: provider("gpt-5.4"),
  prompt: "Hello!",
});
```

## Configuration

| Variable | Required | Default | Description |
|---|---|---|---|
| `INFERENCESAVER_API_KEY` | Yes | — | Your InferenceSaver API key |
| `INFERENCESAVER_API_BASE_URL` | No | `https://api.inferencesaver.com` | API base URL |

## Media Model Capabilities

InferenceSaver maintains a **live model capability registry** for non-LLM models (video, audio, image generation). It aggregates capability metadata from:

- **InferenceSaver** — 17 native media models
- **Replicate** — 200+ models across 8 collections (text-to-video, text-to-image, audio, etc.)
- **Fal.ai** — 24 video/image/audio generation endpoints
- **Hugging Face** — 36 models across 12 pipeline tags

The capabilities are synced every 6 hours and include:
- Supported aspect ratios (9:16, 16:9, 1:1, etc.)
- Available durations
- Quality/resolution options
- Output formats
- Generation modes
- Reference image support
- Custom voice support
- Input/output types
- API endpoint URLs
- Schema documentation links

### Live Page

**[View the Media Model Capability Registry →](https://matthewdonsemail-lab.github.io/inferencesaver-ai-gateway-starter/)**

### Local Development

To run the aggregator locally:

```bash
# Set provider API keys (optional, without them you get InferenceSaver models only)
export REPLICATE_API_TOKEN="your-replicate-token"
export FAL_API_KEY="your-fal-key"
export HF_API_KEY="your-hf-key"

# Aggregate capabilities
npm run media-capabilities:aggregate

# Start the local server
npm run media-capabilities:serve
```

### Sync on demand

```bash
npm run sync-media-capabilities
```

### GitHub Actions

The capability registry is automatically synced every 6 hours via the `sync-media-capabilities.yml` workflow and deployed to GitHub Pages. You can also trigger it manually from the Actions tab. To add provider API keys, set the following repository secrets:

- `REPLICATE_API_TOKEN`
- `FAL_API_KEY`
- `HF_API_KEY`

---

## Submitting Model Capabilities

We welcome contributions from model providers. To add or update models in the registry:

1. **Fork the repository** and create a new branch
2. **Edit `data/media-capabilities.json`** — add your model entry following the schema in `src/media-capabilities/schema.ts`
3. **Run the validator**:
   ```bash
   npm run media-capabilities:validate
   ```
4. **Open a pull request** — the PR Checker workflow will automatically:
   - Validate the schema and data format
   - Check provider API connectivity (if API keys are configured)
   - Comment the validation results on the PR
   - Create a check with pass/fail status

### What the PR Checker validates

| Check | Description |
|---|---|
| Schema | Required fields exist (`id`, `provider`, `modelId`, `modality`, `capability`) |
| Modality | Must be one of `video`, `audio`, `image` |
| Capability | Must be one of `video_generation`, `image_generation`, `audio_generation`, `audio_transcription`, `motion_control` |
| Aspect ratios | Validated against common formats (`1:1`, `9:16`, `16:9`, `4:5`, `3:4`, `21:9`, `auto`) |
| Durations | Must be numeric, 1–3600s |
| Quality options | Validated against standard patterns (`480p`, `720p`, `standard`, `hd`, `pro`, etc.) |
| Consistency | Image models should have `aspectRatios`; audio models should have `outputFormats` |
| Duplicates | Duplicate `(provider, id)` pairs are flagged |
| API connectivity | Replicate, Fal.ai, and Hugging Face endpoints are tested (if secrets are set) |

### PR template

When submitting, use the [model submission template](.github/ISSUE_TEMPLATE/model-submission.md) to ensure all required information is included.

---

---

## API

The media capability registry is available as a **REST API**. You can either run it locally or use the static API snapshots on GitHub Pages.

### Live API Server

```bash
# Start the API server
npm run media-capabilities:serve

# It runs on http://localhost:3001
```

### Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | Frontend page (models.dev-style UI) |
| `GET` | `/api/media-capabilities` | List capabilities with optional filters |
| `GET` | `/api/media-capabilities/stats` | Summary statistics |
| `GET` | `/api/media-capabilities/providers` | Provider list with model counts |
| `GET` | `/api/media-capabilities/{id}` | Single capability by URL-encoded ID |

### Query Parameters (`/api/media-capabilities`)

| Param | Type | Default | Description |
|---|---|---|---|
| `modality` | `video\|audio\|image` | — | Filter by modality |
| `provider` | `replicate\|fala\|huggingface\|inferencesaver` | — | Filter by provider |
| `capability` | `video_generation\|image_generation\|audio_generation\|audio_transcription\|motion_control` | — | Filter by capability type |
| `q` | string | — | Search by name, ID, provider, or capability |
| `limit` | number | `100` | Results per page (max 500) |
| `offset` | number | `0` | Pagination offset |
| `sort` | `name\|modality\|provider\|capability` | `name` | Sort field |
| `order` | `asc\|desc` | `asc` | Sort order |
| `fields` | comma-separated | all | Project specific fields only |

### Examples

```bash
# Get all video generation models
curl "http://localhost:3001/api/media-capabilities?modality=video"

# Search for Replicate Flux models
curl "http://localhost:3001/api/media-capabilities?q=flux&provider=replicate"

# Get audio models with pagination
curl "http://localhost:3001/api/media-capabilities?modality=audio&limit=10&offset=0"

# Get only ID and name fields
curl "http://localhost:3001/api/media-capabilities?fields=id,name,modality,provider"

# Get a single model by ID
curl "http://localhost:3001/api/media-capabilities/replicate%2Fblack-forest-labs%2FFLUX.1-pro"

# Summary statistics
curl "http://localhost:3001/api/media-capabilities/stats"

# Provider list
curl "http://localhost:3001/api/media-capabilities/providers"
```

### Static API (GitHub Pages)

The same data is available as pre-computed static JSON on GitHub Pages — no server needed:

```
https://matthewdonsemail-lab.github.io/inferencesaver-ai-gateway-starter/api/media-capabilities.json
https://matthewdonsemail-lab.github.io/inferencesaver-ai-gateway-starter/api/stats.json
https://matthewdonsemail-lab.github.io/inferencesaver-ai-gateway-starter/api/providers.json
https://matthewdonsemail-lab.github.io/inferencesaver-ai-gateway-starter/api/modality/video.json
https://matthewdonsemail-lab.github.io/inferencesaver-ai-gateway-starter/api/modality/audio.json
https://matthewdonsemail-lab.github.io/inferencesaver-ai-gateway-starter/api/modality/image.json
https://matthewdonsemail-lab.github.io/inferencesaver-ai-gateway-starter/api/provider/replicate.json
https://matthewdonsemail-lab.github.io/inferencesaver-ai-gateway-starter/api/provider/fala.json
https://matthewdonsemail-lab.github.io/inferencesaver-ai-gateway-starter/api/provider/huggingface.json
https://matthewdonsemail-lab.github.io/inferencesaver-ai-gateway-starter/api/provider/inferencesaver.json
https://matthewdonsemail-lab.github.io/inferencesaver-ai-gateway-starter/api/search-index.json
```

These are updated every 6 hours via the sync workflow.

### Response Shape

```json
{
  "version": "0.1.0",
  "generatedAt": "2026-08-21T11:00:41.514Z",
  "total": 300,
  "count": 100,
  "limit": 100,
  "offset": 0,
  "capabilities": [
    {
      "id": "replicate/black-forest-labs/FLUX.1-pro",
      "name": "FLUX.1-pro",
      "provider": "replicate",
      "modelId": "black-forest-labs/FLUX.1-pro",
      "modality": "image",
      "capability": "image_generation",
      "aspectRatios": ["1:1", "9:16", "16:9", "4:5", "3:4", "21:9"],
      "qualityOptions": ["standard", "pro"],
      "outputFormats": ["png", "jpeg"],
      "inputTypes": ["text"],
      "outputTypes": ["image"],
      "endpointUrl": "https://api.replicate.com/v1/models/black-forest-labs/FLUX.1-pro/predictions",
      "source": "replicate",
      "lastSyncedAt": "2026-08-21T10:59:47.136Z"
    }
  ]
}
```

### CORS

All API endpoints return `Access-Control-Allow-Origin: *`, so you can call them from any browser application.

---

<p align="center">
  <sub>Built by <a href="https://inferencesaver.com">InferenceSaver</a></sub>
</p>