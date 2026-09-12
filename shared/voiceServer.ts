const XAI_CLIENT_SECRET_URL = "https://api.x.ai/v1/realtime/client_secrets";
export const XAI_REALTIME_WS_URL =
  "wss://api.x.ai/v1/realtime?model=grok-voice-latest";

export interface VoiceStatusPayload {
  xaiConfigured: boolean;
  xaiRealtimeUrl: string;
  falConfigured: boolean;
  recommended: "xai" | "browser" | "text";
  label: string;
}

export interface VoiceTokenPayload {
  token: string | null;
  wsUrl: string;
  expiresAt?: number;
  error?: string;
}

export function buildVoiceStatus(xaiApiKey?: string, falKey?: string): VoiceStatusPayload {
  const xaiConfigured = Boolean(xaiApiKey?.trim());
  const falConfigured = Boolean(falKey?.trim());

  if (xaiConfigured) {
    return {
      xaiConfigured: true,
      xaiRealtimeUrl: XAI_REALTIME_WS_URL,
      falConfigured,
      recommended: "xai",
      label: "x.ai Voice ready",
    };
  }

  return {
    xaiConfigured: false,
    xaiRealtimeUrl: XAI_REALTIME_WS_URL,
    falConfigured,
    recommended: "browser",
    label: "x.ai key missing — browser speech or text fallback",
  };
}

export async function createXaiEphemeralToken(
  xaiApiKey?: string,
): Promise<VoiceTokenPayload> {
  if (!xaiApiKey?.trim()) {
    return {
      token: null,
      wsUrl: XAI_REALTIME_WS_URL,
      error: "XAI_API_KEY not configured",
    };
  }

  try {
    const response = await fetch(XAI_CLIENT_SECRET_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${xaiApiKey.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        expires_after: { seconds: 300 },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        token: null,
        wsUrl: XAI_REALTIME_WS_URL,
        error: `x.ai token ${response.status}: ${errorText.slice(0, 160)}`,
      };
    }

    const data = (await response.json()) as {
      value?: string;
      client_secret?: { value?: string };
      expires_at?: number;
    };

    const token = data.value ?? data.client_secret?.value ?? null;
    return {
      token,
      wsUrl: XAI_REALTIME_WS_URL,
      expiresAt: data.expires_at,
      error: token ? undefined : "x.ai token response missing value",
    };
  } catch (error) {
    return {
      token: null,
      wsUrl: XAI_REALTIME_WS_URL,
      error: error instanceof Error ? error.message : "Token request failed",
    };
  }
}
