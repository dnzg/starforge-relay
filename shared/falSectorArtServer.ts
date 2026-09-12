export interface FalSectorArtPayload {
  seed: number;
  textureUrl: string | null;
  placeholder: boolean;
  prompt: string;
  error?: string;
  metadata: {
    model: string;
    generatedAt: number;
  };
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

export async function generateFalSectorArtServer(
  seed: number,
  falKey?: string,
): Promise<FalSectorArtPayload> {
  const prompt = buildPlanetPrompt(seed);
  const metadata = { model: FAL_MODEL, generatedAt: Date.now() };

  if (!falKey?.trim()) {
    return {
      seed,
      textureUrl: null,
      placeholder: true,
      prompt,
      error: "FAL_KEY not configured",
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
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        seed,
        textureUrl: null,
        placeholder: true,
        prompt,
        error: `Fal API ${response.status}: ${errorText.slice(0, 180)}`,
        metadata,
      };
    }

    const data = (await response.json()) as {
      images?: Array<{ url?: string }>;
    };
    const textureUrl = data.images?.[0]?.url ?? null;

    return {
      seed,
      textureUrl,
      placeholder: !textureUrl,
      prompt,
      metadata,
    };
  } catch (error) {
    return {
      seed,
      textureUrl: null,
      placeholder: true,
      prompt,
      error: error instanceof Error ? error.message : String(error),
      metadata,
    };
  }
}

export async function handleSectorArtRequest(
  body: string,
  falKey?: string,
): Promise<FalSectorArtPayload> {
  let seed = Math.floor(Math.random() * 1_000_000);
  if (body) {
    try {
      const parsed = JSON.parse(body) as { seed?: number };
      if (typeof parsed.seed === "number" && Number.isFinite(parsed.seed)) {
        seed = Math.floor(parsed.seed);
      }
    } catch {
      // ignore malformed JSON and use random seed
    }
  }
  return generateFalSectorArtServer(seed, falKey);
}
