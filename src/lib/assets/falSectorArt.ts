import type { SectorArtKind, SectorArtResult } from "./types";

export type { SectorArtKind, SectorArtResult } from "./types";

export interface SectorArtGenerator {
  generateSectorArt: (seed: number) => Promise<SectorArtResult>;
}

const memoryCache = new Map<string, SectorArtResult>();

function cacheKey(seed: number, kind: SectorArtKind): string {
  return `${kind}:${seed}`;
}

function placeholderResult(seed: number, error?: string): SectorArtResult {
  const prompt = [
    "Seamless sci-fi desert planet surface texture map,",
    "crystalline sand dunes, rust amber and deep violet canyons,",
    `seed ${seed}`,
  ].join(" ");

  return {
    seed,
    textureUrl: null,
    placeholder: true,
    prompt,
    error,
    cached: false,
    metadata: {
      model: "procedural-placeholder",
      generatedAt: Date.now(),
    },
  };
}

async function fetchSectorArtFromApi(
  seed: number,
  kind: SectorArtKind = "planet",
): Promise<SectorArtResult> {
  const response = await fetch("/api/sector-art", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ seed, kind }),
  });

  if (!response.ok) {
    throw new Error(`Sector art API ${response.status}`);
  }

  const payload = (await response.json()) as SectorArtResult;
  return {
    seed: payload.seed ?? seed,
    textureUrl: payload.textureUrl ?? null,
    placeholder: payload.placeholder ?? !payload.textureUrl,
    prompt: payload.prompt,
    error: payload.error,
    cached: payload.cached ?? false,
    metadata: payload.metadata ?? {
      model: "unknown",
      generatedAt: Date.now(),
    },
  };
}

export function createFalSectorArtStub(): SectorArtGenerator {
  return {
    async generateSectorArt(seed: number) {
      return placeholderResult(seed, "FAL_KEY not configured");
    },
  };
}

export async function generateSectorArt(
  seed: number,
  kind: SectorArtKind = "planet",
): Promise<SectorArtResult> {
  const key = cacheKey(seed, kind);
  const cached = memoryCache.get(key);
  if (cached?.textureUrl) {
    return cached;
  }

  try {
    const result = await fetchSectorArtFromApi(seed, kind);
    if (result.textureUrl) {
      memoryCache.set(key, result);
      return result;
    }
    return {
      ...placeholderResult(seed, result.error),
      prompt: result.prompt,
      metadata: result.metadata,
      cached: result.cached,
    };
  } catch (error) {
    return placeholderResult(
      seed,
      error instanceof Error ? error.message : "Sector art API unavailable",
    );
  }
}

export function applyTextureUrl(
  current: SectorArtResult,
  textureUrl: string,
): SectorArtResult {
  return {
    ...current,
    textureUrl,
    placeholder: false,
  };
}

export function clearSectorArtMemoryCache(): void {
  memoryCache.clear();
}

export async function prefetchSectorArt(
  seed: number,
  kind: SectorArtKind = "planet",
): Promise<void> {
  const key = cacheKey(seed, kind);
  if (memoryCache.has(key)) return;
  try {
    const result = await fetchSectorArtFromApi(seed, kind);
    if (result.textureUrl) {
      memoryCache.set(key, result);
    }
  } catch {
    // Prefetch is best-effort; gameplay uses procedural fallback.
  }
}

export function peekSectorArtCache(
  seed: number,
  kind: SectorArtKind = "planet",
): SectorArtResult | undefined {
  return memoryCache.get(cacheKey(seed, kind));
}
