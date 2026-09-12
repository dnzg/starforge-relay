export interface ServerEnv {
  falKey?: string;
  xaiApiKey?: string;
  telegramBotToken?: string;
  port: number;
  serveStatic: boolean;
  distDir: string;
  sectorArtCacheDir: string;
  shipAvatarCacheDir: string;
  shipTtsCacheDir: string;
}

export function loadServerEnv(options?: {
  dev?: boolean;
  portOverride?: number;
}): ServerEnv {
  const dev = options?.dev ?? process.env.NODE_ENV !== "production";
  const port = options?.portOverride ?? Number(process.env.PORT ?? (dev ? 43124 : 10000));

  return {
    falKey: process.env.FAL_KEY,
    xaiApiKey: process.env.XAI_API_KEY,
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
    port,
    serveStatic: !dev,
    distDir: "dist",
    sectorArtCacheDir:
      process.env.SECTOR_ART_CACHE_DIR ?? ".cache/sector-art",
    shipAvatarCacheDir:
      process.env.SHIP_AVATAR_CACHE_DIR ?? ".cache/ship-avatar",
    shipTtsCacheDir: process.env.SHIP_TTS_CACHE_DIR ?? ".cache/ship-tts",
  };
}
