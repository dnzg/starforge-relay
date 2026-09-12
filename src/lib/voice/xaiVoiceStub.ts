import type { VoiceEngine, VoiceRecognitionResult } from "./commandBus";

/**
 * Stub for x.ai Voice integration.
 * Replace startListening/stopListening with x.ai realtime API calls.
 *
 * Required env: XAI_API_KEY
 */
export function createXaiVoiceStub(): VoiceEngine {
  const resultListeners = new Set<(r: VoiceRecognitionResult) => void>();
  const errorListeners = new Set<(e: string) => void>();
  let listening = false;

  return {
    isSupported: false,

    async startListening() {
      if (listening) return;
      listening = true;
      errorListeners.forEach((cb) =>
        cb("x.ai Voice not configured. Use text commands or voice mock."),
      );
      listening = false;
    },

    stopListening() {
      listening = false;
    },

    onResult(callback) {
      resultListeners.add(callback);
      return () => resultListeners.delete(callback);
    },

    onError(callback) {
      errorListeners.add(callback);
      return () => errorListeners.delete(callback);
    },
  };
}

export function createBrowserSpeechStub(): VoiceEngine {
  const SpeechRecognitionCtor =
    window.SpeechRecognition ??
    (window as unknown as { webkitSpeechRecognition?: typeof SpeechRecognition })
      .webkitSpeechRecognition;

  if (!SpeechRecognitionCtor) {
    return createXaiVoiceStub();
  }

  const resultListeners = new Set<(r: VoiceRecognitionResult) => void>();
  const errorListeners = new Set<(e: string) => void>();
  let recognition: SpeechRecognition | null = null;

  return {
    isSupported: true,

    async startListening() {
      recognition = new SpeechRecognitionCtor();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const last = event.results[event.results.length - 1];
        const transcript = last[0].transcript;
        resultListeners.forEach((cb) =>
          cb({
            transcript,
            confidence: last[0].confidence,
            isFinal: last.isFinal,
          }),
        );
      };

      recognition.onerror = (event: Event & { error?: string }) => {
        errorListeners.forEach((cb) =>
          cb(event.error ?? "Speech recognition failed"),
        );
      };

      recognition.start();
    },

    stopListening() {
      recognition?.stop();
      recognition = null;
    },

    onResult(callback) {
      resultListeners.add(callback);
      return () => resultListeners.delete(callback);
    },

    onError(callback) {
      errorListeners.add(callback);
      return () => errorListeners.delete(callback);
    },
  };
}
