export const SHIP_TTS_VOICE = "ara";
export const SHIP_TTS_LANGUAGE = "en";

const FAL_TTS_MODEL = "xai/tts/v1";
const FAL_TTS_ENDPOINT = `https://fal.run/${FAL_TTS_MODEL}`;
const XAI_TTS_ENDPOINT = "https://api.x.ai/v1/tts";
const MAX_TTS_CHARS = 280;

export type ShipTtsProvider = "fal" | "xai" | "none";

export interface ShipTtsPayload {
  audioUrl: string | null;
  provider: ShipTtsProvider;
  cached: boolean;
  text: string;
  error?: string;
}

export interface ShipTtsSynthesis {
  text: string;
  provider: ShipTtsProvider;
  remoteUrl?: string;
  bytes?: Uint8Array;
  contentType: string;
  error?: string;
}

export function prepareTtsText(raw: string): string {
  const collapsed = raw.replace(/\s+/g, " ").trim();
  if (collapsed.length < 2) return "";
  if (collapsed.length <= MAX_TTS_CHARS) return collapsed;
  const sliced = collapsed.slice(0, MAX_TTS_CHARS);
  const sentence = sliced.match(/^(.*[.!?])\s/);
  return (sentence?.[1] ?? sliced).trim();
}

async function synthesizeViaFal(
  text: string,
  falKey: string,
): Promise<ShipTtsSynthesis> {
  const response = await fetch(FAL_TTS_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Key ${falKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      voice: SHIP_TTS_VOICE,
      language: SHIP_TTS_LANGUAGE,
    }),
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return {
      text,
      provider: "none",
      contentType: "audio/mpeg",
      error: `Fal TTS ${response.status}: ${errorText.slice(0, 160)}`,
    };
  }

  const data = (await response.json()) as {
    audio?: { url?: string };
    url?: string;
  };
  const remoteUrl = data.audio?.url ?? data.url;
  if (!remoteUrl) {
    return {
      text,
      provider: "none",
      contentType: "audio/mpeg",
      error: "Fal TTS response missing audio URL",
    };
  }

  return {
    text,
    provider: "fal",
    remoteUrl,
    contentType: "audio/mpeg",
  };
}

async function synthesizeViaXai(
  text: string,
  xaiApiKey: string,
): Promise<ShipTtsSynthesis> {
  const response = await fetch(XAI_TTS_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${xaiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      voice_id: SHIP_TTS_VOICE,
      language: SHIP_TTS_LANGUAGE,
    }),
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return {
      text,
      provider: "none",
      contentType: "audio/mpeg",
      error: `x.ai TTS ${response.status}: ${errorText.slice(0, 160)}`,
    };
  }

  const contentType = response.headers.get("content-type") ?? "audio/mpeg";
  if (contentType.includes("application/json")) {
    const errorText = await response.text();
    return {
      text,
      provider: "none",
      contentType: "audio/mpeg",
      error: `x.ai TTS returned JSON: ${errorText.slice(0, 160)}`,
    };
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength < 32) {
    return {
      text,
      provider: "none",
      contentType: "audio/mpeg",
      error: "x.ai TTS returned empty audio",
    };
  }

  return {
    text,
    provider: "xai",
    bytes,
    contentType: contentType.includes("audio/") ? contentType : "audio/mpeg",
  };
}

export async function synthesizeShipSpeech(
  rawText: string,
  falKey?: string,
  xaiApiKey?: string,
): Promise<ShipTtsSynthesis> {
  const text = prepareTtsText(rawText);
  if (!text) {
    return {
      text: "",
      provider: "none",
      contentType: "audio/mpeg",
      error: "empty speech text",
    };
  }

  let lastError: string | undefined;

  if (falKey?.trim()) {
    try {
      const fal = await synthesizeViaFal(text, falKey.trim());
      if (fal.provider === "fal") return fal;
      lastError = fal.error;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }

  if (xaiApiKey?.trim()) {
    try {
      const xai = await synthesizeViaXai(text, xaiApiKey.trim());
      if (xai.provider === "xai") return xai;
      lastError = xai.error ?? lastError;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }

  return {
    text,
    provider: "none",
    contentType: "audio/mpeg",
    error: lastError,
  };
}

export function silentShipTts(text: string, error?: string): ShipTtsPayload {
  return {
    audioUrl: null,
    provider: "none",
    cached: false,
    text: prepareTtsText(text),
    error,
  };
}
