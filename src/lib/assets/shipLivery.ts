const memoryCache = new Map<string, string>();

interface ShipLiveryContext {
  initData?: string;
  telegramUserId?: string;
}

export async function generateShipLivery(
  prompt: string,
  context: ShipLiveryContext = {},
): Promise<{
  textureUrl: string | null;
  error?: string;
}> {
  const trimmed = prompt.trim();
  if (!trimmed) {
    return { textureUrl: null, error: "Describe the livery first." };
  }
  const cached = memoryCache.get(trimmed.toLowerCase());
  if (cached) {
    return { textureUrl: cached };
  }

  const body: Record<string, string> = { prompt: trimmed };
  if (context.initData) body.initData = context.initData;
  if (context.telegramUserId) body.telegramUserId = context.telegramUserId;

  const response = await fetch("/api/ship-livery", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => ({}))) as {
    textureUrl?: string | null;
    error?: string;
  };
  if (payload.textureUrl) {
    memoryCache.set(trimmed.toLowerCase(), payload.textureUrl);
    return { textureUrl: payload.textureUrl };
  }
  if (payload.error) {
    return { textureUrl: null, error: payload.error };
  }
  if (response.status === 502 || response.status === 503) {
    return {
      textureUrl: null,
      error: "Paint API is offline. Keep npm run dev running (Vite + API).",
    };
  }
  return {
    textureUrl: null,
    error: `Livery API ${response.status}`,
  };
}
