import { fetchModels } from "./model-catalog.js";

const models = await fetchModels();
console.log(JSON.stringify({ ok: true, model_count: models.length }));
