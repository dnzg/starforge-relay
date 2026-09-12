export interface VoiceStatusResponse {
  xaiConfigured: boolean;
  xaiRealtimeUrl: string;
  falConfigured: boolean;
  recommended: "xai" | "browser" | "text";
  label: string;
}

export interface VoiceInterpretResponse {
  command: string | null;
  shipReply: string;
  source: "local" | "xai" | "fallback";
}

export async function fetchVoiceStatus(): Promise<VoiceStatusResponse> {
  try {
    const response = await fetch("/api/voice/status");
    if (!response.ok) throw new Error("status unavailable");
    return (await response.json()) as VoiceStatusResponse;
  } catch {
    return {
      xaiConfigured: false,
      xaiRealtimeUrl: "wss://api.x.ai/v1/realtime?model=grok-voice-latest",
      falConfigured: false,
      recommended: "text",
      label: "Voice API offline — text commands available",
    };
  }
}

export interface ShipTalkContext {
  captainName?: string;
  pronouns?: string;
  sectorName?: string;
  hull?: number;
  shields?: number;
  threatLevel?: number;
  sectorKills?: number;
}

export async function interpretVoiceTranscript(
  text: string,
  context?: ShipTalkContext,
): Promise<VoiceInterpretResponse> {
  try {
    const response = await fetch("/api/voice/interpret", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, context }),
    });
    if (!response.ok) {
      return {
        command: null,
        shipReply: "Ship AI link unavailable. Use direct commands.",
        source: "fallback",
      };
    }
    return (await response.json()) as VoiceInterpretResponse;
  } catch {
    return {
      command: null,
      shipReply: "Ship AI offline. Type scan, hail, engage, flee, status, or jump.",
      source: "fallback",
    };
  }
}

export function resolveHudVoiceLabel(
  status: VoiceStatusResponse,
  browserSpeechAvailable: boolean,
): { mode: "xai" | "browser" | "text"; label: string } {
  if (status.recommended === "xai" && status.xaiConfigured) {
    return { mode: "xai", label: "Voice: x.ai connected" };
  }
  if (browserSpeechAvailable) {
    return {
      mode: "browser",
      label: "Voice: browser speech fallback (x.ai key missing)",
    };
  }
  return { mode: "text", label: "Voice: text commands only" };
}
