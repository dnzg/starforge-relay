import { generateFalSectorArtServer } from "./falSectorArtServer.js";

export const SHIP_AVATAR_KEY = "ship-ai-v1";
export const SHIP_AVATAR_SEED = 771001;
export const SHIP_AVATAR_FALLBACK_URL = "/avatars/ship-ai.jpg";

export interface ShipAvatarPayload {
  key: string;
  imageUrl: string;
  fallback: boolean;
  cached: boolean;
  prompt: string;
  error?: string;
  metadata: {
    model: string;
    generatedAt: number;
  };
}

export function buildShipAvatarPrompt(): string {
  return [
    "Cinematic close-up portrait of a female starship computer AI,",
    "original sci-fi character, mid-20s woman, calm intelligent expression,",
    "short sleek dark hair with a faint cyan holographic streak,",
    "subtle bioluminescent circuit lines along the temple,",
    "cool cyan and warm amber cockpit lighting,",
    "holographic HUD reflections in her eyes,",
    "dark navy flight-suit collar, photoreal cinematic,",
    "no text, no logos, no watermark, no helmet,",
    `stable key ${SHIP_AVATAR_KEY}`,
  ].join(" ");
}

export function fallbackShipAvatar(
  error?: string,
  cached = false,
): ShipAvatarPayload {
  return {
    key: SHIP_AVATAR_KEY,
    imageUrl: SHIP_AVATAR_FALLBACK_URL,
    fallback: true,
    cached,
    prompt: buildShipAvatarPrompt(),
    error,
    metadata: {
      model: "checked-in-fallback",
      generatedAt: Date.now(),
    },
  };
}

export async function generateShipAvatarImage(
  falKey?: string,
): Promise<ShipAvatarPayload> {
  const prompt = buildShipAvatarPrompt();
  const generated = await generateFalSectorArtServer(
    SHIP_AVATAR_SEED,
    falKey,
    "planet",
    prompt,
  );

  if (!generated.textureUrl || generated.placeholder) {
    return fallbackShipAvatar(generated.error);
  }

  return {
    key: SHIP_AVATAR_KEY,
    imageUrl: generated.textureUrl,
    fallback: false,
    cached: false,
    prompt,
    metadata: generated.metadata,
  };
}

export async function handleShipAvatarRequest(
  falKey?: string,
  cache?: {
    read(key: string): Promise<ShipAvatarPayload | null>;
    writeFromRemote(
      key: string,
      payload: ShipAvatarPayload,
      remoteUrl: string,
    ): Promise<ShipAvatarPayload>;
  },
): Promise<ShipAvatarPayload> {
  if (cache) {
    const cached = await cache.read(SHIP_AVATAR_KEY);
    if (cached?.imageUrl) {
      return cached;
    }
  }

  const generated = await generateShipAvatarImage(falKey);

  if (!cache || generated.fallback || !generated.imageUrl.startsWith("http")) {
    return generated;
  }

  try {
    return await cache.writeFromRemote(
      SHIP_AVATAR_KEY,
      generated,
      generated.imageUrl,
    );
  } catch {
    return generated;
  }
}
