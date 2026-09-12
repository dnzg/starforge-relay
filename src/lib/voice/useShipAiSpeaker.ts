import { useEffect, useState } from "react";
import { useGame } from "../../providers/GameProvider";
import {
  FALLBACK_SHIP_AVATAR_URL,
  fetchShipAvatar,
} from "../assets/shipAvatar";
import { fetchVoiceStatus } from "./voiceApi";
import { playShipTts, stopShipTts } from "./shipTts";

let lastSpokenTimestamp = 0;

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

  useEffect(() => {
    void fetchShipAvatar().then((avatar) => {
      setAvatarUrl(avatar.imageUrl || FALLBACK_SHIP_AVATAR_URL);
      setAvatarFallback(avatar.fallback);
    });
    void fetchVoiceStatus().then((status) => {
      setTtsAvailable(status.ttsConfigured);
    });
    return () => stopShipTts();
  }, []);

  useEffect(() => {
    const latest = logs[logs.length - 1];
    if (!latest?.response?.trim()) return;
    if (latest.timestamp === lastSpokenTimestamp) return;
    lastSpokenTimestamp = latest.timestamp;

    const spoken = latest.response.replace(/\s+/g, " ").trim();
    setLine(spoken);
    setSpeaking(true);

    void playShipTts(spoken).finally(() => {
      if (lastSpokenTimestamp === latest.timestamp) {
        setSpeaking(false);
      }
    });
  }, [logs]);

  return {
    avatarUrl,
    avatarFallback,
    speaking,
    line,
    ttsAvailable,
  };
}
