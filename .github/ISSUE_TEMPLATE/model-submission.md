---
name: Submit model capability
about: Add or update a model's capabilities in the media model registry
title: "models: add <provider>/<model>"
labels: ["model-submission"]
---

## Model

- **Model ID**: `provider/model-name` (e.g. `replicate/black-forest-labs/flux-pro`)
- **Provider**: e.g. `replicate`, `fala`, `huggingface`
- **Name**: Human-readable name
- **Modality**: `video` | `audio` | `image`
- **Capability**: `video_generation` | `image_generation` | `audio_generation` | `audio_transcription` | `motion_control`

## Capabilities

| Field | Value | Required |
|---|---|---|
| `aspectRatios` | e.g. `["1:1", "9:16", "16:9"]` | Conditionally (image/video) |
| `durationOptions` | e.g. `["5", "10", "15"]` | Conditionally (video) |
| `maxDurationSeconds` | e.g. `30` | No |
| `qualityOptions` | e.g. `["standard", "hd"]` | No |
| `outputFormats` | e.g. `["mp3", "wav"]` | Conditionally (audio) |
| `generationModes` | e.g. `["fast", "pro"]` | No |
| `supportsReferenceImages` | `true` / `false` | No |
| `supportsCustomVoice` | `true` / `false` | No |
| `inputTypes` | e.g. `["text", "image"]` | Yes |
| `outputTypes` | e.g. `["video"]` | Yes |
| `endpointUrl` | API endpoint URL | Yes |
| `schemaUrl` | API documentation URL | No |

## Verification

- [ ] The model exists and is accessible via the provider's API
- [ ] The capability data is accurate (aspect ratios, durations, formats match the actual API)
- [ ] The `endpointUrl` points to the correct API endpoint
- [ ] The `schemaUrl` points to the model's documentation

## Checklist

- [ ] I have added/modified the entry in `data/media-capabilities.json`
- [ ] I have run `npm run media-capabilities:validate` and it passes
- [ ] I have verified the data renders correctly in the frontend