export type SectorArtKind = "planet" | "sky";

export interface SectorArtResult {
  seed: number;
  kind?: SectorArtKind;
  textureUrl: string | null;
  placeholder: boolean;
  prompt: string;
  error?: string;
  cached?: boolean;
  metadata: {
    model: string;
    generatedAt: number;
  };
}
