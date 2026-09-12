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
import {
  generateSectorArt,
  peekSectorArtCache,
  prefetchSectorArt,
} from "../lib/assets/falSectorArt";
import { createLocalGameClient } from "../lib/game/localGameClient";
import type { CommandResult, GameClient, RunState } from "../lib/game/types";
import { nextSectorSeed } from "../lib/game/commandResolver";
import { generateSectorPackage } from "../lib/sector/sectorPackage";
import type { CombatCallbacks } from "../components/scene/arcade/types";
import { createCombatEventQueue } from "../lib/combat/combatEventQueue";

type TexturePhase = "ready" | "generating" | "cached" | "procedural";

interface GameContextValue extends GameClient {
  hyperspaceActive: boolean;
  lastHyperspaceAt: number;
  textureLoading: boolean;
  textureStatus: string;
  textureCached: boolean;
  texturePhase: TexturePhase;
  combatScore: number;
  sectorKills: number;
  jumpGateUnlocked: boolean;
  combatCallbacks: CombatCallbacks;
  triggerSectorJump: () => Promise<void>;
  markPlanetTextureReady: () => void;
  appendShipMessage: (
    heardText: string,
    shipReply: string,
    source?: "text" | "voice",
  ) => Promise<void>;
}

const GameContext = createContext<GameContextValue | null>(null);

const COMBAT_FLUSH_MS = 150;
const HYPERSPACE_MS = 1800;

function texturePhaseLabel(phase: TexturePhase, loading: boolean): string {
  if (loading) return "Generating sector texture…";
  switch (phase) {
    case "cached":
      return "Planet texture: Cached";
    case "generating":
      return "Planet texture: Generated";
    case "procedural":
      return "Procedural planet (Fal unavailable)";
    default:
      return "Planet texture: Ready";
  }
}

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
  const [texturePhase, setTexturePhase] = useState<TexturePhase>("ready");
  const [textureCached, setTextureCached] = useState(false);
  const [combatScore, setCombatScore] = useState(0);
  const [sectorKills, setSectorKills] = useState(0);
  const [jumpGateUnlocked, setJumpGateUnlocked] = useState(false);
  const [started, setStarted] = useState(false);
  const loadedSectorKeyRef = useRef<string | null>(null);
  const combatQueueRef = useRef(createCombatEventQueue());
  const sectorKillsRef = useRef(0);
  const jumpPendingRef = useRef(false);

  const textureStatus = texturePhaseLabel(texturePhase, textureLoading);

  useEffect(() => {
    return client.subscribe(() => tick((n) => n + 1));
  }, [client]);

  useEffect(() => {
    if (started) return;
    setStarted(true);
    void client.startRun(displayName);
  }, [client, displayName, started]);

  const beginHyperspaceTransition = useCallback(() => {
    setHyperspaceActive(true);
    setLastHyperspaceAt(Date.now());
    window.setTimeout(() => setHyperspaceActive(false), HYPERSPACE_MS);
    loadedSectorKeyRef.current = null;
    setCombatScore(0);
    sectorKillsRef.current = 0;
    setSectorKills(0);
    setJumpGateUnlocked(false);
  }, []);

  const loadSectorAssets = useCallback(
    async (runState: RunState) => {
      const sectorKey = `${runState.id}:${runState.sectorSeed}`;
      if (loadedSectorKeyRef.current === sectorKey) return;
      loadedSectorKeyRef.current = sectorKey;

      const cachedPeek = peekSectorArtCache(runState.sectorSeed);
      if (cachedPeek?.textureUrl) {
        client.setPlanetTextureUrl(cachedPeek.textureUrl);
        setTextureCached(true);
        setTexturePhase("cached");
        setTextureLoading(false);
        return;
      }

      setTextureLoading(true);
      setTexturePhase("generating");
      client.setPlanetTextureUrl(undefined);

      try {
        await generateSectorPackage({
          runId: runState.id,
          seed: runState.sectorSeed,
          sectorName: runState.sectorName,
          threatLevel: runState.threatLevel,
        });

        const art = await generateSectorArt(runState.sectorSeed);
        if (art.textureUrl) {
          client.setPlanetTextureUrl(art.textureUrl);
          const cached = art.cached === true;
          setTextureCached(cached);
          setTexturePhase(cached ? "cached" : "generating");
        } else if (art.error?.includes("FAL_KEY")) {
          client.setPlanetTextureUrl(undefined);
          setTextureCached(false);
          setTexturePhase("procedural");
        } else {
          client.setPlanetTextureUrl(undefined);
          setTextureCached(false);
          setTexturePhase("procedural");
        }
      } catch {
        setTextureCached(false);
        setTexturePhase("procedural");
      } finally {
        setTextureLoading(false);
      }
    },
    [client],
  );

  const markPlanetTextureReady = useCallback(() => {
    setTextureLoading(false);
    setTexturePhase((prev) => (prev === "procedural" ? prev : "ready"));
  }, []);

  useEffect(() => {
    if (!client.run) return;
    void loadSectorAssets(client.run);
  }, [client.run, loadSectorAssets]);

  useEffect(() => {
    const run = client.run;
    if (!run || run.status !== "active") return;

    const nextSeed = nextSectorSeed(run.sectorSeed, run.jumpsCompleted);
    void prefetchSectorArt(nextSeed);
  }, [client.run?.sectorSeed, client.run?.jumpsCompleted, client.run?.status]);

  const triggerSectorJump = useCallback(async () => {
    if (jumpPendingRef.current) return;
    jumpPendingRef.current = true;

    const result = client.performSectorJump();
    if (result?.hyperspaceTrigger) {
      beginHyperspaceTransition();
      if (client.run) {
        await loadSectorAssets(client.run);
      }
    }

    jumpPendingRef.current = false;
  }, [beginHyperspaceTransition, client, loadSectorAssets]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const snapshot = combatQueueRef.current.flush();
      if (snapshot.kills === 0 && snapshot.damage === 0 && !snapshot.jumpGateReached) {
        return;
      }

      if (snapshot.kills > 0) {
        for (let i = 0; i < snapshot.kills; i++) {
          const creditReward = 8 + Math.floor(Math.random() * 6);
          client.awardCombatKill(creditReward);
        }
        sectorKillsRef.current += snapshot.kills;
        setSectorKills(sectorKillsRef.current);
        setCombatScore((prev) => prev + snapshot.kills * 100);
      }

      if (snapshot.damage > 0) {
        client.applyCombatDamage(snapshot.damage);
      }

      if (snapshot.jumpGateReached) {
        setJumpGateUnlocked(true);
        void triggerSectorJump();
      }
    }, COMBAT_FLUSH_MS);

    return () => window.clearInterval(interval);
  }, [client, triggerSectorJump]);

  const sendCommand = useCallback(
    async (
      command: string,
      source: "text" | "voice" = "text",
      options?: { shipPreamble?: string; heardText?: string },
    ) => {
      const result = await client.sendCommand(command, source, options);
      if (result?.hyperspaceTrigger || result?.run.hyperspaceActive) {
        beginHyperspaceTransition();
        if (client.run) {
          await loadSectorAssets(client.run);
        }
      }
      return result;
    },
    [beginHyperspaceTransition, client, loadSectorAssets],
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
      onEnemyKilled: () => combatQueueRef.current.queueKill(),
      onPlayerHit: (damage: number) => {
        combatQueueRef.current.queueDamage(damage);
      },
      onJumpGateEnter: () => combatQueueRef.current.queueJumpGate(),
    }),
    [],
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
    texturePhase,
    combatScore,
    sectorKills,
    jumpGateUnlocked,
    combatCallbacks,
    triggerSectorJump,
    markPlanetTextureReady,
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
