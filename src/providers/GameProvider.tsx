import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { generateSectorArt } from "../lib/assets/falSectorArt";
import { createLocalGameClient } from "../lib/game/localGameClient";
import type { CommandResult, GameClient, RunState } from "../lib/game/types";
import { generateSectorPackage } from "../lib/sector/sectorPackage";
import type { CombatCallbacks } from "../components/scene/arcade/types";

interface GameContextValue extends GameClient {
  hyperspaceActive: boolean;
  lastHyperspaceAt: number;
  textureLoading: boolean;
  textureStatus: string;
  textureCached: boolean;
  combatScore: number;
  combatCallbacks: CombatCallbacks;
  appendShipMessage: (
    heardText: string,
    shipReply: string,
    source?: "text" | "voice",
  ) => Promise<void>;
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
  const [textureLoading, setTextureLoading] = useState(false);
  const [textureStatus, setTextureStatus] = useState("Procedural planet active");
  const [textureCached, setTextureCached] = useState(false);
  const [combatScore, setCombatScore] = useState(0);
  const [started, setStarted] = useState(false);
  const loadedSectorKeyRef = useRef<string | null>(null);

  useEffect(() => {
    return client.subscribe(() => tick((n) => n + 1));
  }, [client]);

  useEffect(() => {
    if (started) return;
    setStarted(true);
    void client.startRun(displayName);
  }, [client, displayName, started]);

  const loadSectorAssets = useCallback(
    async (runState: RunState) => {
      const sectorKey = `${runState.id}:${runState.sectorSeed}`;
      if (loadedSectorKeyRef.current === sectorKey) return;
      loadedSectorKeyRef.current = sectorKey;

      setTextureLoading(true);
      setTextureStatus("Loading sector package...");

      try {
        const sectorPackage = await generateSectorPackage({
          runId: runState.id,
          seed: runState.sectorSeed,
          sectorName: runState.sectorName,
          threatLevel: runState.threatLevel,
        });

        const encounterSummary = sectorPackage.sectorJson.encounters
          .slice(0, 2)
          .join(", ");
        setTextureStatus(
          `Sector data ready (${encounterSummary}). Loading planet texture...`,
        );

        const art = await generateSectorArt(runState.sectorSeed);
        if (art.textureUrl) {
          client.setPlanetTextureUrl(art.textureUrl);
          const cached = art.cached === true;
          setTextureCached(cached);
          setTextureStatus(
            cached
              ? "Planet texture: Cached"
              : "Planet texture: Generated",
          );
        } else if (art.error?.includes("FAL_KEY")) {
          client.setPlanetTextureUrl(undefined);
          setTextureCached(false);
          setTextureStatus("Procedural planet (set FAL_KEY for Fal textures)");
        } else {
          client.setPlanetTextureUrl(undefined);
          setTextureCached(false);
          setTextureStatus("Procedural planet (texture API unavailable)");
        }
      } catch {
        setTextureCached(false);
        setTextureStatus("Procedural planet (sector asset load failed)");
      } finally {
        setTextureLoading(false);
      }
    },
    [client],
  );

  useEffect(() => {
    if (!client.run) return;
    void loadSectorAssets(client.run);
  }, [client.run, loadSectorAssets]);

  const sendCommand = useCallback(
    async (
      command: string,
      source: "text" | "voice" = "text",
      options?: { shipPreamble?: string; heardText?: string },
    ) => {
      const result = await client.sendCommand(command, source, options);
      if (result?.hyperspaceTrigger || result?.run.hyperspaceActive) {
        setHyperspaceActive(true);
        setLastHyperspaceAt(Date.now());
        window.setTimeout(() => setHyperspaceActive(false), 2500);
        loadedSectorKeyRef.current = null;
        setCombatScore(0);
      }
      return result;
    },
    [client],
  ) as GameClient["sendCommand"];

  const appendShipMessage = useCallback(
    async (
      heardText: string,
      shipReply: string,
      source: "text" | "voice" = "voice",
    ) => {
      await client.appendShipMessage(heardText, shipReply, source);
    },
    [client],
  );

  const combatCallbacks = useMemo<CombatCallbacks>(
    () => ({
      onEnemyKilled: () => {
        const creditReward = 8 + Math.floor(Math.random() * 6);
        const scoreReward = 100;
        client.awardCombatKill(creditReward);
        setCombatScore((prev) => prev + scoreReward);
      },
      onPlayerHit: (damage: number) => {
        client.applyCombatDamage(damage);
      },
    }),
    [client],
  );

  const value: GameContextValue = {
    run: client.run,
    logs: client.logs,
    loading: client.loading,
    backend: client.backend,
    startRun: client.startRun.bind(client),
    sendCommand,
    appendShipMessage,
    hyperspaceActive,
    lastHyperspaceAt,
    textureLoading,
    textureStatus,
    textureCached,
    combatScore,
    combatCallbacks,
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
