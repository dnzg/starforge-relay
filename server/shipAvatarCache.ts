import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { ShipAvatarPayload } from "../shared/shipAvatarServer.js";
import { SHIP_AVATAR_KEY } from "../shared/shipAvatarServer.js";

export interface ShipAvatarCacheOptions {
  cacheDir: string;
  publicBasePath?: string;
}

function jsonName(key: string): string {
  return `${key}.json`;
}

function imageName(key: string): string {
  return `${key}.jpg`;
}

export class ShipAvatarCache {
  private readonly cacheDir: string;
  private readonly publicBasePath: string;

  constructor(options: ShipAvatarCacheOptions) {
    this.cacheDir = options.cacheDir;
    this.publicBasePath = options.publicBasePath ?? "/api/ship-avatar/file";
  }

  imagePath(key: string): string {
    return join(this.cacheDir, imageName(key));
  }

  private jsonPath(key: string): string {
    return join(this.cacheDir, jsonName(key));
  }

  localUrl(key: string): string {
    return `${this.publicBasePath}/${imageName(key)}`;
  }

  async ensureDir(): Promise<void> {
    await mkdir(this.cacheDir, { recursive: true });
  }

  async hasImage(key: string): Promise<boolean> {
    try {
      await access(this.imagePath(key));
      return true;
    } catch {
      return false;
    }
  }

  async read(key: string): Promise<ShipAvatarPayload | null> {
    try {
      const raw = await readFile(this.jsonPath(key), "utf8");
      const entry = JSON.parse(raw) as ShipAvatarPayload;
      const hasImage = await this.hasImage(key);
      if (!hasImage || !entry.imageUrl || entry.fallback) {
        return null;
      }
      return {
        ...entry,
        key: SHIP_AVATAR_KEY,
        imageUrl: this.localUrl(key),
        cached: true,
        fallback: false,
      };
    } catch {
      return null;
    }
  }

  async writeFromRemote(
    key: string,
    payload: ShipAvatarPayload,
    remoteUrl: string,
  ): Promise<ShipAvatarPayload> {
    await this.ensureDir();
    const imageResponse = await fetch(remoteUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download ship avatar (${imageResponse.status})`);
    }
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    await writeFile(this.imagePath(key), imageBuffer);

    const stored: ShipAvatarPayload = {
      ...payload,
      key,
      imageUrl: this.localUrl(key),
      fallback: false,
      cached: true,
    };
    await writeFile(this.jsonPath(key), JSON.stringify(stored, null, 2));
    return stored;
  }
}
