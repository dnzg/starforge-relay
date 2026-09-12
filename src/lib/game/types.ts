export type CommandVerb =
  | "scan"
  | "hail"
  | "engage"
  | "flee"
  | "status"
  | "jump";

export type RunStatus = "active" | "ended" | "fled";

export interface RunState {
  id: string;
  status: RunStatus;
  sectorSeed: number;
  sectorName: string;
  hull: number;
  shields: number;
  fuel: number;
  credits: number;
  threatLevel: number;
  scanData?: string;
  planetTextureUrl?: string;
  hyperspaceActive: boolean;
  lastCommand?: string;
  jumpsCompleted: number;
  arcadeScore?: number;
  sectorKills?: number;
}

export interface LeaderboardEntry {
  rank: number;
  displayName: string;
  score: number;
  sectorReached: number;
}

export interface CommandLogEntry {
  command: string;
  source: "text" | "voice";
  response: string;
  timestamp: number;
  speaker?: "captain" | "ship" | "system";
}

export interface CommandResult {
  response: string;
  run: Partial<RunState>;
  hyperspaceTrigger?: boolean;
}

export interface GameClient {
  run: RunState | null;
  logs: CommandLogEntry[];
  loading: boolean;
  backend: "local" | "convex";
  leaderboard: LeaderboardEntry[];
  startRun: (displayName: string, telegramId?: string) => Promise<void>;
  sendCommand: (
    command: string,
    source?: "text" | "voice",
    options?: { shipPreamble?: string; heardText?: string },
  ) => Promise<CommandResult | null>;
  appendShipMessage: (
    heardText: string,
    shipReply: string,
    source?: "text" | "voice",
  ) => Promise<void>;
}

export interface ExtendedGameClient extends GameClient {
  subscribe: (listener: () => void) => () => void;
  setPlanetTextureUrl: (url: string | null | undefined) => void;
  applyCombatDamage: (damage: number) => void;
  awardCombatKill: (credits: number, scoreDelta?: number) => void;
  performSectorJump: () => Promise<CommandResult | null>;
}
