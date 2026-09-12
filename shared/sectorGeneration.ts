export interface SectorGenerationJob {
  runId: string;
  seed: number;
  sectorName: string;
  threatLevel: number;
}

export interface SectorGenerationResult {
  job: SectorGenerationJob;
  sectorJson: {
    seed: number;
    name: string;
    threatLevel: number;
    planet: {
      type: string;
      textureUrl: string | null;
    };
    encounters: string[];
  };
  assetJobs: Array<{
    type: "planet_texture" | "skybox" | "audio_stinger";
    status: "queued" | "running" | "done" | "failed";
    payload: Record<string, unknown>;
  }>;
}

const ENCOUNTER_POOL = [
  "relay-beacon",
  "drift-miners",
  "void-storm",
  "pirate-scout",
  "ancient-derelict",
  "solar-flare",
];

function pickEncounters(seed: number): string[] {
  const count = (seed % 3) + 2;
  const picks: string[] = [];
  for (let i = 0; i < count; i += 1) {
    picks.push(ENCOUNTER_POOL[(seed + i * 7) % ENCOUNTER_POOL.length]);
  }
  return [...new Set(picks)];
}

function planetTypeFromSeed(seed: number): string {
  const types = [
    "crystalline-desert",
    "molten-core",
    "ice-shard",
    "gas-giant-moon",
    "jungle-canopy",
  ];
  return types[seed % types.length];
}

export function buildSectorJson(job: SectorGenerationJob) {
  return {
    seed: job.seed,
    name: job.sectorName,
    threatLevel: job.threatLevel,
    planet: {
      type: planetTypeFromSeed(job.seed),
      textureUrl: null as string | null,
    },
    encounters: pickEncounters(job.seed),
  };
}

export function buildQueuedAssetJobs(seed: number) {
  return [
    {
      type: "planet_texture" as const,
      status: "queued" as const,
      payload: { seed, provider: "fal" },
    },
    {
      type: "skybox" as const,
      status: "queued" as const,
      payload: { seed, variant: "nebula" },
    },
    {
      type: "audio_stinger" as const,
      status: "queued" as const,
      payload: { seed, mood: "hyperspace-exit" },
    },
  ];
}

export function buildSectorPackageStub(
  job: SectorGenerationJob,
): SectorGenerationResult {
  return {
    job,
    sectorJson: buildSectorJson(job),
    assetJobs: buildQueuedAssetJobs(job.seed),
  };
}
