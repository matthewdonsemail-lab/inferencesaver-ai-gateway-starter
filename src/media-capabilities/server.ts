import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";
import type { MediaModelCapability, MediaModelCatalog } from "./schema.js";

const DATA_DIR = "data";
const DOCS_DIR = "docs";
const PORT = Number(process.env.PORT || 3001);
const DATA_PATH = join(DATA_DIR, "media-capabilities.json");

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS, HEAD",
    "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization",
    "Access-Control-Max-Age": "86400",
    "X-API-Version": "0.1.0",
  };
}

function jsonResponse(
  res: ServerResponse,
  data: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {},
): void {
  const body = JSON.stringify(data, null, 2);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body).toString(),
    "Cache-Control": "no-cache, no-store, must-revalidate",
    ...corsHeaders(),
    ...extraHeaders,
  });
  res.end(body);
}

function errorResponse(res: ServerResponse, message: string, status: number): void {
  jsonResponse(res, { error: message, status }, status);
}

async function loadCatalog(): Promise<MediaModelCatalog | null> {
  try {
    const content = await readFile(DATA_PATH, "utf8");
    return JSON.parse(content) as MediaModelCatalog;
  } catch {
    return null;
  }
}

function normalizeQuery(q: string): string {
  return q.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function scoreModel(model: MediaModelCapability, query: string): number {
  const terms = normalizeQuery(query).split(/\s+/).filter(Boolean);
  if (!terms.length) return 1;
  const tokens = [
    model.name || "", model.id || "", model.provider || "",
    model.capability || "", model.modality || "",
    (model.aspectRatios || []).join(" "),
    (model.qualityOptions || []).join(" "),
    (model.outputFormats || []).join(" "),
  ].join(" ").toLowerCase();

  let score = 0;
  for (const term of terms) {
    if (tokens.includes(term)) score += 10;
    if ((model.id || "").toLowerCase().includes(term)) score += 8;
    if ((model.name || "").toLowerCase().includes(term)) score += 8;
    if ((model.capability || "").toLowerCase().includes(term)) score += 6;
    if ((model.provider || "").toLowerCase().includes(term)) score += 4;
    if (term.length > 1) score -= 2;
  }
  return score;
}

function filterModels(catalog: MediaModelCatalog, url: URL): {
  models: MediaModelCapability[];
  total: number;
  count: number;
  limit: number;
  offset: number;
} {
  let models = catalog.capabilities;

  const modality = url.searchParams.get("modality");
  if (modality) {
    models = models.filter((m) => m.modality === modality);
  }

  const provider = url.searchParams.get("provider");
  if (provider) {
    models = models.filter((m) => m.provider === provider);
  }

  const capability = url.searchParams.get("capability");
  if (capability) {
    models = models.filter((m) => m.capability === capability);
  }

  const q = url.searchParams.get("q");
  if (q) {
    const scored = models.map((m) => ({ model: m, score: scoreModel(m, q) }));
    scored.sort((a, b) => b.score - a.score);
    models = scored.filter((s) => s.score > 0).map((s) => s.model);
  }

  const sort = url.searchParams.get("sort") || "name";
  const order = url.searchParams.get("order") || "asc";
  models = [...models].sort((a, b) => {
    let av: string, bv: string;
    switch (sort) {
      case "modality": av = a.modality || ""; bv = b.modality || ""; break;
      case "provider": av = a.provider || ""; bv = b.provider || ""; break;
      case "capability": av = a.capability || ""; bv = b.capability || ""; break;
      default: av = (a.name || a.id || "").toLowerCase(); bv = (b.name || b.id || "").toLowerCase();
    }
    const cmp = av.localeCompare(bv, undefined, { numeric: true, sensitivity: "base" });
    return order === "desc" ? -cmp : cmp;
  });

  const total = models.length;
  const limit = Math.min(Math.max(1, Number(url.searchParams.get("limit")) || 100), 500);
  const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);
  models = models.slice(offset, offset + limit);

  return { models, total, count: models.length, limit, offset };
}

function projectFields(models: MediaModelCapability[], fields: string[]): Partial<MediaModelCapability>[] {
  if (!fields.length) return models;
  const fieldSet = new Set(fields);
  return models.map((m) => {
    const projected: Record<string, unknown> = {};
    for (const key of fieldSet) {
      if (key in m) projected[key] = (m as Record<string, unknown>)[key];
    }
    return projected as Partial<MediaModelCapability>;
  });
}

async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

  // Handle OPTIONS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      ...corsHeaders(),
      "Content-Length": "0",
    });
    res.end();
    return;
  }

  // Serve the pretty frontend page
  if (url.pathname === "/" || url.pathname === "/index.html") {
    const htmlPath = join(DOCS_DIR, "index.html");
    if (existsSync(htmlPath)) {
      const html = await readFile(htmlPath, "utf8");
      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        ...corsHeaders(),
      });
      res.end(html);
      return;
    }
    errorResponse(res, "Frontend page not found. Run `npm run media-capabilities:aggregate` first.", 404);
    return;
  }

  // Load catalog data
  const catalog = await loadCatalog();
  if (!catalog) {
    errorResponse(res, "No capability data synced yet. Run `npm run media-capabilities:aggregate` first.", 404);
    return;
  }

  // GET /api/media-capabilities/stats
  if (url.pathname === "/api/media-capabilities/stats") {
    const byModality: Record<string, number> = {};
    const byProvider: Record<string, number> = {};
    const byCapability: Record<string, number> = {};

    for (const m of catalog.capabilities) {
      byModality[m.modality] = (byModality[m.modality] || 0) + 1;
      byProvider[m.provider] = (byProvider[m.provider] || 0) + 1;
      byCapability[m.capability] = (byCapability[m.capability] || 0) + 1;
    }

    jsonResponse(res, {
      version: catalog.version,
      generatedAt: catalog.generatedAt,
      total: catalog.capabilities.length,
      byModality,
      byProvider,
      byCapability,
    });
    return;
  }

  // GET /api/media-capabilities/providers
  if (url.pathname === "/api/media-capabilities/providers") {
    const byProvider: Record<string, number> = {};
    const byModalityPerProvider: Record<string, Record<string, number>> = {};

    for (const m of catalog.capabilities) {
      byProvider[m.provider] = (byProvider[m.provider] || 0) + 1;
      if (!byModalityPerProvider[m.provider]) byModalityPerProvider[m.provider] = {};
      byModalityPerProvider[m.provider][m.modality] = (byModalityPerProvider[m.provider][m.modality] || 0) + 1;
    }

    const providers = Object.entries(byProvider)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({
        name,
        count,
        modalities: byModalityPerProvider[name],
      }));

    jsonResponse(res, { providers });
    return;
  }

  // GET /api/media-capabilities/:id (single model by URL-encoded id)
  if (url.pathname.startsWith("/api/media-capabilities/") && url.pathname.split("/").length === 4) {
    const id = decodeURIComponent(url.pathname.replace("/api/media-capabilities/", ""));
    const model = catalog.capabilities.find((m) => m.id === id);
    if (!model) {
      errorResponse(res, `Model "${id}" not found`, 404);
      return;
    }
    const fieldsParam = url.searchParams.get("fields");
    const fields = fieldsParam ? fieldsParam.split(",").map((f) => f.trim()).filter(Boolean) : [];
    jsonResponse(res, fields.length ? projectFields([model], fields)[0] : model);
    return;
  }

  // GET /api/media-capabilities (list with filters)
  if (url.pathname === "/api/media-capabilities") {
    const { models, total, count, limit, offset } = filterModels(catalog, url);
    const fieldsParam = url.searchParams.get("fields");
    const fields = fieldsParam ? fieldsParam.split(",").map((f) => f.trim()).filter(Boolean) : [];
    const projected = fields.length ? projectFields(models, fields) : models;

    jsonResponse(res, {
      version: catalog.version,
      generatedAt: catalog.generatedAt,
      total,
      count,
      limit,
      offset,
      capabilities: projected,
    });
    return;
  }

  // 404 for unknown routes
  errorResponse(res, `Not found: ${url.pathname}`, 404);
}

const server = createServer(handleRequest);
server.listen(PORT, () => {
  console.log(`Media Capability API running at http://localhost:${PORT}`);
  console.log(`  API endpoints:`);
  console.log(`    GET  /                               → Frontend page`);
  console.log(`    GET  /api/media-capabilities           → List capabilities (with filters)`);
  console.log(`    GET  /api/media-capabilities/:id      → Single capability by ID`);
  console.log(`    GET  /api/media-capabilities/stats    → Summary statistics`);
  console.log(`    GET  /api/media-capabilities/providers → Provider list with counts`);
  console.log(`  Query params:`);
  console.log(`    modality=video|audio|image`);
  console.log(`    provider=replicate|fala|huggingface|inferencesaver`);
  console.log(`    capability=video_generation|image_generation|...`);
  console.log(`    q=<search term>`);
  console.log(`    limit=<number> (default: 100, max: 500)`);
  console.log(`    offset=<number> (default: 0)`);
  console.log(`    sort=name|modality|provider|capability`);
  console.log(`    order=asc|desc`);
  console.log(`    fields=id,name,provider,modality,capability,aspectRatios`);

  console.log(`\n  Data: ${DATA_PATH}`);
  void loadCatalog().then((c) => {
    console.log(`  Total models: ${c?.capabilities.length ?? 0}`);
  });
});