import { useEffect, useMemo, useState } from "react";
import type { VoiceEngine } from "./commandBus";
import { createBrowserSpeechStub } from "./xaiVoiceStub";
import { createXaiVoiceEngine } from "./xaiVoiceEngine";
import {
  fetchVoiceStatus,
  offlineVoiceStatus,
  resolveHudVoiceLabel,
  type VoiceStatusResponse,
} from "./voiceApi";

export interface VoiceRuntimeState {
  engine: VoiceEngine;
  status: VoiceStatusResponse;
  hudLabel: string;
  mode: "xai" | "browser" | "text";
  loading: boolean;
}

export function useVoiceRuntime(): VoiceRuntimeState {
  const [status, setStatus] = useState<VoiceStatusResponse | null>(null);
  const browserSpeechAvailable = useMemo(() => {
    return Boolean(
      window.SpeechRecognition ??
        (window as unknown as { webkitSpeechRecognition?: unknown })
          .webkitSpeechRecognition,
    );
  }, []);

  useEffect(() => {
    void fetchVoiceStatus().then(setStatus);
  }, []);

  const mode = status
    ? resolveHudVoiceLabel(status, browserSpeechAvailable).mode
    : browserSpeechAvailable
      ? "browser"
      : "text";

  const engine = useMemo(() => {
    if (mode === "xai") {
      return createXaiVoiceEngine(status?.xaiRealtimeUrl);
    }
    if (mode === "browser") {
      return createBrowserSpeechStub();
    }
    return createBrowserSpeechStub();
  }, [mode, status?.xaiRealtimeUrl]);

  const hudLabel = status
    ? resolveHudVoiceLabel(status, browserSpeechAvailable).label
    : "Voice: checking link...";

  return {
    engine,
    status: status ?? offlineVoiceStatus(),
    hudLabel,
    mode,
    loading: !status,
  };
}
