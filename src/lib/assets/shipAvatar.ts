export const FALLBACK_SHIP_AVATAR_URL = "/avatars/ship-ai.jpg";
export const SHIP_AVATAR_KEY = "ship-ai-v1";

export interface ShipAvatarResult {
  key: string;
  imageUrl: string;
  fallback: boolean;
  cached: boolean;
  prompt?: string;
  error?: string;
}

export async function fetchShipAvatar(): Promise<ShipAvatarResult> {
  try {
    const response = await fetch("/api/ship-avatar");
    if (!response.ok) {
      return {
        key: SHIP_AVATAR_KEY,
        imageUrl: FALLBACK_SHIP_AVATAR_URL,
        fallback: true,
        cached: false,
        error: `Avatar API ${response.status}`,
      };
    }
    const payload = (await response.json()) as Partial<ShipAvatarResult>;
    return {
      key: payload.key ?? SHIP_AVATAR_KEY,
      imageUrl: payload.imageUrl || FALLBACK_SHIP_AVATAR_URL,
      fallback: payload.fallback ?? !payload.imageUrl,
      cached: payload.cached === true,
      prompt: payload.prompt,
      error: payload.error,
    };
  } catch (error) {
    return {
      key: SHIP_AVATAR_KEY,
      imageUrl: FALLBACK_SHIP_AVATAR_URL,
      fallback: true,
      cached: false,
      error: error instanceof Error ? error.message : "Avatar API unavailable",
    };
  }
}
