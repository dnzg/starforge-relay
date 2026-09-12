import { useEffect, useState } from "react";
import {
  createBrowserSpeechStub,
  createXaiVoiceStub,
  type VoiceEngine,
} from "../../lib/voice";

interface MicButtonProps {
  onVoiceResult: (transcript: string) => Promise<void>;
  onVoiceMock: (transcript: string) => Promise<void>;
  disabled?: boolean;
}

export function MicButton({ onVoiceResult, onVoiceMock, disabled }: MicButtonProps) {
  const [engine] = useState<VoiceEngine>(() => {
    const xai = createXaiVoiceStub();
    const browser = createBrowserSpeechStub();
    return browser.isSupported ? browser : xai;
  });
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
    setListening(true);
    await engine.startListening();
  };

  return (
    <div className="mic-wrap">
      <button
        type="button"
        className={`mic-button ${listening ? "mic-active" : ""}`}
        onClick={() => void toggleMic()}
        disabled={disabled}
        aria-label={listening ? "Stop voice command" : "Start voice command"}
      >
        {listening ? "Listening..." : "Voice Command"}
      </button>
      <button
        type="button"
        className="mic-mock"
        disabled={disabled}
        onClick={() => void onVoiceMock("scan")}
        title="Simulate voice recognition"
      >
        Mock: scan
      </button>
      {error ? <p className="mic-error">{error}</p> : null}
    </div>
  );
}
