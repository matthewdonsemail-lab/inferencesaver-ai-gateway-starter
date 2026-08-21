import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const DATA_DIR = "data";
const PORT = Number(process.env.PORT || 3001);
const HTML_PATH = join(process.cwd(), "static", "index.html");

async function handleRequest(req: import("node:http").IncomingMessage, res: import("node:http").ServerResponse) {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

  try {
    // Static frontend page
    if (url.pathname === "/" || url.pathname === "/index.html") {
      const html = await readFile(HTML_PATH, "utf8").catch(() => generateFrontendPage());
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(html);
      return;
    }

    // API: list all capabilities
    if (url.pathname === "/api/media-capabilities") {
      const data = await readFile(join(DATA_DIR, "media-capabilities.json"), "utf8").catch(() => null);
      if (!data) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "No capability data synced yet. Run `npm run sync-media-capabilities` first." }));
        return;
      }
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(data);
      return;
    }

    // API: filter by modality
    if (url.pathname.startsWith("/api/media-capabilities/")) {
      const modality = url.pathname.split("/").pop();
      if (!["video", "audio", "image"].includes(modality ?? "")) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid modality. Use video, audio, or image." }));
        return;
      }
      const data = await readFile(join(DATA_DIR, "media-capabilities.json"), "utf8").catch(() => null);
      if (!data) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "No capability data synced" }));
        return;
      }
      const catalog = JSON.parse(data) as { capabilities: Array<Record<string, unknown>> };
      const filtered = catalog.capabilities.filter((c) => c.modality === modality);
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ ...catalog, capabilities: filtered, count: filtered.length }));
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  } catch (error) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }));
  }
}

function generateFrontendPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>InferenceSaver — Media Model Capabilities</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { background: #0a0a0f; color: #e2e8f0; }
    .card { background: #1a1a2e; border: 1px solid #2a2a4a; border-radius: 12px; }
    .badge { font-size: 0.7rem; padding: 2px 8px; border-radius: 999px; }
    .badge-video { background: #1e3a5f; color: #93c5fd; }
    .badge-audio { background: #3b1f3b; color: #d8b4fe; }
    .badge-image { background: #1f3b1f; color: #86efac; }
  </style>
</head>
<body class="p-6 max-w-7xl mx-auto">
  <header class="mb-8">
    <h1 class="text-3xl font-bold text-white">Media Model Capabilities</h1>
    <p class="text-gray-400 mt-2">Non-LLM model registry — video, audio, and image generation models</p>
    <div class="flex gap-2 mt-4">
      <button onclick="loadData()" class="px-4 py-2 bg-blue-600 rounded-lg text-white hover:bg-blue-700">All</button>
      <button onclick="loadData('video')" class="px-4 py-2 bg-blue-600/50 rounded-lg text-white hover:bg-blue-700">Video</button>
      <button onclick="loadData('audio')" class="px-4 py-2 bg-purple-600/50 rounded-lg text-white hover:bg-purple-700">Audio</button>
      <button onclick="loadData('image')" class="px-4 py-2 bg-green-600/50 rounded-lg text-white hover:bg-green-700">Image</button>
    </div>
  </header>

  <div id="stats" class="grid grid-cols-4 gap-4 mb-8"></div>
  <div id="models" class="grid gap-4"></div>

  <script>
    const API = "/api/media-capabilities";
    let allData = [];

    async function loadData(modality) {
      const url = modality ? API + "/" + modality : API;
      try {
        const res = await fetch(url);
        const data = await res.json();
        allData = data.capabilities || [];
        renderStats(data);
        renderModels(allData);
      } catch (e) {
        document.getElementById("models").innerHTML =
          '<div class="card p-8 text-center text-gray-400">' +
          '<p class="text-xl mb-2">No capability data synced yet</p>' +
          '<p class="text-sm">Run <code class="bg-gray-800 px-2 py-1 rounded">npm run sync-media-capabilities</code> to generate the catalog.</p>' +
          '</div>';
      }
    }

    function renderStats(data) {
      const stats = document.getElementById("stats");
      const caps = data.capabilities || [];
      const total = data.count ?? caps.length;
      const byModality = { video: 0, audio: 0, image: 0 };
      caps.forEach(c => { if (byModality[c.modality] !== undefined) byModality[c.modality]++; });
      stats.innerHTML = [
        '<div class="card p-4 text-center"><div class="text-2xl font-bold text-white">' + total + '</div><div class="text-sm text-gray-400">Total Models</div></div>',
        '<div class="card p-4 text-center"><div class="text-2xl font-bold text-blue-400">' + (byModality.video || 0) + '</div><div class="text-sm text-gray-400">Video</div></div>',
        '<div class="card p-4 text-center"><div class="text-2xl font-bold text-purple-400">' + (byModality.audio || 0) + '</div><div class="text-sm text-gray-400">Audio</div></div>',
        '<div class="card p-4 text-center"><div class="text-2xl font-bold text-green-400">' + (byModality.image || 0) + '</div><div class="text-sm text-gray-400">Image</div></div>',
      ].join("");
    }

    function renderModels(models) {
      const container = document.getElementById("models");
      if (!models.length) {
        container.innerHTML = '<div class="card p-8 text-center text-gray-400">No models found</div>';
        return;
      }
      container.innerHTML = models.map(m => {
        const modality = m.modality || "unknown";
        const badge = "badge-" + modality;
        const caps = [
          m.aspectRatios ? 'Aspect Ratios: <span class="text-gray-200">' + m.aspectRatios.join(", ") + '</span>' : null,
          m.durationOptions ? 'Durations: <span class="text-gray-200">' + m.durationOptions.join("s, ") + 's</span>' : null,
          m.maxDurationSeconds ? 'Max Duration: <span class="text-gray-200">' + m.maxDurationSeconds + 's</span>' : null,
          m.qualityOptions ? 'Qualities: <span class="text-gray-200">' + m.qualityOptions.join(", ") + '</span>' : null,
          m.outputFormats ? 'Formats: <span class="text-gray-200">' + m.outputFormats.join(", ") + '</span>' : null,
          m.generationModes ? 'Modes: <span class="text-gray-200">' + m.generationModes.join(", ") + '</span>' : null,
          m.supportsReferenceImages ? 'Reference Images: <span class="text-gray-200">✓</span>' : null,
          m.supportsCustomVoice ? 'Custom Voice: <span class="text-gray-200">✓</span>' : null,
          m.requiresOwnKey ? 'Requires Own Key: <span class="text-gray-200">✓</span>' : null,
        ].filter(Boolean).join(" • ");

        return '<div class="card p-5">' +
          '<div class="flex items-start justify-between mb-3">' +
          '<div>' +
          '<h3 class="text-lg font-semibold text-white">' + (m.name || m.id) + '</h3>' +
          '<p class="text-sm text-gray-500 mt-0.5">' + m.id + '</p>' +
          '</div>' +
          '<span class="badge ' + badge + '">' + modality + '</span>' +
          '</div>' +
          (caps ? '<div class="text-sm text-gray-400 mb-2">' + caps + '</div>' : '') +
          '<div class="text-xs text-gray-600">' +
          'Provider: ' + m.provider +
          (m.endpointUrl ? ' | Endpoint: <a href="' + m.endpointUrl + '" class="text-blue-400 hover:underline" target="_blank">' + m.endpointUrl + '</a>' : '') +
          (m.schemaUrl ? ' | <a href="' + m.schemaUrl + '" class="text-blue-400 hover:underline" target="_blank">Schema</a>' : '') +
          '</div>' +
          '</div>';
      }).join("");
    }

    loadData();
  </script>
</body>
</html>`;
}

const server = createServer(handleRequest);
server.listen(PORT, () => {
  console.log(`Media capability server running at http://localhost:${PORT}`);
});