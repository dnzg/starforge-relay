import {
  mkdir,
  readFile,
  writeFile,
  access,
} from "node:fs/promises";
import { join } from "node:path";
import type { FalSectorArtPayload } from "../shared/falSectorArtServer.js";

export interface SectorArtCacheEntry {
  seed: number;
  textureUrl: string;
  prompt: string;
  placeholder: boolean;
  error?: string;
  metadata: {
    model: string;
    generatedAt: number;
    cachedAt: number;
    sourceUrl?: string;
  };
}

export interface SectorArtCacheOptions {
  cacheDir: string;
  publicBasePath?: string;
}

function seedFileName(seed: number): string {
  return `${seed}.json`;
}

function imageFileName(seed: number): string {
  return `${seed}.jpg`;
}

function localTextureUrl(
  seed: number,
  publicBasePath: string,
): string {
  return `${publicBasePath}/${imageFileName(seed)}`;
}

export class SectorArtCache {
  private readonly cacheDir: string;
  private readonly publicBasePath: string;

  constructor(options: SectorArtCacheOptions) {
    this.cacheDir = options.cacheDir;
    this.publicBasePath = options.publicBasePath ?? "/api/sector-art/files";
  }

  private jsonPath(seed: number): string {
    return join(this.cacheDir, seedFileName(seed));
  }

  imagePath(seed: number): string {
    return join(this.cacheDir, imageFileName(seed));
  }

  async ensureDir(): Promise<void> {
    await mkdir(this.cacheDir, { recursive: true });
  }

  async hasImage(seed: number): Promise<boolean> {
    try {
      await access(this.imagePath(seed));
      return true;
    } catch {
      return false;
    }
  }

  async read(seed: number): Promise<FalSectorArtPayload | null> {
    try {
      const raw = await readFile(this.jsonPath(seed), "utf8");
      const entry = JSON.parse(raw) as SectorArtCacheEntry;
      const hasImage = await this.hasImage(seed);
      if (!hasImage || !entry.textureUrl) {
        return null;
      }

      return {
        seed: entry.seed,
        textureUrl: localTextureUrl(seed, this.publicBasePath),
        placeholder: entry.placeholder,
        prompt: entry.prompt,
        error: entry.error,
        cached: true,
        metadata: {
          model: entry.metadata.model,
          generatedAt: entry.metadata.generatedAt,
        },
      };
    } catch {
      return null;
    }
  }

  async writeFromRemote(
    seed: number,
    payload: Omit<FalSectorArtPayload, "cached">,
    remoteUrl: string,
  ): Promise<FalSectorArtPayload> {
    await this.ensureDir();

    const imageResponse = await fetch(remoteUrl);
    if (!imageResponse.ok) {
      throw new Error(
        `Failed to download Fal texture (${imageResponse.status})`,
      );
    }

    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    await writeFile(this.imagePath(seed), imageBuffer);

    const entry: SectorArtCacheEntry = {
      seed,
      textureUrl: localTextureUrl(seed, this.publicBasePath),
      prompt: payload.prompt,
      placeholder: false,
      metadata: {
        model: payload.metadata.model,
        generatedAt: payload.metadata.generatedAt,
        cachedAt: Date.now(),
        sourceUrl: remoteUrl,
      },
    };

    await writeFile(this.jsonPath(seed), JSON.stringify(entry, null, 2));

    return {
      ...payload,
      textureUrl: entry.textureUrl,
      placeholder: false,
      cached: false,
    };
  }

  async writePlaceholder(
    seed: number,
    payload: Omit<FalSectorArtPayload, "cached">,
  ): Promise<FalSectorArtPayload> {
    await this.ensureDir();

    const entry: SectorArtCacheEntry = {
      seed,
      textureUrl: "",
      prompt: payload.prompt,
      placeholder: true,
      error: payload.error,
      metadata: {
        model: payload.metadata.model,
        generatedAt: payload.metadata.generatedAt,
        cachedAt: Date.now(),
      },
    };

    await writeFile(this.jsonPath(seed), JSON.stringify(entry, null, 2));

    return { ...payload, cached: true };
  }
}
