import { readFile } from "node:fs/promises";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { serveStatic } from "@hono/node-server/serve-static";
import { interpretVoiceInput } from "../shared/commandInterpreter.js";
import {
  handleSectorArtRequest,
  handleShipLiveryRequest,
} from "../shared/falSectorArtServer.js";
import { handleShipAvatarRequest } from "../shared/shipAvatarServer.js";
import {
  prepareTtsText,
  silentShipTts,
  synthesizeShipSpeech,
} from "../shared/shipTtsServer.js";
import {
  buildVoiceStatus,
  createXaiEphemeralToken,
} from "../shared/voiceServer.js";
import { resolveTelegramUserId } from "./telegramAuth.js";
import type { ServerEnv } from "./env.js";
import { SectorArtCache } from "./sectorArtCache.js";
import { ShipAvatarCache } from "./shipAvatarCache.js";
import { hashTtsText, ShipTtsCache } from "./shipTtsCache.js";
import { StarsEntitlementsStore } from "./starsEntitlements.js";
import {
  handleStarsEntitlements,
  handleStarsInvoice,
  handleStarsMockGrant,
  handleTelegramWebhook,
} from "./starsHandlers.js";

export function createApp(env: ServerEnv) {
  const app = new Hono();
  const sectorArtCache = new SectorArtCache({
    cacheDir: env.sectorArtCacheDir,
  });
  const shipAvatarCache = new ShipAvatarCache({
    cacheDir: env.shipAvatarCacheDir,
  });
  const shipTtsCache = new ShipTtsCache({
    cacheDir: env.shipTtsCacheDir,
  });
  const starsEntitlements = new StarsEntitlementsStore(env.starsEntitlementsPath);

  app.use("/api/*", cors());

  app.get("/api/health", (c) =>
    c.json({
      ok: true,
      falConfigured: Boolean(env.falKey?.trim()),
      xaiConfigured: Boolean(env.xaiApiKey?.trim()),
      ttsConfigured: Boolean(env.falKey?.trim() || env.xaiApiKey?.trim()),
      telegramConfigured: Boolean(env.telegramBotToken?.trim()),
      starsConfigured: Boolean(env.telegramBotToken?.trim()),
      starsMock: env.starsMock,
    }),
  );

  app.get("/api/telegram/status", (c) =>
    c.json({
      botConfigured: Boolean(env.telegramBotToken?.trim()),
    }),
  );

  app.get("/api/sector-art/files/:filename", async (c) => {
    const filename = c.req.param("filename");
    const match = /^(sky-)?(\d+)\.jpg$/.exec(filename);
    if (!match) {
      return c.text("Invalid filename", 400);
    }
    const kind = match[1] ? "sky" : "planet";
    const seed = Number.parseInt(match[2] ?? "", 10);
    try {
      const data = await readFile(sectorArtCache.imagePath(seed, kind));
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
    const kind = c.req.query("kind");
    const body = seed
      ? JSON.stringify({ seed: Number(seed), kind: kind === "sky" ? "sky" : "planet" })
      : "";
    const result = await handleSectorArtRequest(
      body,
      env.falKey,
      sectorArtCache,
    );
    return c.json(result);
  });

  app.post("/api/ship-livery", async (c) => {
    const rawBody = await c.req.text();
    let parsedBody: {
      prompt?: string;
      seed?: number;
      initData?: string;
      telegramUserId?: string;
    } = {};
    try {
      parsedBody = JSON.parse(rawBody) as typeof parsedBody;
    } catch {
      parsedBody = {};
    }

    const botToken = env.telegramBotToken?.trim();
    const userId = resolveTelegramUserId(
      parsedBody.initData,
      botToken,
      parsedBody.telegramUserId,
    );
    if (botToken && userId && !env.starsMock) {
      const entitlements = await starsEntitlements.get(userId);
      if (entitlements.livery_reroll < 1) {
        return c.json(
          {
            textureUrl: null,
            error: "No livery credits. Buy a reroll with Stars in the hangar.",
          },
          402,
        );
      }
      const consumed = await starsEntitlements.consumeLiveryCredit(userId);
      if (!consumed) {
        return c.json(
          {
            textureUrl: null,
            error: "No livery credits. Buy a reroll with Stars in the hangar.",
          },
          402,
        );
      }
    }

    const result = await handleShipLiveryRequest(rawBody, env.falKey);
    return c.json(result);
  });

  app.post("/api/stars/invoice", async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as {
      sku?: string;
      initData?: string;
      telegramUserId?: string;
    };
    const result = await handleStarsInvoice(body, env);
    if ("error" in result) {
      return c.json({ error: result.error }, result.status);
    }
    return c.json(result);
  });

  app.post("/api/stars/mock-grant", async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as {
      sku?: string;
      initData?: string;
      telegramUserId?: string;
    };
    const result = await handleStarsMockGrant(body, env, starsEntitlements);
    if ("error" in result) {
      return c.json({ error: result.error }, result.status);
    }
    return c.json(result);
  });

  app.get("/api/stars/entitlements", async (c) => {
    const initData = c.req.query("initData");
    const telegramUserId = c.req.query("telegramUserId") ?? undefined;
    const userId = resolveTelegramUserId(
      initData,
      env.telegramBotToken,
      telegramUserId,
    );
    const result = await handleStarsEntitlements(userId, starsEntitlements);
    if ("error" in result) {
      return c.json({ error: result.error }, result.status);
    }
    return c.json(result);
  });

  app.post("/api/telegram/webhook", async (c) => {
    const update = (await c.req.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    await handleTelegramWebhook(update, env, starsEntitlements);
    return c.json({ ok: true });
  });

  app.get("/api/ship-avatar/file/:filename", async (c) => {
    const filename = c.req.param("filename");
    if (!/^[a-z0-9-]+\.jpg$/.test(filename)) {
      return c.text("Invalid filename", 400);
    }
    const key = filename.replace(/\.jpg$/, "");
    try {
      const data = await readFile(shipAvatarCache.imagePath(key));
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

  app.get("/api/ship-avatar", async (c) => {
    const result = await handleShipAvatarRequest(env.falKey, shipAvatarCache);
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
    const body = (await c.req.json().catch(() => ({}))) as {
      text?: string;
      context?: {
        captainName?: string;
        pronouns?: string;
        sectorName?: string;
        hull?: number;
        shields?: number;
        threatLevel?: number;
        sectorKills?: number;
      };
    };
    const text = body.text?.trim() ?? "";
    if (!text) {
      return c.json({ error: "text is required" }, 400);
    }
    const result = await interpretVoiceInput(text, env.xaiApiKey, body.context);
    return c.json(result);
  });

  app.get("/api/voice/tts/:filename", async (c) => {
    const filename = c.req.param("filename");
    if (!/^[a-f0-9]{16,64}\.mp3$/.test(filename)) {
      return c.text("Invalid filename", 400);
    }
    const hash = filename.replace(/\.mp3$/, "");
    try {
      const data = await readFile(shipTtsCache.audioPath(hash));
      return new Response(data, {
        headers: {
          "Content-Type": "audio/mpeg",
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    } catch {
      return c.notFound();
    }
  });

  app.post("/api/voice/speak", async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as { text?: string };
    const text = prepareTtsText(body.text ?? "");
    if (!text) {
      return c.json({ error: "text is required" }, 400);
    }

    const hash = hashTtsText(text);
    const cached = await shipTtsCache.read(hash, text);
    if (cached) {
      return c.json(cached);
    }

    const synthesized = await synthesizeShipSpeech(
      text,
      env.falKey,
      env.xaiApiKey,
    );
    if (synthesized.provider === "none") {
      return c.json(silentShipTts(text, synthesized.error));
    }

    try {
      if (synthesized.bytes) {
        return c.json(
          await shipTtsCache.writeBytes(
            hash,
            text,
            synthesized.bytes,
            synthesized.provider,
          ),
        );
      }
      if (synthesized.remoteUrl) {
        return c.json(
          await shipTtsCache.writeFromRemote(
            hash,
            text,
            synthesized.remoteUrl,
            synthesized.provider,
          ),
        );
      }
    } catch (error) {
      if (synthesized.remoteUrl) {
        return c.json({
          audioUrl: synthesized.remoteUrl,
          provider: synthesized.provider,
          cached: false,
          text,
        });
      }
      return c.json(
        silentShipTts(
          text,
          error instanceof Error ? error.message : "TTS cache write failed",
        ),
      );
    }

    return c.json(silentShipTts(text, synthesized.error));
  });

  if (env.serveStatic) {
    app.use("/*", serveStatic({ root: `./${env.distDir}` }));
  }

  return app;
}
