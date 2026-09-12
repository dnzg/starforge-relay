import { extractCommandVerb } from "../../../shared/commandInterpreter";
import type { CommandResult, CommandVerb, RunState } from "./types";

const SECTOR_PREFIXES = [
  "Nexus",
  "Void",
  "Crimson",
  "Azure",
  "Obsidian",
  "Solar",
  "Fractured",
  "Silent",
];

const SECTOR_SUFFIXES = [
  "Reach",
  "Belt",
  "Drift",
  "Gate",
  "Rim",
  "Expanse",
  "Cluster",
  "Terminus",
];

export function hashSeed(seed: number): number {
  let h = seed ^ 0xdeadbeef;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}

export function nextSectorSeed(currentSeed: number, jumpsCompleted: number): number {
  return hashSeed(currentSeed + jumpsCompleted + 1);
}

export function sectorNameFromSeed(seed: number): string {
  const h = hashSeed(seed);
  const prefix = SECTOR_PREFIXES[h % SECTOR_PREFIXES.length];
  const suffix = SECTOR_SUFFIXES[(h >>> 4) % SECTOR_SUFFIXES.length];
  const num = ((h >>> 8) % 900) + 100;
  return `${prefix} ${suffix} ${num}`;
}

export function parseCommand(raw: string): CommandVerb | null {
  return extractCommandVerb(raw);
}

export function createInitialRun(id: string, seed?: number): RunState {
  const sectorSeed = seed ?? Math.floor(Math.random() * 1_000_000);
  return {
    id,
    status: "active",
    sectorSeed,
    sectorName: sectorNameFromSeed(sectorSeed),
    hull: 100,
    shields: 100,
    fuel: 100,
    credits: 50,
    threatLevel: 3,
    hyperspaceActive: false,
    jumpsCompleted: 0,
  };
}

export function resolveCommand(
  verb: CommandVerb,
  run: RunState,
): CommandResult {
  const base: Partial<RunState> = {
    lastCommand: verb,
    hyperspaceActive: false,
  };

  switch (verb) {
    case "status":
      return {
        response: `Hull ${run.hull}% | Shields ${run.shields}% | Fuel ${run.fuel} | Credits ${run.credits} | Threat ${run.threatLevel}/10 | Sector: ${run.sectorName}`,
        run: base,
      };

    case "scan": {
      const contacts =
        run.threatLevel >= 7
          ? "Hostile signature detected on long-range sensors."
          : run.threatLevel >= 4
            ? "Unknown freighter ping on subspace relay."
            : "Sector clear. One habitable world in range.";
      const scanData = `${contacts} Planet type: crystalline desert. Relay beacon: inactive.`;
      return {
        response: scanData,
        run: { ...base, scanData },
      };
    }

    case "hail": {
      const responses = [
        "Static on the comm channel. No reply.",
        "Automated beacon: 'Trade lane closed until cycle end.'",
        "Distorted voice: 'Identify yourself, Starforge vessel.'",
        "Friendly trader offers 15 credits for sensor data.",
      ];
      const idx = hashSeed(run.sectorSeed + run.jumpsCompleted) % responses.length;
      const creditsGain = idx === 3 ? 15 : 0;
      return {
        response: responses[idx],
        run: { ...base, credits: run.credits + creditsGain },
      };
    }

    case "engage": {
      const damage = Math.max(5, run.threatLevel * 3);
      const shieldLoss = Math.min(run.shields, damage);
      const hullLoss = Math.max(0, damage - run.shields);
      const newShields = run.shields - shieldLoss;
      const newHull = Math.max(0, run.hull - hullLoss);
      const newThreat = Math.min(10, run.threatLevel + 1);
      const status =
        newHull <= 0
          ? "Hull breach! Emergency pods deploying..."
          : `Weapons hot. Shields absorbing ${shieldLoss} damage.`;
      return {
        response: status,
        run: {
          ...base,
          shields: newShields,
          hull: newHull,
          threatLevel: newThreat,
          status: newHull <= 0 ? "ended" : run.status,
        },
      };
    }

    case "flee": {
      const success = run.fuel >= 10 && run.shields > 0;
      if (success) {
        return {
          response:
            "Emergency burn engaged. Hostile contacts falling behind.",
          run: {
            ...base,
            fuel: run.fuel - 10,
            threatLevel: Math.max(1, run.threatLevel - 2),
            status: "fled",
          },
        };
      }
      return {
        response: "Flee failed. Insufficient fuel or shields offline.",
        run: base,
      };
    }

    case "jump": {
      if (run.fuel < 20) {
        return {
          response: "Insufficient fuel for hyperspace jump. Need 20 units.",
          run: base,
        };
      }
      const newSeed = hashSeed(run.sectorSeed + run.jumpsCompleted + 1);
      const newName = sectorNameFromSeed(newSeed);
      const newThreat = (hashSeed(newSeed) % 8) + 2;
      return {
        response: `Hyperspace jump complete. Arrived at ${newName}.`,
        run: {
          ...base,
          fuel: run.fuel - 20,
          sectorSeed: newSeed,
          sectorName: newName,
          threatLevel: newThreat,
          scanData: undefined,
          jumpsCompleted: run.jumpsCompleted + 1,
          hyperspaceActive: true,
        },
        hyperspaceTrigger: true,
      };
    }

    default:
      return {
        response:
          "Command not recognized. Try: scan, hail, engage, flee, status, jump.",
        run: base,
      };
  }
}
