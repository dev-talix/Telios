import { Hono } from "hono";
import { initDb } from "./db/client.ts";
import { buildApi } from "./api/index.ts";
import { startHeartbeatScheduler } from "./scheduler/heartbeat.ts";
import { join } from "jsr:@std/path@^1";
import { exists } from "jsr:@std/fs@^1";

const PORT = Number(Deno.env.get("TELOS_PORT") ?? 3100);
const DATA_DIR = Deno.env.get("TELOS_DATA_DIR") ?? "./data";
const UI_DIR = Deno.env.get("TELOS_UI_DIR") ?? "./ui/dist";
const OPEN_BROWSER = Deno.env.get("TELOS_OPEN_BROWSER") !== "false";

console.log("[telos] initializing...");
await initDb(DATA_DIR);

const app = new Hono();

// API routes
app.route("/api", buildApi());

// Serve UI static files if built
const uiExists = await exists(join(UI_DIR, "index.html"));

if (uiExists) {
  // Serve static assets
  app.get("/*", async (c) => {
    const urlPath = c.req.path;
    const filePath = join(UI_DIR, urlPath === "/" ? "index.html" : urlPath);

    try {
      const fileExists = await exists(filePath);
      if (fileExists) {
        const file = await Deno.readFile(filePath);
        const ext = filePath.split(".").pop() ?? "";
        const mime: Record<string, string> = {
          html: "text/html",
          js: "application/javascript",
          css: "text/css",
          svg: "image/svg+xml",
          png: "image/png",
          ico: "image/x-icon",
          json: "application/json",
          woff2: "font/woff2",
          woff: "font/woff",
        };
        return c.body(file, 200, { "Content-Type": mime[ext] ?? "application/octet-stream" });
      }
    } catch {
      // fall through to SPA fallback
    }

    // SPA fallback
    const html = await Deno.readTextFile(join(UI_DIR, "index.html"));
    return c.html(html);
  });
} else {
  app.get("/", (c) =>
    c.html(`<!DOCTYPE html>
<html>
  <head><title>Telos</title></head>
  <body style="font-family:monospace;padding:2rem;background:#0a0a0f;color:#e2e8f0">
    <h1>🎯 Telos API running</h1>
    <p>UI not built. Run: <code>deno task ui:build</code></p>
    <p>API: <a href="/api/health" style="color:#4361ee">/api/health</a> | <a href="/api/stats" style="color:#4361ee">/api/stats</a></p>
    <p>Init Talix: <code>POST /api/init/talix</code></p>
  </body>
</html>`));
}

startHeartbeatScheduler();

console.log(`[telos] running at http://localhost:${PORT}`);
console.log(`[telos] API: http://localhost:${PORT}/api/health`);

if (OPEN_BROWSER) {
  setTimeout(async () => {
    try {
      const cmd = new Deno.Command("open", { args: [`http://localhost:${PORT}`] });
      await cmd.output();
    } catch {
      // non-mac — ignore
    }
  }, 500);
}

Deno.serve({ port: PORT }, app.fetch);
