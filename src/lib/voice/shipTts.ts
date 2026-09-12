import { createSpeechQueue } from "./shipSpeechQueue";

export interface ShipSpeakResult {
  audioUrl: string | null;
  provider: "fal" | "xai" | "none";
  cached: boolean;
  text: string;
  error?: string;
}

export interface PlayShipTtsOptions {
  onStart?: (text: string) => void;
}

type QueuedSpeech = {
  text: string;
  speech: Promise<ShipSpeakResult>;
  onStart?: (text: string) => void;
};

let currentAudio: HTMLAudioElement | null = null;
let finishCurrent: (() => void) | null = null;
let playbackEpoch = 0;

function stopCurrentAudio(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.removeAttribute("src");
    currentAudio.load();
    currentAudio = null;
  }
  const finish = finishCurrent;
  finishCurrent = null;
  finish?.();
}

async function playQueuedSpeech(item: QueuedSpeech): Promise<boolean> {
  const epoch = playbackEpoch;
  const spoken = await item.speech;
  if (epoch !== playbackEpoch) return false;

  item.onStart?.(item.text);
  if (!spoken.audioUrl) return false;

  const audio = new Audio(spoken.audioUrl);
  currentAudio = audio;

  try {
    await audio.play();
    if (epoch !== playbackEpoch) return false;
    await new Promise<void>((resolve) => {
      const finish = () => {
        audio.removeEventListener("ended", finish);
        audio.removeEventListener("error", finish);
        if (finishCurrent === finish) finishCurrent = null;
        resolve();
      };
      finishCurrent = finish;
      audio.addEventListener("ended", finish);
      audio.addEventListener("error", finish);
    });
    return epoch === playbackEpoch;
  } catch {
    return false;
  } finally {
    if (currentAudio === audio) {
      currentAudio = null;
    }
  }
}

const speechQueue = createSpeechQueue(playQueuedSpeech);

export function stopShipTts(): void {
  playbackEpoch += 1;
  speechQueue.clear();
  stopCurrentAudio();
}

export async function requestShipSpeech(text: string): Promise<ShipSpeakResult> {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (!trimmed) {
    return {
      audioUrl: null,
      provider: "none",
      cached: false,
      text: "",
    };
  }

  try {
    const response = await fetch("/api/voice/speak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: trimmed }),
    });
    if (!response.ok) {
      return {
        audioUrl: null,
        provider: "none",
        cached: false,
        text: trimmed,
        error: `Speak API ${response.status}`,
      };
    }
    const payload = (await response.json()) as ShipSpeakResult;
    return {
      audioUrl: payload.audioUrl ?? null,
      provider: payload.provider ?? "none",
      cached: payload.cached === true,
      text: payload.text ?? trimmed,
      error: payload.error,
    };
  } catch (error) {
    return {
      audioUrl: null,
      provider: "none",
      cached: false,
      text: trimmed,
      error: error instanceof Error ? error.message : "Speak API unavailable",
    };
  }
}

export async function playShipTts(
  text: string,
  options?: PlayShipTtsOptions,
): Promise<boolean> {
  return speechQueue.enqueue({
    text,
    speech: requestShipSpeech(text),
    onStart: options?.onStart,
  });
}
