import { fetchModels, writeCatalog } from "./model-catalog.js";

const models = await fetchModels();
await writeCatalog(models);
console.log(`Wrote ${models.length} normalized models to data/models.json`);
