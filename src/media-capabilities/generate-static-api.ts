import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { loadCatalog } from "./aggregator.js";

const API_DIR = join("docs", "api");



async function ensureDir(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true });
}

function writeJson(path: string, data: unknown): Promise<void> {
  return writeFile(path, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

/** Generate static API snapshots for GitHub Pages (no server required).
 *  Produces pre-computed API endpoints that the static host can serve. */
export async function generateStaticApi(): Promise<void> {
  const catalog = await loadCatalog();
  if (!catalog) {
    console.error("No catalog data found. Run aggregation first.");
    process.exit(1);
  }

  await ensureDir(API_DIR);
  await ensureDir(join(API_DIR, "modality"));
  await ensureDir(join(API_DIR, "provider"));

  // Full catalog
  await writeJson(join(API_DIR, "media-capabilities.json"), catalog);
  console.log(`  ✓ ${join(API_DIR, "media-capabilities.json")} (${catalog.capabilities.length} models)`);

  // Stats
  const byModality: Record<string, number> = {};
  const byProvider: Record<string, number> = {};
  const byCapability: Record<string, number> = {};

  for (const m of catalog.capabilities) {
    byModality[m.modality] = (byModality[m.modality] || 0) + 1;
    byProvider[m.provider] = (byProvider[m.provider] || 0) + 1;
    byCapability[m.capability] = (byCapability[m.capability] || 0) + 1;
  }

  await writeJson(join(API_DIR, "stats.json"), {
    version: catalog.version,
    generatedAt: catalog.generatedAt,
    total: catalog.capabilities.length,
    byModality,
    byProvider,
    byCapability,
  });
  console.log(`  ✓ ${join(API_DIR, "stats.json")}`);

  // Providers
  const byModalityPerProvider: Record<string, Record<string, number>> = {};
  for (const m of catalog.capabilities) {
    if (!byModalityPerProvider[m.provider]) byModalityPerProvider[m.provider] = {};
    byModalityPerProvider[m.provider][m.modality] =
      (byModalityPerProvider[m.provider][m.modality] || 0) + 1;
  }

  const providers = Object.entries(byProvider)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({
      name,
      count,
      modalities: byModalityPerProvider[name],
    }));

  await writeJson(join(API_DIR, "providers.json"), { providers });
  console.log(`  ✓ ${join(API_DIR, "providers.json")}`);

  // Per-modality snapshots
  for (const modality of ["video", "audio", "image"] as const) {
    const filtered = catalog.capabilities.filter((m) => m.modality === modality);
    await writeJson(join(API_DIR, "modality", `${modality}.json`), {
      ...catalog,
      capabilities: filtered,
      count: filtered.length,
    });
    console.log(`  ✓ ${join(API_DIR, "modality", `${modality}.json`)} (${filtered.length} models)`);
  }

  // Per-provider snapshots
  for (const provider of Object.keys(byProvider)) {
    const filtered = catalog.capabilities.filter((m) => m.provider === provider);
    await writeJson(join(API_DIR, "provider", `${provider}.json`), {
      ...catalog,
      capabilities: filtered,
      count: filtered.length,
    });
    console.log(`  ✓ ${join(API_DIR, "provider", `${provider}.json`)} (${filtered.length} models)`);
  }

  // Search index (precomputed for fast client-side search)
  const searchIndex = catalog.capabilities.map((m) => ({
    id: m.id,
    name: m.name || m.id,
    provider: m.provider,
    modality: m.modality,
    capability: m.capability,
    tokens: [
      m.name || "", m.id || "", m.provider || "", m.capability || "",
      m.modality || "",
      (m.aspectRatios || []).join(" "),
      (m.qualityOptions || []).join(" "),
      (m.outputFormats || []).join(" "),
    ].join(" ").toLowerCase(),
  }));

  await writeJson(join(API_DIR, "search-index.json"), searchIndex);
  console.log(`  ✓ ${join(API_DIR, "search-index.json")} (${searchIndex.length} entries)`);

  console.log(`\nStatic API generated in ${API_DIR}/`);
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}` || import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, "/")}`) {
  await generateStaticApi();
}