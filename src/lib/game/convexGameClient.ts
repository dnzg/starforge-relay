import { useCallback, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type {
  CommandLogEntry,
  CommandResult,
  ExtendedGameClient,
  LeaderboardEntry,
  RunState,
} from "./types";

function mapRun(runId: Id<"runs">, run: NonNullable<ReturnType<typeof useQuery<typeof api.runs.getRun>>>["run"]): RunState {
  return {
    id: runId,
    status: run.status,
    sectorSeed: run.sectorSeed,
    sectorName: run.sectorName,
    hull: run.hull,
    shields: run.shields,
    fuel: run.fuel,
    credits: run.credits,
    threatLevel: run.threatLevel,
    scanData: run.scanData,
    planetTextureUrl: run.planetTextureUrl,
    hyperspaceActive: run.hyperspaceActive,
    lastCommand: run.lastCommand,
    jumpsCompleted: run.jumpsCompleted,
    arcadeScore: run.arcadeScore,
    sectorKills: run.sectorKills,
  };
}

function mapLogs(
  logs: NonNullable<ReturnType<typeof useQuery<typeof api.runs.getRun>>>["logs"],
): CommandLogEntry[] {
  return logs.map((entry) => ({
    command: entry.command,
    source: entry.source,
    response: entry.response,
    timestamp: entry.timestamp,
    speaker: entry.speaker,
  }));
}

export function useConvexGameClient(): ExtendedGameClient {
  const [runId, setRunId] = useState<Id<"runs"> | null>(null);
  const [starting, setStarting] = useState(false);
  const listenersRef = useRef(new Set<() => void>());

  const runData = useQuery(api.runs.getRun, runId ? { runId } : "skip");
  const leaderboardRaw = useQuery(api.runs.getLeaderboard, { limit: 8 });

  const startRunMutation = useMutation(api.runs.startRun);
  const sendCommandMutation = useMutation(api.runs.sendCommand);
  const appendShipMessageMutation = useMutation(api.runs.appendShipMessage);
  const setPlanetTextureUrlMutation = useMutation(api.runs.setPlanetTextureUrl);
  const applyCombatDamageMutation = useMutation(api.runs.applyCombatDamage);
  const awardCombatKillMutation = useMutation(api.runs.awardCombatKill);
  const performSectorJumpMutation = useMutation(api.runs.performSectorJump);

  const notify = useCallback(() => {
    listenersRef.current.forEach((listener) => listener());
  }, []);

  const run = useMemo(() => {
    if (!runId || !runData?.run) return null;
    return mapRun(runId, runData.run);
  }, [runData, runId]);

  const logs = useMemo(() => {
    if (!runData?.logs) return [];
    return mapLogs(runData.logs);
  }, [runData?.logs]);

  const leaderboard = useMemo<LeaderboardEntry[]>(() => {
    if (!leaderboardRaw) return [];
    return leaderboardRaw.map((entry, index) => ({
      rank: index + 1,
      displayName: entry.displayName,
      score: entry.score,
      sectorReached: entry.sectorReached,
    }));
  }, [leaderboardRaw]);

  const loading = starting || (Boolean(runId) && runData === undefined);

  const subscribe = useCallback((listener: () => void) => {
    listenersRef.current.add(listener);
    return () => listenersRef.current.delete(listener);
  }, []);

  const startRun = useCallback(
    async (displayName: string, telegramId?: string) => {
      setStarting(true);
      try {
        const id = await startRunMutation({ displayName, telegramId });
        setRunId(id);
        notify();
      } finally {
        setStarting(false);
      }
    },
    [notify, startRunMutation],
  );

  const sendCommand = useCallback(
    async (
      command: string,
      source: "text" | "voice" = "text",
      options?: { shipPreamble?: string; heardText?: string },
    ): Promise<CommandResult | null> => {
      if (!runId) return null;
      const result = await sendCommandMutation({ runId, command, source });
      notify();
      const combinedResponse = options?.shipPreamble
        ? `${options.shipPreamble}\n${result.response}`
        : result.response;
      return {
        response: combinedResponse,
        run: {},
        hyperspaceTrigger: result.hyperspaceTrigger ?? false,
      };
    },
    [notify, runId, sendCommandMutation],
  );

  const appendShipMessage = useCallback(
    async (
      heardText: string,
      shipReply: string,
      source: "text" | "voice" = "voice",
    ) => {
      if (!runId) return;
      await appendShipMessageMutation({ runId, heardText, shipReply, source });
      notify();
    },
    [appendShipMessageMutation, notify, runId],
  );

  const setPlanetTextureUrl = useCallback(
    (url: string | null | undefined) => {
      if (!runId) return;
      void setPlanetTextureUrlMutation({
        runId,
        planetTextureUrl: url ?? undefined,
      });
    },
    [runId, setPlanetTextureUrlMutation],
  );

  const applyCombatDamage = useCallback(
    (damage: number) => {
      if (!runId) return;
      void applyCombatDamageMutation({ runId, damage });
    },
    [applyCombatDamageMutation, runId],
  );

  const awardCombatKill = useCallback(
    (credits: number, scoreDelta = 100) => {
      if (!runId) return;
      void awardCombatKillMutation({ runId, credits, scoreDelta });
    },
    [awardCombatKillMutation, runId],
  );

  const performSectorJump = useCallback(async (): Promise<CommandResult | null> => {
    if (!runId) return null;
    const result = await performSectorJumpMutation({ runId });
    notify();
    if (!result.hyperspaceTrigger) return null;
    return {
      response: result.response ?? "Hyperspace jump complete.",
      run: { hyperspaceActive: true },
      hyperspaceTrigger: true,
    };
  }, [notify, performSectorJumpMutation, runId]);

  return useMemo(
    () => ({
      run,
      logs,
      loading,
      backend: "convex" as const,
      leaderboard,
      startRun,
      sendCommand,
      appendShipMessage,
      subscribe,
      setPlanetTextureUrl,
      applyCombatDamage,
      awardCombatKill,
      performSectorJump,
    }),
    [
      appendShipMessage,
      applyCombatDamage,
      awardCombatKill,
      leaderboard,
      loading,
      logs,
      performSectorJump,
      run,
      sendCommand,
      setPlanetTextureUrl,
      startRun,
      subscribe,
    ],
  );
}
