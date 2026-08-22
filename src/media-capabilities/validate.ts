import { readFile } from "node:fs/promises";
import type { MediaModelCapability, MediaModelCatalog } from "../media-capabilities/schema.js";

export type ValidationIssue = {
  severity: "error" | "warning";
  model: string;
  field: string;
  message: string;
};

export type ValidationResult = {
  valid: boolean;
  total: number;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  checkedAt: string;
};

const VALID_MODALITIES = new Set(["video", "audio", "image"]);
const VALID_CAPABILITIES = new Set([
  "video_generation",
  "image_generation",
  "audio_generation",
  "audio_transcription",
  "motion_control",
]);

const VALID_ASPECT_RATIOS = new Set([
  "1:1",
  "9:16",
  "16:9",
  "4:5",
  "3:4",
  "21:9",
  "auto",
]);

function validateModel(model: MediaModelCapability, issues: ValidationIssue[]) {
  const label = model.id || model.name || "unknown";

  if (!model.id) {
    issues.push({ severity: "error", model: label, field: "id", message: "Missing required `id`" });
  }
  if (!model.provider) {
    issues.push({ severity: "error", model: label, field: "provider", message: "Missing required `provider`" });
  }
  if (!model.modelId) {
    issues.push({ severity: "error", model: label, field: "modelId", message: "Missing required `modelId`" });
  }
  if (!model.capability) {
    issues.push({ severity: "error", model: label, field: "capability", message: "Missing required `capability`" });
  } else if (!VALID_CAPABILITIES.has(model.capability)) {
    issues.push({
      severity: "warning",
      model: label,
      field: "capability",
      message: `Unknown capability "${model.capability}" — expected one of: ${[...VALID_CAPABILITIES].join(", ")}`,
    });
  }
  if (model.modality && !VALID_MODALITIES.has(model.modality)) {
    issues.push({
      severity: "error",
      model: label,
      field: "modality",
      message: `Invalid modality "${model.modality}" — expected one of: ${[...VALID_MODALITIES].join(", ")}`,
    });
  }

  if (model.aspectRatios?.length) {
    for (const ratio of model.aspectRatios) {
      if (!VALID_ASPECT_RATIOS.has(ratio)) {
        issues.push({
          severity: "warning",
          model: label,
          field: "aspectRatios",
          message: `Unusual aspect ratio "${ratio}" — expected one of: ${[...VALID_ASPECT_RATIOS].join(", ")}`,
        });
      }
    }
  }

  if (model.durationOptions?.length) {
    for (const duration of model.durationOptions) {
      const seconds = Number(duration);
      if (Number.isNaN(seconds) || seconds <= 0 || seconds > 3600) {
        issues.push({
          severity: "warning",
          model: label,
          field: "durationOptions",
          message: `Suspicious duration "${duration}" (expected 1–3600s)`,
        });
      }
    }
  }

  if (model.qualityOptions?.length) {
    for (const quality of model.qualityOptions) {
      if (!/^\d{3,4}p$|^(standard|hd|pro|fast|turbo|ultra)$|^\d{3,4}x\d{3,4}$/i.test(quality)) {
        issues.push({
          severity: "warning",
          model: label,
          field: "qualityOptions",
          message: `Unusual quality option "${quality}"`,
        });
      }
    }
  }

  // Consistency: image models should have aspect ratios; audio should have formats
  if (model.modality === "image" && !model.aspectRatios?.length) {
    issues.push({
      severity: "warning",
      model: label,
      field: "aspectRatios",
      message: "Image models typically expose supported aspect ratios",
    });
  }
  if (model.modality === "audio" && !model.outputFormats?.length) {
    issues.push({
      severity: "warning",
      model: label,
      field: "outputFormats",
      message: "Audio models typically expose output formats",
    });
  }
}

/** Validate the media capability catalog. Returns structured results that the
 *  PR checker workflow can surface as a comment on the submitted PR. */
export function validateCatalog(catalog: MediaModelCatalog): ValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  if (!catalog || typeof catalog !== "object") {
    errors.push({
      severity: "error",
      model: "catalog",
      field: "catalog",
      message: "Catalog is not a valid object",
    });
    return {
      valid: false,
      total: 0,
      errors,
      warnings,
      checkedAt: new Date().toISOString(),
    };
  }

  if (!Array.isArray(catalog.capabilities)) {
    errors.push({
      severity: "error",
      model: "catalog",
      field: "capabilities",
      message: "Missing `capabilities` array",
    });
    return {
      valid: false,
      total: 0,
      errors,
      warnings,
      checkedAt: new Date().toISOString(),
    };
  }

  const seen = new Set<string>();
  for (const model of catalog.capabilities) {
    validateModel(model, errors);
    if (model.id) {
      const key = `${model.provider}:${model.id}`;
      if (seen.has(key)) {
        errors.push({
          severity: "error",
          model: model.id,
          field: "duplicate",
          message: `Duplicate model entry "${model.id}" for provider "${model.provider}"`,
        });
      }
      seen.add(key);
    }
  }

  return {
    valid: errors.length === 0,
    total: catalog.capabilities.length,
    errors,
    warnings,
    checkedAt: new Date().toISOString(),
  };
}

export async function validateCatalogFile(path: string): Promise<ValidationResult> {
  const content = await readFile(path, "utf8");
  let catalog: MediaModelCatalog;
  try {
    catalog = JSON.parse(content) as MediaModelCatalog;
  } catch (err) {
    return {
      valid: false,
      total: 0,
      errors: [{
        severity: "error",
        model: "catalog",
        field: "json",
        message: `Invalid JSON: ${err instanceof Error ? err.message : String(err)}`,
      }],
      warnings: [],
      checkedAt: new Date().toISOString(),
    };
  }
  return validateCatalog(catalog);
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}` || import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, "/")}`) {
  const path = process.argv[2] ?? "data/media-capabilities.json";
  const result = await validateCatalogFile(path);

  process.stdout.write(`Validation: ${result.valid ? "PASS" : "FAIL"}\n`);
  process.stdout.write(`Models checked: ${result.total}\n`);
  process.stdout.write(`Errors: ${result.errors.length}\n`);
  process.stdout.write(`Warnings: ${result.warnings.length}\n`);
  if (result.errors.length) {
    process.stdout.write("\nErrors:\n");
    for (const issue of result.errors) {
      process.stdout.write(`  [${issue.model}] ${issue.field}: ${issue.message}\n`);
    }
  }
  if (result.warnings.length) {
    process.stdout.write("\nWarnings:\n");
    for (const issue of result.warnings) {
      process.stdout.write(`  [${issue.model}] ${issue.field}: ${issue.message}\n`);
    }
  }

  process.exit(result.valid ? 0 : 1);
}