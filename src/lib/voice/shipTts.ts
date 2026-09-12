export interface ShipSpeakResult {
  audioUrl: string | null;
  provider: "fal" | "xai" | "none";
  cached: boolean;
  text: string;
  error?: string;
}

let currentAudio: HTMLAudioElement | null = null;
let playGeneration = 0;

export function stopShipTts(): void {
  playGeneration += 1;
  if (!currentAudio) return;
  currentAudio.pause();
  currentAudio.removeAttribute("src");
  currentAudio.load();
  currentAudio = null;
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

export async function playShipTts(text: string): Promise<boolean> {
  const generation = ++playGeneration;
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.removeAttribute("src");
    currentAudio.load();
    currentAudio = null;
  }

  const spoken = await requestShipSpeech(text);
  if (generation !== playGeneration) return false;
  if (!spoken.audioUrl) return false;

  const audio = new Audio(spoken.audioUrl);
  currentAudio = audio;

  try {
    await audio.play();
    await new Promise<void>((resolve) => {
      const finish = () => {
        audio.removeEventListener("ended", finish);
        audio.removeEventListener("error", finish);
        resolve();
      };
      audio.addEventListener("ended", finish);
      audio.addEventListener("error", finish);
    });
    return generation === playGeneration;
  } catch {
    return false;
  } finally {
    if (currentAudio === audio) {
      currentAudio = null;
    }
  }
}
