import { fetchModels, mergeCatalogs, writeCatalog } from "./model-catalog.js";
import { fetchPricingCatalog } from "./pricing-catalog.js";

const models = await fetchModels();
const pricing = await fetchPricingCatalog();
const merged = mergeCatalogs(models, pricing);
await writeCatalog(merged);
console.log(`Wrote ${merged.length} merged models to data/models.json (${models.length} available to key)`);
