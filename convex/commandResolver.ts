export type CommandVerb =
  | "scan"
  | "hail"
  | "engage"
  | "flee"
  | "status"
  | "jump";

export interface RunSnapshot {
  status: "active" | "ended" | "fled";
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
  arcadeScore: number;
  sectorKills: number;
}

export interface CommandResult {
  response: string;
  run: Partial<RunSnapshot>;
  hyperspaceTrigger?: boolean;
}

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

const STT_ALIASES: Record<string, CommandVerb> = {
  john: "jump",
  jon: "jump",
  jam: "jump",
  junk: "jump",
  там: "jump",
  джамп: "jump",
  джам: "jump",
};

export function parseCommand(raw: string): CommandVerb | null {
  const verb = raw.trim().toLowerCase().split(/\s+/)[0]?.replace(/[.,!?]/g, "");
  const allowed: CommandVerb[] = [
    "scan",
    "hail",
    "engage",
    "flee",
    "status",
    "jump",
  ];
  if (allowed.includes(verb as CommandVerb)) return verb as CommandVerb;
  return verb ? (STT_ALIASES[verb] ?? null) : null;
}

export function resolveCommand(
  verb: CommandVerb,
  run: RunSnapshot,
): CommandResult {
  const base: Partial<RunSnapshot> = {
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
        response: "Command not recognized. Try: scan, hail, engage, flee, status, jump.",
        run: base,
      };
  }
}
