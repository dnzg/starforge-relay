const memoryCache = new Map<string, string>();

export async function generateShipLivery(prompt: string): Promise<{
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

  const response = await fetch("/api/ship-livery", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: trimmed }),
  });
  if (!response.ok) {
    return { textureUrl: null, error: `Livery API ${response.status}` };
  }
  const payload = (await response.json()) as {
    textureUrl?: string | null;
    error?: string;
  };
  if (payload.textureUrl) {
    memoryCache.set(trimmed.toLowerCase(), payload.textureUrl);
  }
  return {
    textureUrl: payload.textureUrl ?? null,
    error: payload.error,
  };
}
