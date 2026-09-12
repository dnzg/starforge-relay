import {
  mkdir,
  readFile,
  writeFile,
  access,
} from "node:fs/promises";
import { join } from "node:path";
import type {
  FalSectorArtPayload,
  SectorArtKind,
} from "../shared/falSectorArtServer.js";

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

function cacheKey(seed: number, kind: SectorArtKind = "planet"): string {
  return kind === "planet" ? `${seed}` : `${kind}-${seed}`;
}

function seedFileName(seed: number, kind: SectorArtKind = "planet"): string {
  return `${cacheKey(seed, kind)}.json`;
}

function imageFileName(seed: number, kind: SectorArtKind = "planet"): string {
  return `${cacheKey(seed, kind)}.jpg`;
}

function localTextureUrl(
  seed: number,
  publicBasePath: string,
  kind: SectorArtKind = "planet",
): string {
  return `${publicBasePath}/${imageFileName(seed, kind)}`;
}

export class SectorArtCache {
  private readonly cacheDir: string;
  private readonly publicBasePath: string;

  constructor(options: SectorArtCacheOptions) {
    this.cacheDir = options.cacheDir;
    this.publicBasePath = options.publicBasePath ?? "/api/sector-art/files";
  }

  private jsonPath(seed: number, kind: SectorArtKind = "planet"): string {
    return join(this.cacheDir, seedFileName(seed, kind));
  }

  imagePath(seed: number, kind: SectorArtKind = "planet"): string {
    return join(this.cacheDir, imageFileName(seed, kind));
  }

  async ensureDir(): Promise<void> {
    await mkdir(this.cacheDir, { recursive: true });
  }

  async hasImage(seed: number, kind: SectorArtKind = "planet"): Promise<boolean> {
    try {
      await access(this.imagePath(seed, kind));
      return true;
    } catch {
      return false;
    }
  }

  async read(
    seed: number,
    kind: SectorArtKind = "planet",
  ): Promise<FalSectorArtPayload | null> {
    try {
      const raw = await readFile(this.jsonPath(seed, kind), "utf8");
      const entry = JSON.parse(raw) as SectorArtCacheEntry;
      const hasImage = await this.hasImage(seed, kind);
      if (!hasImage || !entry.textureUrl) {
        return null;
      }

      return {
        seed: entry.seed,
        kind,
        textureUrl: localTextureUrl(seed, this.publicBasePath, kind),
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
    kind: SectorArtKind = "planet",
  ): Promise<FalSectorArtPayload> {
    await this.ensureDir();

    const imageResponse = await fetch(remoteUrl);
    if (!imageResponse.ok) {
      throw new Error(
        `Failed to download Fal texture (${imageResponse.status})`,
      );
    }

    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    await writeFile(this.imagePath(seed, kind), imageBuffer);

    const entry: SectorArtCacheEntry = {
      seed,
      textureUrl: localTextureUrl(seed, this.publicBasePath, kind),
      prompt: payload.prompt,
      placeholder: false,
      metadata: {
        model: payload.metadata.model,
        generatedAt: payload.metadata.generatedAt,
        cachedAt: Date.now(),
        sourceUrl: remoteUrl,
      },
    };

    await writeFile(this.jsonPath(seed, kind), JSON.stringify(entry, null, 2));

    return {
      ...payload,
      kind,
      textureUrl: entry.textureUrl,
      placeholder: false,
      cached: false,
    };
  }

  async writePlaceholder(
    seed: number,
    payload: Omit<FalSectorArtPayload, "cached">,
    kind: SectorArtKind = "planet",
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

    await writeFile(this.jsonPath(seed, kind), JSON.stringify(entry, null, 2));

    return { ...payload, kind, cached: true };
  }
}
