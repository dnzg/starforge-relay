export interface ServerEnv {
  falKey?: string;
  xaiApiKey?: string;
  telegramBotToken?: string;
  starsMock: boolean;
  port: number;
  serveStatic: boolean;
  distDir: string;
  sectorArtCacheDir: string;
  shipAvatarCacheDir: string;
  shipTtsCacheDir: string;
  starsEntitlementsPath: string;
}

export function loadServerEnv(options?: {
  dev?: boolean;
  portOverride?: number;
}): ServerEnv {
  const dev = options?.dev ?? process.env.NODE_ENV !== "production";
  const port = options?.portOverride ?? Number(process.env.PORT ?? (dev ? 43124 : 10000));

  const starsMock =
    process.env.STARS_MOCK === "1" ||
    (dev && process.env.STARS_MOCK !== "0");

  return {
    falKey: process.env.FAL_KEY,
    xaiApiKey: process.env.XAI_API_KEY,
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
    starsMock,
    port,
    serveStatic: !dev,
    distDir: "dist",
    sectorArtCacheDir:
      process.env.SECTOR_ART_CACHE_DIR ?? ".cache/sector-art",
    shipAvatarCacheDir:
      process.env.SHIP_AVATAR_CACHE_DIR ?? ".cache/ship-avatar",
    shipTtsCacheDir: process.env.SHIP_TTS_CACHE_DIR ?? ".cache/ship-tts",
    starsEntitlementsPath:
      process.env.STARS_ENTITLEMENTS_PATH ?? ".cache/stars-entitlements.json",
  };
}
