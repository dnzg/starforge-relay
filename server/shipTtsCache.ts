import { createHash } from "node:crypto";
import { access, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { ShipTtsPayload, ShipTtsProvider } from "../shared/shipTtsServer.js";

export interface ShipTtsCacheOptions {
  cacheDir: string;
  publicBasePath?: string;
}

export function hashTtsText(text: string): string {
  return createHash("sha256")
    .update(`ara|en|v1|${text}`)
    .digest("hex")
    .slice(0, 24);
}

export class ShipTtsCache {
  private readonly cacheDir: string;
  private readonly publicBasePath: string;

  constructor(options: ShipTtsCacheOptions) {
    this.cacheDir = options.cacheDir;
    this.publicBasePath = options.publicBasePath ?? "/api/voice/tts";
  }

  audioPath(hash: string): string {
    return join(this.cacheDir, `${hash}.mp3`);
  }

  localUrl(hash: string): string {
    return `${this.publicBasePath}/${hash}.mp3`;
  }

  async ensureDir(): Promise<void> {
    await mkdir(this.cacheDir, { recursive: true });
  }

  async hasAudio(hash: string): Promise<boolean> {
    try {
      await access(this.audioPath(hash));
      return true;
    } catch {
      return false;
    }
  }

  async read(hash: string, text: string): Promise<ShipTtsPayload | null> {
    if (!(await this.hasAudio(hash))) return null;
    return {
      audioUrl: this.localUrl(hash),
      provider: "fal",
      cached: true,
      text,
    };
  }

  async writeBytes(
    hash: string,
    text: string,
    bytes: Uint8Array,
    provider: ShipTtsProvider,
  ): Promise<ShipTtsPayload> {
    await this.ensureDir();
    await writeFile(this.audioPath(hash), Buffer.from(bytes));
    return {
      audioUrl: this.localUrl(hash),
      provider,
      cached: false,
      text,
    };
  }

  async writeFromRemote(
    hash: string,
    text: string,
    remoteUrl: string,
    provider: ShipTtsProvider,
  ): Promise<ShipTtsPayload> {
    const response = await fetch(remoteUrl);
    if (!response.ok) {
      throw new Error(`Failed to download TTS audio (${response.status})`);
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    return this.writeBytes(hash, text, bytes, provider);
  }
}
