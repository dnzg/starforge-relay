import { useEffect, useState } from "react";
import { useVoiceRuntime } from "../../lib/voice";

interface MicButtonProps {
  onVoiceResult: (transcript: string) => Promise<void>;
  onVoiceMock: (transcript: string) => Promise<void>;
  disabled?: boolean;
}

export function MicButton({
  onVoiceResult,
  onVoiceMock,
  disabled,
}: MicButtonProps) {
  const { engine, mode, loading } = useVoiceRuntime();
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const offResult = engine.onResult((result) => {
      if (result.isFinal && result.transcript.trim()) {
        setListening(false);
        engine.stopListening();
        void onVoiceResult(result.transcript);
      }
    });
    const offError = engine.onError((message) => {
      setError(message);
      setListening(false);
    });
    return () => {
      offResult();
      offError();
    };
  }, [engine, onVoiceResult]);

  const toggleMic = async () => {
    setError(null);
    if (listening) {
      engine.stopListening();
      setListening(false);
      return;
    }
    if (mode === "text") {
      void onVoiceMock("scan the sector");
      return;
    }
    setListening(true);
    await engine.startListening();
  };

  const voiceUnavailable = mode === "text";

  return (
    <div className="mic-wrap">
      <button
        type="button"
        className={`mic-button ${listening ? "mic-active" : ""}`}
        onClick={() => void toggleMic()}
        disabled={disabled || loading}
        aria-label={
          listening
            ? "Stop voice command"
            : voiceUnavailable
              ? "Mock scan the sector"
              : "Start voice command"
        }
        title={voiceUnavailable ? "Voice offline — tap to mock scan" : undefined}
      >
        <span className={`mic-icon ${listening ? "is-active" : ""}`} aria-hidden="true">
          <span className="mic-icon-idle">●</span>
          <span className="mic-icon-live">◉</span>
        </span>
      </button>
      {error ? <p className="mic-error">{error}</p> : null}
    </div>
  );
}
