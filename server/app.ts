import { readFile } from "node:fs/promises";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { serveStatic } from "@hono/node-server/serve-static";
import { interpretVoiceInput } from "../shared/commandInterpreter.js";
import { handleSectorArtRequest } from "../shared/falSectorArtServer.js";
import {
  buildVoiceStatus,
  createXaiEphemeralToken,
} from "../shared/voiceServer.js";
import type { ServerEnv } from "./env.js";
import { SectorArtCache } from "./sectorArtCache.js";

export function createApp(env: ServerEnv) {
  const app = new Hono();
  const sectorArtCache = new SectorArtCache({
    cacheDir: env.sectorArtCacheDir,
  });

  app.use("/api/*", cors());

  app.get("/api/health", (c) =>
    c.json({
      ok: true,
      falConfigured: Boolean(env.falKey?.trim()),
      xaiConfigured: Boolean(env.xaiApiKey?.trim()),
    }),
  );

  app.get("/api/sector-art/files/:filename", async (c) => {
    const filename = c.req.param("filename");
    if (!/^\d+\.jpg$/.test(filename)) {
      return c.text("Invalid filename", 400);
    }
    const seed = Number.parseInt(filename.replace(".jpg", ""), 10);
    try {
      const data = await readFile(sectorArtCache.imagePath(seed));
      return new Response(data, {
        headers: {
          "Content-Type": "image/jpeg",
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    } catch {
      return c.notFound();
    }
  });

  app.post("/api/sector-art", async (c) => {
    const body = await c.req.text();
    const result = await handleSectorArtRequest(
      body,
      env.falKey,
      sectorArtCache,
    );
    return c.json(result);
  });

  app.get("/api/sector-art", async (c) => {
    const seed = c.req.query("seed");
    const body = seed ? JSON.stringify({ seed: Number(seed) }) : "";
    const result = await handleSectorArtRequest(
      body,
      env.falKey,
      sectorArtCache,
    );
    return c.json(result);
  });

  app.get("/api/voice/status", (c) => {
    return c.json(buildVoiceStatus(env.xaiApiKey, env.falKey));
  });

  app.post("/api/voice/token", async (c) => {
    const tokenPayload = await createXaiEphemeralToken(env.xaiApiKey);
    if (!tokenPayload.token) {
      return c.json(tokenPayload, 503);
    }
    return c.json(tokenPayload);
  });

  app.post("/api/voice/interpret", async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as { text?: string };
    const text = body.text?.trim() ?? "";
    if (!text) {
      return c.json({ error: "text is required" }, 400);
    }
    const result = await interpretVoiceInput(text, env.xaiApiKey);
    return c.json(result);
  });

  if (env.serveStatic) {
    app.use("/*", serveStatic({ root: `./${env.distDir}` }));
  }

  return app;
}
