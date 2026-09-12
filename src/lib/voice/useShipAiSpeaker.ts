import { useEffect, useRef, useState } from "react";
import { useGame } from "../../providers/GameProvider";
import {
  FALLBACK_SHIP_AVATAR_URL,
  fetchShipAvatar,
} from "../assets/shipAvatar";
import { fetchVoiceStatus } from "./voiceApi";
import { playShipTts, stopShipTts } from "./shipTts";

let spokenLogCount = 0;
let speakJobs = 0;

export interface ShipAiSpeakerState {
  avatarUrl: string;
  avatarFallback: boolean;
  speaking: boolean;
  line: string | null;
  ttsAvailable: boolean;
}

export function useShipAiSpeaker(): ShipAiSpeakerState {
  const { logs } = useGame();
  const [avatarUrl, setAvatarUrl] = useState(FALLBACK_SHIP_AVATAR_URL);
  const [avatarFallback, setAvatarFallback] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const [line, setLine] = useState<string | null>(null);
  const [ttsAvailable, setTtsAvailable] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    void fetchShipAvatar().then((avatar) => {
      setAvatarUrl(avatar.imageUrl || FALLBACK_SHIP_AVATAR_URL);
      setAvatarFallback(avatar.fallback);
    });
    void fetchVoiceStatus().then((status) => {
      setTtsAvailable(status.ttsConfigured);
    });
    return () => {
      mountedRef.current = false;
      stopShipTts();
    };
  }, []);

  useEffect(() => {
    if (logs.length < spokenLogCount) {
      spokenLogCount = 0;
    }
    if (logs.length <= spokenLogCount) return;

    const pending = logs.slice(spokenLogCount);
    spokenLogCount = logs.length;

    for (const entry of pending) {
      const spoken = entry.response?.replace(/\s+/g, " ").trim();
      if (!spoken) continue;

      speakJobs += 1;
      if (mountedRef.current) setSpeaking(true);

      void playShipTts(spoken, {
        onStart: (text) => {
          if (mountedRef.current) setLine(text);
        },
      }).finally(() => {
        speakJobs = Math.max(0, speakJobs - 1);
        if (speakJobs === 0 && mountedRef.current) {
          setSpeaking(false);
        }
      });
    }
  }, [logs]);

  return {
    avatarUrl,
    avatarFallback,
    speaking,
    line,
    ttsAvailable,
  };
}
