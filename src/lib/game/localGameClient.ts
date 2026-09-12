import {
  createInitialRun,
  hashSeed,
  nextSectorSeed,
  parseCommand,
  resolveCommand,
  sectorNameFromSeed,
} from "./commandResolver";
import type {
  CommandLogEntry,
  CommandResult,
  ExtendedGameClient,
  RunState,
} from "./types";

let runCounter = 0;

function nextRunId(): string {
  runCounter += 1;
  return `local-run-${runCounter}`;
}

export function createLocalGameClient(): ExtendedGameClient {
  let run: RunState | null = null;
  let logs: CommandLogEntry[] = [];
  let loading = false;
  const listeners = new Set<() => void>();

  const notify = () => listeners.forEach((l) => l());

  return {
    get run() {
      return run;
    },
    get logs() {
      return logs;
    },
    get loading() {
      return loading;
    },
    backend: "local",
    leaderboard: [],

    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    setPlanetTextureUrl(url: string | null | undefined) {
      if (!run) return;
      run = { ...run, planetTextureUrl: url ?? undefined };
      notify();
    },

    applyCombatDamage(damage: number) {
      if (!run || run.status !== "active") return;
      let shields = run.shields;
      let hull = run.hull;
      let remaining = damage;
      if (shields > 0) {
        const absorbed = Math.min(shields, remaining);
        shields -= absorbed;
        remaining -= absorbed;
      }
      hull = Math.max(0, hull - remaining);
      if (hull <= 0) {
        run = {
          ...run,
          shields: 0,
          hull: 0,
          status: "ended",
        };
      } else {
        run = { ...run, shields, hull };
      }
      notify();
    },

    async performSectorJump() {
      if (!run || run.status !== "active") return null;
      if (run.fuel < 20) return null;

      const newSeed = nextSectorSeed(run.sectorSeed, run.jumpsCompleted);
      const newName = sectorNameFromSeed(newSeed);
      const newThreat = (hashSeed(newSeed) % 8) + 2;
      run = {
        ...run,
        fuel: run.fuel - 20,
        sectorSeed: newSeed,
        sectorName: newName,
        threatLevel: newThreat,
        scanData: undefined,
        planetTextureUrl: undefined,
        jumpsCompleted: run.jumpsCompleted + 1,
        sectorKills: 0,
        hyperspaceActive: true,
      };
      notify();
      return {
        response: `Hyperspace jump complete. Arrived at ${newName}.`,
        run: { hyperspaceActive: true },
        hyperspaceTrigger: true,
      };
    },

    awardCombatKill(credits: number, scoreDelta = 100) {
      if (!run || run.status !== "active") return;
      run = {
        ...run,
        credits: run.credits + credits,
        threatLevel: Math.max(1, run.threatLevel - 1),
        arcadeScore: (run.arcadeScore ?? 0) + scoreDelta,
        sectorKills: (run.sectorKills ?? 0) + 1,
      };
      notify();
    },

    async startRun(displayName: string) {
      loading = true;
      notify();
      await new Promise((r) => setTimeout(r, 200));
      const id = nextRunId();
      run = createInitialRun(id);
      logs = [
        {
          command: "boot",
          source: "text",
          speaker: "ship",
          response: `Starforge Relay online. I have you, ${displayName}. Talk to me, or run scan, hail, engage, flee, status, jump.`,
          timestamp: Date.now(),
        },
      ];
      loading = false;
      notify();
    },

    async appendShipMessage(
      heardText: string,
      shipReply: string,
      source: "text" | "voice" = "voice",
    ) {
      logs = [
        ...logs,
        {
          command: heardText,
          source,
          speaker: "ship",
          response: shipReply,
          timestamp: Date.now(),
        },
      ];
      notify();
    },

    async sendCommand(
      command: string,
      source: "text" | "voice" = "text",
      options?: { shipPreamble?: string; heardText?: string },
    ): Promise<CommandResult | null> {
      if (!run) return null;
      if (run.status !== "active") {
        const response = `Run ${run.status}. Start a new voyage from the bridge.`;
        logs = [
          ...logs,
          { command, source, speaker: "ship", response, timestamp: Date.now() },
        ];
        notify();
        return { response, run: {} };
      }

      const verb = parseCommand(command);
      if (!verb) {
        const response =
          "Unknown command. Available: scan, hail, engage, flee, status, jump.";
        logs = [
          ...logs,
          { command, source, speaker: "ship", response, timestamp: Date.now() },
        ];
        notify();
        return { response, run: {} };
      }

      const result = resolveCommand(verb, run);
      run = { ...run, ...result.run };
      const heard = options?.heardText ?? command;
      const combinedResponse = options?.shipPreamble
        ? `${options.shipPreamble}\n${result.response}`
        : result.response;
      logs = [
        ...logs,
        {
          command: heard,
          source,
          speaker: "ship",
          response: combinedResponse,
          timestamp: Date.now(),
        },
      ];
      notify();
      return result;
    },
  };
}
