export interface ServerEnv {
  falKey?: string;
  xaiApiKey?: string;
  port: number;
  serveStatic: boolean;
  distDir: string;
  sectorArtCacheDir: string;
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
    port,
    serveStatic: !dev,
    distDir: "dist",
    sectorArtCacheDir:
      process.env.SECTOR_ART_CACHE_DIR ?? ".cache/sector-art",
  };
}
