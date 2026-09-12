import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createLocalGameClient } from "../lib/game/localGameClient";
import type { CommandResult, GameClient } from "../lib/game/types";

interface GameContextValue extends GameClient {
  hyperspaceActive: boolean;
  lastHyperspaceAt: number;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({
  children,
  displayName,
}: {
  children: ReactNode;
  displayName: string;
}) {
  const client = useMemo(() => createLocalGameClient(), []);
  const [, tick] = useState(0);
  const [hyperspaceActive, setHyperspaceActive] = useState(false);
  const [lastHyperspaceAt, setLastHyperspaceAt] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    return client.subscribe(() => tick((n) => n + 1));
  }, [client]);

  useEffect(() => {
    if (started) return;
    setStarted(true);
    void client.startRun(displayName);
  }, [client, displayName, started]);

  const sendCommand = useCallback(
    async (command: string, source: "text" | "voice" = "text") => {
      const result = await client.sendCommand(command, source);
      if (result?.hyperspaceTrigger || result?.run.hyperspaceActive) {
        setHyperspaceActive(true);
        setLastHyperspaceAt(Date.now());
        window.setTimeout(() => setHyperspaceActive(false), 2500);
      }
      return result;
    },
    [client],
  ) as GameClient["sendCommand"];

  const value: GameContextValue = {
    run: client.run,
    logs: client.logs,
    loading: client.loading,
    backend: client.backend,
    startRun: client.startRun.bind(client),
    sendCommand,
    hyperspaceActive,
    lastHyperspaceAt,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) {
    throw new Error("useGame must be used within GameProvider");
  }
  return ctx;
}

export type { CommandResult };
