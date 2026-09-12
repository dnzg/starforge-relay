export interface SectorArtResult {
  seed: number;
  textureUrl: string | null;
  placeholder: boolean;
  prompt: string;
  metadata: {
    model: string;
    generatedAt: number;
  };
}

export interface SectorArtGenerator {
  generateSectorArt: (seed: number) => Promise<SectorArtResult>;
}

/**
 * Stub for Fal.ai planet texture generation.
 * Swap implementation to call Fal flux/sdxl when FAL_KEY is configured.
 *
 * Hook: pass result.textureUrl to Planet mesh material.
 */
export function createFalSectorArtStub(): SectorArtGenerator {
  return {
    async generateSectorArt(seed: number): Promise<SectorArtResult> {
      const prompt = `Procedural desert planet surface, sci-fi, seed ${seed}, cinematic, no text`;
      return {
        seed,
        textureUrl: null,
        placeholder: true,
        prompt,
        metadata: {
          model: "fal-flux-stub",
          generatedAt: Date.now(),
        },
      };
    },
  };
}

export async function generateSectorArt(seed: number): Promise<SectorArtResult> {
  const generator = createFalSectorArtStub();
  return generator.generateSectorArt(seed);
}

/**
 * Call when Fal returns a hosted texture URL.
 */
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
