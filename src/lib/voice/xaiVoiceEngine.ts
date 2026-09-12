import type { VoiceEngine, VoiceRecognitionResult } from "./commandBus";

const XAI_REALTIME_WS_URL =
  "wss://api.x.ai/v1/realtime?model=grok-voice-latest";

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function floatTo16BitPCM(input: Float32Array): ArrayBuffer {
  const buffer = new ArrayBuffer(input.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < input.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, input[i]));
    view.setInt16(i * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
  }
  return buffer;
}

function extractTranscript(payload: Record<string, unknown>): string | null {
  const direct =
    (payload.transcript as string | undefined) ??
    (payload.text as string | undefined);
  if (direct?.trim()) return direct.trim();

  const item = payload.item as { transcript?: string } | undefined;
  if (item?.transcript?.trim()) return item.transcript.trim();

  return null;
}

export function createXaiVoiceEngine(wsUrl = XAI_REALTIME_WS_URL): VoiceEngine {
  const resultListeners = new Set<(r: VoiceRecognitionResult) => void>();
  const errorListeners = new Set<(e: string) => void>();

  let ws: WebSocket | null = null;
  let mediaStream: MediaStream | null = null;
  let audioContext: AudioContext | null = null;
  let processor: ScriptProcessorNode | null = null;
  let sourceNode: MediaStreamAudioSourceNode | null = null;
  let listening = false;
  let deliveredFinal = false;

  const cleanup = () => {
    processor?.disconnect();
    sourceNode?.disconnect();
    processor = null;
    sourceNode = null;
    if (audioContext) {
      void audioContext.close();
      audioContext = null;
    }
    mediaStream?.getTracks().forEach((track) => track.stop());
    mediaStream = null;
    if (ws && ws.readyState <= WebSocket.OPEN) {
      ws.close();
    }
    ws = null;
    listening = false;
  };

  const emitResult = (transcript: string, isFinal: boolean) => {
    resultListeners.forEach((cb) =>
      cb({ transcript, confidence: 1, isFinal }),
    );
  };

  return {
    isSupported: true,

    async startListening() {
      if (listening) return;
      deliveredFinal = false;
      listening = true;

      try {
        const tokenResponse = await fetch("/api/voice/token", { method: "POST" });
        const tokenPayload = (await tokenResponse.json()) as {
          token?: string;
          wsUrl?: string;
          error?: string;
        };

        if (!tokenResponse.ok || !tokenPayload.token) {
          throw new Error(tokenPayload.error ?? "x.ai Voice token unavailable");
        }

        const socketUrl = tokenPayload.wsUrl ?? wsUrl;
        ws = new WebSocket(socketUrl, [`xai-client-secret.${tokenPayload.token}`]);

        await new Promise<void>((resolve, reject) => {
          if (!ws) return reject(new Error("WebSocket not initialized"));
          ws.onopen = () => resolve();
          ws.onerror = () => reject(new Error("x.ai Voice connection failed"));
        });

        ws.onmessage = (event) => {
          try {
            const payload = JSON.parse(String(event.data)) as Record<
              string,
              unknown
            >;
            const type = String(payload.type ?? "");
            if (
              type.includes("input_audio_transcription") &&
              (type.endsWith(".completed") || type.endsWith(".done"))
            ) {
              const transcript = extractTranscript(payload);
              if (transcript) {
                deliveredFinal = true;
                emitResult(transcript, true);
                cleanup();
              }
            }
          } catch {
            // ignore malformed websocket payloads
          }
        };

        ws.onerror = () => {
          errorListeners.forEach((cb) =>
            cb("x.ai Voice stream error. Falling back to text commands."),
          );
          cleanup();
        };

        ws.send(
          JSON.stringify({
            type: "session.update",
            session: {
              voice: "ara",
              instructions:
                "You are Starforge Relay ship AI. Transcribe bridge commands accurately: scan, hail, engage, flee, status, jump.",
              turn_detection: { type: "server_vad" },
              input_audio_transcription: { model: "whisper-1" },
            },
          }),
        );

        mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
          },
        });

        audioContext = new AudioContext();
        const inputRate = audioContext.sampleRate;
        sourceNode = audioContext.createMediaStreamSource(mediaStream);
        processor = audioContext.createScriptProcessor(4096, 1, 1);
        processor.onaudioprocess = (audioEvent) => {
          if (!ws || ws.readyState !== WebSocket.OPEN) return;
          const input = audioEvent.inputBuffer.getChannelData(0);
          const downsampled = downsampleBuffer(input, inputRate, 24000);
          const pcm = floatTo16BitPCM(downsampled);
          ws.send(
            JSON.stringify({
              type: "input_audio_buffer.append",
              audio: arrayBufferToBase64(pcm),
            }),
          );
        };

        sourceNode.connect(processor);
        processor.connect(audioContext.destination);

        window.setTimeout(() => {
          if (!listening || deliveredFinal) return;
          ws?.send(JSON.stringify({ type: "input_audio_buffer.commit" }));
        }, 3500);

        window.setTimeout(() => {
          if (!listening || deliveredFinal) return;
          cleanup();
          errorListeners.forEach((cb) =>
            cb("No speech detected. Try again or type a command."),
          );
        }, 12000);
      } catch (error) {
        cleanup();
        errorListeners.forEach((cb) =>
          cb(
            error instanceof Error
              ? error.message
              : "x.ai Voice unavailable",
          ),
        );
      }
    },

    stopListening() {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "input_audio_buffer.commit" }));
      }
      cleanup();
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

function downsampleBuffer(
  buffer: Float32Array,
  inputRate: number,
  outputRate: number,
): Float32Array {
  if (outputRate === inputRate) return buffer;
  const ratio = inputRate / outputRate;
  const newLength = Math.round(buffer.length / ratio);
  const result = new Float32Array(newLength);
  let offset = 0;
  for (let i = 0; i < newLength; i += 1) {
    const nextOffset = Math.round((i + 1) * ratio);
    let sum = 0;
    let count = 0;
    for (let j = offset; j < nextOffset && j < buffer.length; j += 1) {
      sum += buffer[j];
      count += 1;
    }
    result[i] = count > 0 ? sum / count : 0;
    offset = nextOffset;
  }
  return result;
}
