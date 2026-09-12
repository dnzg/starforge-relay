export interface VoiceRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

export interface VoiceEngine {
  isSupported: boolean;
  startListening: () => Promise<void>;
  stopListening: () => void;
  onResult: (callback: (result: VoiceRecognitionResult) => void) => () => void;
  onError: (callback: (error: string) => void) => () => void;
}

export type CommandHandler = (
  command: string,
  source: "text" | "voice",
) => Promise<void>;

export interface VoiceCommandBus {
  submitText: (text: string) => Promise<void>;
  submitVoiceMock: (transcript: string) => Promise<void>;
  attachEngine: (engine: VoiceEngine | null) => void;
}

export function createCommandBus(handler: CommandHandler): VoiceCommandBus {
  let attachedEngine: VoiceEngine | null = null;

  return {
    async submitText(text: string) {
      const trimmed = text.trim();
      if (!trimmed) return;
      await handler(trimmed, "text");
    },

    async submitVoiceMock(transcript: string) {
      const trimmed = transcript.trim();
      if (!trimmed) return;
      await handler(trimmed, "voice");
    },

    attachEngine(next: VoiceEngine | null) {
      attachedEngine = next;
      void attachedEngine;
    },
  };
}
