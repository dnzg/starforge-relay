export interface SectorArtResult {
  seed: number;
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
