import { useEffect, useState } from "react";
import { useVoiceRuntime } from "../../lib/voice";

interface MicButtonProps {
  onVoiceResult: (transcript: string) => Promise<void>;
  onVoiceMock: (transcript: string) => Promise<void>;
  onListeningChange?: (
    listening: boolean,
    reason?: "cancel" | "result",
  ) => void;
  onHeardText?: (text: string) => void;
  phase?: "idle" | "listening" | "processing";
  disabled?: boolean;
}

export function MicButton({
  onVoiceResult,
  onVoiceMock,
  onListeningChange,
  onHeardText,
  phase = "idle",
  disabled,
}: MicButtonProps) {
  const { engine, mode, loading } = useVoiceRuntime();
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const offResult = engine.onResult((result) => {
      const text = result.transcript.trim();
      if (!text) return;
      onHeardText?.(text);
      if (result.isFinal) {
        setListening(false);
        onListeningChange?.(false, "result");
        engine.stopListening();
        void onVoiceResult(text);
      }
    });
    const offError = engine.onError((message) => {
      setError(message);
      setListening(false);
      onListeningChange?.(false, "cancel");
    });
    return () => {
      offResult();
      offError();
    };
  }, [engine, onHeardText, onListeningChange, onVoiceResult]);

  const toggleMic = async () => {
    setError(null);
    if (listening) {
      engine.stopListening();
      setListening(false);
      onListeningChange?.(false, "cancel");
      return;
    }
    if (mode === "text") {
      onHeardText?.("scan the sector");
      void onVoiceMock("scan the sector");
      return;
    }
    setListening(true);
    onListeningChange?.(true);
    await engine.startListening();
  };

  const voiceUnavailable = mode === "text";
  const live = phase !== "idle" || listening;

  return (
    <div className="mic-wrap">
      <button
        type="button"
        className={`mic-button ${live ? "is-live" : ""} ${phase === "processing" ? "is-working" : ""}`}
        onClick={() => void toggleMic()}
        disabled={disabled || loading || phase === "processing"}
        aria-label={
          listening
            ? "Stop voice command"
            : phase === "processing"
              ? "Working on that command"
              : voiceUnavailable
                ? "Mock scan the sector"
                : "Start voice command"
        }
        title={voiceUnavailable ? "Voice offline — tap to mock scan" : undefined}
      >
        <span className={`mic-wave ${live ? "is-live" : ""}`} aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      </button>
      {error ? <p className="mic-error">{error}</p> : null}
    </div>
  );
}
