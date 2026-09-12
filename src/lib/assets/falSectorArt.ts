import type { SectorArtResult } from "./types";

export type { SectorArtResult } from "./types";

export interface SectorArtGenerator {
  generateSectorArt: (seed: number) => Promise<SectorArtResult>;
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
    metadata: {
      model: "procedural-placeholder",
      generatedAt: Date.now(),
    },
  };
}

async function fetchSectorArtFromApi(seed: number): Promise<SectorArtResult> {
  const response = await fetch("/api/sector-art", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ seed }),
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

export async function generateSectorArt(seed: number): Promise<SectorArtResult> {
  try {
    const result = await fetchSectorArtFromApi(seed);
    if (result.textureUrl) {
      return result;
    }
    return {
      ...placeholderResult(seed, result.error),
      prompt: result.prompt,
      metadata: result.metadata,
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
