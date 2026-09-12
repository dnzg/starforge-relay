import {
  createInitialRun,
  parseCommand,
  resolveCommand,
} from "./commandResolver";
import type { CommandLogEntry, CommandResult, GameClient, RunState } from "./types";

let runCounter = 0;

function nextRunId(): string {
  runCounter += 1;
  return `local-run-${runCounter}`;
}

export function createLocalGameClient(): GameClient & {
  subscribe: (listener: () => void) => () => void;
  setPlanetTextureUrl: (url: string | null | undefined) => void;
  appendShipMessage: (
    heardText: string,
    shipReply: string,
    source?: "text" | "voice",
  ) => Promise<void>;
} {
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

    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    setPlanetTextureUrl(url: string | null | undefined) {
      if (!run) return;
      run = { ...run, planetTextureUrl: url ?? undefined };
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
          response: `Starforge Relay online. Welcome, ${displayName}. Voice or text commands ready: scan, hail, engage, flee, status, jump.`,
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
          { command, source, response, timestamp: Date.now() },
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
          { command, source, response, timestamp: Date.now() },
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
          response: combinedResponse,
          timestamp: Date.now(),
        },
      ];
      notify();
      return result;
    },
  };
}
