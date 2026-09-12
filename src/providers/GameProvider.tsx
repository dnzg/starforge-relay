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
import { ConvexProvider } from "convex/react";
import {
  generateSectorArt,
  peekSectorArtCache,
  prefetchSectorArt,
} from "../lib/assets/falSectorArt";
import { createLocalGameClient } from "../lib/game/localGameClient";
import { useConvexGameClient } from "../lib/game/convexGameClient";
import type {
  CommandResult,
  ExtendedGameClient,
  LeaderboardEntry,
} from "../lib/game/types";
import { nextSectorSeed } from "../lib/game/commandResolver";
import { generateSectorPackage } from "../lib/sector/sectorPackage";
import type { CombatCallbacks } from "../components/scene/arcade/types";
import { createCombatEventQueue } from "../lib/combat/combatEventQueue";
import { telegramHaptic } from "../lib/telegram/haptics";
import { HYPERSPACE_MS } from "../lib/game/hyperspace";
import { playSfx } from "../lib/audio/gameAudio";
import { writeHull } from "../lib/combat/arcadeUiRef";
import {
  loadCaptainProfile,
  type CaptainGender,
  type CaptainProfile,
} from "../lib/game/captainProfile";
import { getConvexClient, getConvexUrl } from "../lib/convex/client";
import type { RunState } from "../lib/game/types";

type TexturePhase = "ready" | "generating" | "cached" | "procedural";

interface GameContextValue {
  run: RunState | null;
  logs: ExtendedGameClient["logs"];
  loading: boolean;
  backend: "local" | "convex";
  leaderboard: LeaderboardEntry[];
  startRun: ExtendedGameClient["startRun"];
  sendCommand: ExtendedGameClient["sendCommand"];
  appendShipMessage: ExtendedGameClient["appendShipMessage"];
  hyperspaceActive: boolean;
  lastHyperspaceAt: number;
  textureLoading: boolean;
  textureStatus: string;
  textureCached: boolean;
  texturePhase: TexturePhase;
  skyTextureUrl?: string | null;
  combatScore: number;
  sectorKills: number;
  jumpGateUnlocked: boolean;
  combatCallbacks: CombatCallbacks;
  triggerSectorJump: () => Promise<void>;
  restartRun: () => Promise<void>;
  markPlanetTextureReady: () => void;
  captain: CaptainProfile | null;
  suggestedName: string;
  completeCaptainSetup: (name: string, gender: CaptainGender) => void;
}

const GameContext = createContext<GameContextValue | null>(null);

const COMBAT_FLUSH_MS = 150;

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

function GameProviderCore({
  children,
  displayName,
  telegramId,
  client,
}: {
  children: ReactNode;
  displayName: string;
  telegramId?: string;
  client: ExtendedGameClient;
}) {
  const [, tick] = useState(0);
  const [hyperspaceActive, setHyperspaceActive] = useState(false);
  const [lastHyperspaceAt, setLastHyperspaceAt] = useState(0);
  const [textureLoading, setTextureLoading] = useState(false);
  const [texturePhase, setTexturePhase] = useState<TexturePhase>("ready");
  const [textureCached, setTextureCached] = useState(false);
  const [localCombatScore, setLocalCombatScore] = useState(0);
  const [localSectorKills, setLocalSectorKills] = useState(0);
  const [jumpGateUnlocked, setJumpGateUnlocked] = useState(false);
  const [skyTextureUrl, setSkyTextureUrl] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [captain, setCaptain] = useState<CaptainProfile | null>(() =>
    loadCaptainProfile(),
  );
  const loadedSectorKeyRef = useRef<string | null>(null);
  const combatQueueRef = useRef(createCombatEventQueue());
  const sectorKillsRef = useRef(0);
  const jumpPendingRef = useRef(false);
  const toldRef = useRef({
    firstBlood: false,
    hullLow: false,
    gate: false,
  });

  const combatScore =
    client.backend === "convex"
      ? (client.run?.arcadeScore ?? 0)
      : localCombatScore;
  const sectorKills =
    client.backend === "convex"
      ? (client.run?.sectorKills ?? 0)
      : localSectorKills;

  const textureStatus = texturePhaseLabel(texturePhase, textureLoading);

  useEffect(() => {
    return client.subscribe(() => tick((n) => n + 1));
  }, [client]);

  useEffect(() => {
    writeHull(client.run?.hull ?? 100);
  }, [client.run?.hull]);

  useEffect(() => {
    if (started || !captain) return;
    setStarted(true);
    void client.startRun(captain.name || displayName, telegramId);
  }, [captain, client, displayName, started, telegramId]);

  const completeCaptainSetup = useCallback((name: string, gender: CaptainGender) => {
    const profile = { name, gender };
    setCaptain(profile);
  }, []);

  const beginHyperspaceTransition = useCallback(() => {
    playSfx("hyperspace");
    setHyperspaceActive(true);
    setLastHyperspaceAt(Date.now());
    window.setTimeout(() => setHyperspaceActive(false), HYPERSPACE_MS);
    loadedSectorKeyRef.current = null;
    setLocalCombatScore(0);
    sectorKillsRef.current = 0;
    setLocalSectorKills(0);
    setJumpGateUnlocked(false);
    toldRef.current = { firstBlood: false, hullLow: false, gate: false };
  }, []);

  const loadSectorAssets = useCallback(
    async (runState: RunState) => {
      const sectorKey = `${runState.id}:${runState.sectorSeed}`;
      if (loadedSectorKeyRef.current === sectorKey) return;
      loadedSectorKeyRef.current = sectorKey;

      const cachedPeek = peekSectorArtCache(runState.sectorSeed);
      const cachedSky = peekSectorArtCache(runState.sectorSeed, "sky");
      if (cachedSky?.textureUrl) {
        setSkyTextureUrl(cachedSky.textureUrl);
      }
      if (cachedPeek?.textureUrl) {
        client.setPlanetTextureUrl(cachedPeek.textureUrl);
        setTextureCached(true);
        setTexturePhase("cached");
        setTextureLoading(false);
        if (!cachedSky?.textureUrl) {
          void generateSectorArt(runState.sectorSeed, "sky").then((sky) => {
            if (sky.textureUrl) setSkyTextureUrl(sky.textureUrl);
          });
        }
        return;
      }

      setTextureLoading(true);
      setTexturePhase("generating");
      client.setPlanetTextureUrl(undefined);
      setSkyTextureUrl(null);

      try {
        await generateSectorPackage({
          runId: runState.id,
          seed: runState.sectorSeed,
          sectorName: runState.sectorName,
          threatLevel: runState.threatLevel,
        });

        const [art, sky] = await Promise.all([
          generateSectorArt(runState.sectorSeed),
          generateSectorArt(runState.sectorSeed, "sky"),
        ]);
        if (sky.textureUrl) {
          setSkyTextureUrl(sky.textureUrl);
        }
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
    void prefetchSectorArt(nextSeed, "sky");
  }, [client.run?.sectorSeed, client.run?.jumpsCompleted, client.run?.status]);

  const triggerSectorJump = useCallback(async () => {
    if (jumpPendingRef.current) return;
    jumpPendingRef.current = true;
    telegramHaptic("heavy");

    const result = await client.performSectorJump();
    if (result?.hyperspaceTrigger) {
      beginHyperspaceTransition();
      if (client.run) {
        await loadSectorAssets(client.run);
      }
    }

    jumpPendingRef.current = false;
  }, [beginHyperspaceTransition, client, loadSectorAssets]);

  const restartRun = useCallback(async () => {
    if (!captain) return;
    jumpPendingRef.current = false;
    setHyperspaceActive(false);
    setLocalCombatScore(0);
    sectorKillsRef.current = 0;
    setLocalSectorKills(0);
    setJumpGateUnlocked(false);
    toldRef.current = { firstBlood: false, hullLow: false, gate: false };
    loadedSectorKeyRef.current = null;
    await client.startRun(captain.name || displayName, telegramId);
  }, [captain, client, displayName, telegramId]);

  useEffect(() => {
    if (client.backend === "convex") {
      sectorKillsRef.current = client.run?.sectorKills ?? 0;
    }
  }, [client.backend, client.run?.sectorKills]);

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
        if (client.backend === "local") {
          const wasZero = sectorKillsRef.current === 0;
          sectorKillsRef.current += snapshot.kills;
          setLocalSectorKills(sectorKillsRef.current);
          setLocalCombatScore((prev) => prev + snapshot.kills * 100);
          if (wasZero && !toldRef.current.firstBlood) {
            toldRef.current.firstBlood = true;
            const name = captain?.name ?? "Captain";
            void client.appendShipMessage(
              "combat",
              `First hull cracked, ${name}. Keep the nose on the next one.`,
              "text",
            );
          }
          if (sectorKillsRef.current >= 3 && !toldRef.current.gate) {
            toldRef.current.gate = true;
            void client.appendShipMessage(
              "combat",
              "Jump gate unlocked. Fly into the glowing ring — or say jump if you have fuel.",
              "text",
            );
          }
        } else {
          const prevKills = client.run?.sectorKills ?? 0;
          const killsNow = prevKills + snapshot.kills;
          if (prevKills === 0 && !toldRef.current.firstBlood) {
            toldRef.current.firstBlood = true;
            const name = captain?.name ?? "Captain";
            void client.appendShipMessage(
              "combat",
              `First hull cracked, ${name}. Keep the nose on the next one.`,
              "text",
            );
          }
          if (killsNow >= 3 && !toldRef.current.gate) {
            toldRef.current.gate = true;
            void client.appendShipMessage(
              "combat",
              "Jump gate unlocked. Fly into the glowing ring — or say jump if you have fuel.",
              "text",
            );
          }
        }
      }

      if (snapshot.damage > 0) {
        client.applyCombatDamage(snapshot.damage);
        if (client.run?.status === "ended") {
          const name = captain?.name ?? "Captain";
          void client.appendShipMessage(
            "combat",
            `Hull gone, ${name}. I pulled the log. The ship did not make it.`,
            "text",
          );
          return;
        }
        const hull = client.run?.hull ?? 100;
        if (hull <= 40 && !toldRef.current.hullLow) {
          toldRef.current.hullLow = true;
          void client.appendShipMessage(
            "combat",
            "Hull is thin. I would rather not rebuild you from scrap.",
            "text",
          );
        }
      }

      if (snapshot.jumpGateReached) {
        setJumpGateUnlocked(true);
        void client.appendShipMessage(
          "combat",
          "Gate lock. Folding us into the next reach.",
          "text",
        );
        void triggerSectorJump();
      }
    }, COMBAT_FLUSH_MS);

    return () => window.clearInterval(interval);
  }, [captain?.name, client, triggerSectorJump]);

  const sendCommand = useCallback(
    async (
      command: string,
      source: "text" | "voice" = "text",
      options?: { shipPreamble?: string; heardText?: string },
    ) => {
      const result = await client.sendCommand(command, source, options);
      if (result?.hyperspaceTrigger || result?.run.hyperspaceActive) {
        telegramHaptic("heavy");
        beginHyperspaceTransition();
        if (client.run) {
          await loadSectorAssets(client.run);
        }
      }
      return result;
    },
    [beginHyperspaceTransition, client, loadSectorAssets],
  ) as ExtendedGameClient["sendCommand"];

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
        combatQueueRef.current.queueKill();
      },
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
    leaderboard: client.leaderboard,
    startRun: client.startRun.bind(client),
    sendCommand,
    appendShipMessage,
    hyperspaceActive,
    lastHyperspaceAt,
    textureLoading,
    textureStatus,
    textureCached,
    texturePhase,
    skyTextureUrl,
    combatScore,
    sectorKills,
    jumpGateUnlocked,
    combatCallbacks,
    triggerSectorJump,
    restartRun,
    markPlanetTextureReady,
    captain,
    suggestedName: displayName,
    completeCaptainSetup,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

function ConvexGameProvider({
  children,
  displayName,
  telegramId,
}: {
  children: ReactNode;
  displayName: string;
  telegramId?: string;
}) {
  const client = useConvexGameClient();
  return (
    <GameProviderCore
      displayName={displayName}
      telegramId={telegramId}
      client={client}
    >
      {children}
    </GameProviderCore>
  );
}

function LocalGameProvider({
  children,
  displayName,
  telegramId,
}: {
  children: ReactNode;
  displayName: string;
  telegramId?: string;
}) {
  const client = useMemo(() => createLocalGameClient(), []);
  return (
    <GameProviderCore
      displayName={displayName}
      telegramId={telegramId}
      client={client}
    >
      {children}
    </GameProviderCore>
  );
}

export function GameProvider({
  children,
  displayName,
  telegramId,
}: {
  children: ReactNode;
  displayName: string;
  telegramId?: string;
}) {
  const convexUrl = getConvexUrl();
  if (convexUrl) {
    return (
      <ConvexProvider client={getConvexClient()}>
        <ConvexGameProvider displayName={displayName} telegramId={telegramId}>
          {children}
        </ConvexGameProvider>
      </ConvexProvider>
    );
  }

  return (
    <LocalGameProvider displayName={displayName} telegramId={telegramId}>
      {children}
    </LocalGameProvider>
  );
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) {
    throw new Error("useGame must be used within GameProvider");
  }
  return ctx;
}

export type { CommandResult };
