export type SectorArtKind = "planet" | "sky";

export interface FalSectorArtPayload {
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

export interface SectorArtCacheAdapter {
  read(
    seed: number,
    kind?: SectorArtKind,
  ): Promise<FalSectorArtPayload | null>;
  writeFromRemote(
    seed: number,
    payload: Omit<FalSectorArtPayload, "cached">,
    remoteUrl: string,
    kind?: SectorArtKind,
  ): Promise<FalSectorArtPayload>;
  writePlaceholder(
    seed: number,
    payload: Omit<FalSectorArtPayload, "cached">,
    kind?: SectorArtKind,
  ): Promise<FalSectorArtPayload>;
}

const FAL_MODEL = "fal-ai/flux/schnell";
const FAL_ENDPOINT = `https://fal.run/${FAL_MODEL}`;

export function buildPlanetPrompt(seed: number): string {
  return [
    "Seamless sci-fi desert planet surface texture map,",
    "crystalline sand dunes, rust amber and deep violet canyons,",
    "cinematic space opera mood, equirectangular-friendly,",
    "no text, no logos, no characters, original IP,",
    `seed ${seed}`,
  ].join(" ");
}

export function buildSkyPrompt(seed: number): string {
  const palettes = [
    "crimson nebula and graphite dust lanes",
    "violet hydrogen clouds and gold starlight",
    "teal ion storms over deep indigo void",
    "ember-orange nebula with cold blue stars",
  ];
  const palette = palettes[Math.abs(seed) % palettes.length];
  return [
    "Cinematic deep space sky painting, full-frame nebula vista,",
    palette,
    "soft volumetric clouds, distant galaxies, no planet, no ship,",
    "no text, no logos, no UI, original IP, dark edges for skybox,",
    `seed ${seed}`,
  ].join(" ");
}

export async function generateFalSectorArtServer(
  seed: number,
  falKey?: string,
  kind: SectorArtKind = "planet",
  customPrompt?: string,
): Promise<FalSectorArtPayload> {
  const prompt =
    customPrompt ?? (kind === "sky" ? buildSkyPrompt(seed) : buildPlanetPrompt(seed));
  const metadata = { model: FAL_MODEL, generatedAt: Date.now() };

  if (!falKey?.trim()) {
    return {
      seed,
      kind,
      textureUrl: null,
      placeholder: true,
      prompt,
      error: "FAL_KEY not configured",
      cached: false,
      metadata: { ...metadata, model: "procedural-placeholder" },
    };
  }

  try {
    const response = await fetch(FAL_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Key ${falKey.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        seed,
        num_inference_steps: 4,
        image_size: "square_hd",
        num_images: 1,
        output_format: "jpeg",
        enable_safety_checker: true,
      }),
      signal: AbortSignal.timeout(25_000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        seed,
        kind,
        textureUrl: null,
        placeholder: true,
        prompt,
        error: `Fal API ${response.status}: ${errorText.slice(0, 180)}`,
        cached: false,
        metadata,
      };
    }

    const data = (await response.json()) as {
      images?: Array<{ url?: string }>;
    };
    const textureUrl = data.images?.[0]?.url ?? null;

    return {
      seed,
      kind,
      textureUrl,
      placeholder: !textureUrl,
      prompt,
      cached: false,
      metadata,
    };
  } catch (error) {
    return {
      seed,
      kind,
      textureUrl: null,
      placeholder: true,
      prompt,
      error: error instanceof Error ? error.message : String(error),
      cached: false,
      metadata,
    };
  }
}

export function buildShipLiveryPrompt(userPrompt: string): string {
  const brief = userPrompt.trim();
  return [
    `${brief} seamless tileable 2D hull paint texture,`,
    "full-bleed square albedo, the described colors cover every pixel,",
    "repeating aircraft enamel with faint panel lines only,",
    "flat even lighting, no 3D object, no vehicle, no studio backdrop,",
    "no vignette, no empty margins, no text, no logos, original IP",
  ].join(" ");
}

function hashPrompt(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash) % 1_000_000_000;
}

export async function handleShipLiveryRequest(
  body: string,
  falKey?: string,
): Promise<FalSectorArtPayload> {
  let prompt = "graphite titanium hull with a thin crimson stripe";
  let seed = hashPrompt(prompt);
  if (body) {
    try {
      const parsed = JSON.parse(body) as { prompt?: string; seed?: number };
      if (parsed.prompt?.trim()) prompt = parsed.prompt.trim();
      if (typeof parsed.seed === "number" && Number.isFinite(parsed.seed)) {
        seed = Math.floor(parsed.seed);
      } else {
        seed = hashPrompt(prompt);
      }
    } catch {
      // keep defaults
    }
  }

  const wrapped = buildShipLiveryPrompt(prompt);
  return generateFalSectorArtServer(seed, falKey, "planet", wrapped);
}

export async function handleSectorArtRequest(
  body: string,
  falKey?: string,
  cache?: SectorArtCacheAdapter,
): Promise<FalSectorArtPayload> {
  let seed = Math.floor(Math.random() * 1_000_000);
  let kind: SectorArtKind = "planet";
  if (body) {
    try {
      const parsed = JSON.parse(body) as { seed?: number; kind?: SectorArtKind };
      if (typeof parsed.seed === "number" && Number.isFinite(parsed.seed)) {
        seed = Math.floor(parsed.seed);
      }
      if (parsed.kind === "sky" || parsed.kind === "planet") {
        kind = parsed.kind;
      }
    } catch {
      // ignore malformed JSON and use random seed
    }
  }

  if (cache) {
    const cached = await cache.read(seed, kind);
    if (cached?.textureUrl) {
      return cached;
    }
  }

  const generated = await generateFalSectorArtServer(seed, falKey, kind);

  if (!cache) {
    return generated;
  }

  if (generated.textureUrl && !generated.placeholder) {
    try {
      return await cache.writeFromRemote(seed, generated, generated.textureUrl, kind);
    } catch {
      return generated;
    }
  }

  if (generated.placeholder && generated.error?.includes("FAL_KEY")) {
    return generated;
  }

  try {
    return await cache.writePlaceholder(seed, generated, kind);
  } catch {
    return generated;
  }
}
