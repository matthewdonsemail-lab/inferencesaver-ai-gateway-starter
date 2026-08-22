import { aggregateCapabilities, writeCatalog, loadCatalog } from "./aggregator.js";

/** Watchdog sync: aggregate media model capabilities from all providers and
 *  write the normalized catalog. Runs on the same cron cadence as the model
 *  catalog sync (see .github/workflows/sync-models.yml). */
export async function syncMediaCapabilities(): Promise<{ added: number; updated: number; total: number }> {
  const previous = await loadCatalog();
  const previousById = new Map<string, NonNullable<Awaited<ReturnType<typeof loadCatalog>>>['capabilities'][number]>();
  if (previous) {
    for (const c of previous.capabilities) previousById.set(c.id, c);
  }

  const catalog = await aggregateCapabilities({
    replicateToken: process.env.REPLICATE_API_TOKEN,
    falApiKey: process.env.FAL_API_KEY,
  });

  await writeCatalog(catalog);

  let added = 0;
  let updated = 0;
  for (const c of catalog.capabilities) {
    const prev = previousById.get(c.id);
    if (!prev) {
      added += 1;
    } else if (prev.lastSyncedAt !== c.lastSyncedAt || prev.modality !== c.modality) {
      updated += 1;
    }
  }

  return { added, updated, total: catalog.capabilities.length };
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}` || import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, "/")}`) {
  const result = await syncMediaCapabilities();
  console.log(
    `Media capability sync complete: ${result.total} total (${result.added} added, ${result.updated} updated)`,
  );
}