import { aggregateCapabilities, writeCatalog } from "./aggregator.js";

const catalog = await aggregateCapabilities({
  replicateToken: process.env.REPLICATE_API_TOKEN,
  falApiKey: process.env.FAL_API_KEY,
});
await writeCatalog(catalog);
process.stdout.write(`Wrote ${catalog.capabilities.length} media model capabilities\n`);
process.stdout.write(`  Schema version: ${catalog.version}\n`);

const byModality = new Map();
for (const c of catalog.capabilities) {
  byModality.set(c.modality, (byModality.get(c.modality) ?? 0) + 1);
}
for (const [modality, count] of byModality) {
  process.stdout.write(`  ${modality}: ${count} models\n`);
}