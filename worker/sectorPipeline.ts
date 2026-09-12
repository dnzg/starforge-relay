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

export interface DaytonaSectorPipeline {
  enqueueSectorGeneration: (
    job: SectorGenerationJob,
  ) => Promise<SectorGenerationResult>;
}

/**
 * Thin stub for a Daytona worker pipeline.
 * Production: push job to Daytona sandbox, run asset scripts, persist URLs to Convex.
 */
export function createDaytonaPipelineStub(): DaytonaSectorPipeline {
  return {
    async enqueueSectorGeneration(job: SectorGenerationJob) {
      return {
        job,
        sectorJson: {
          seed: job.seed,
          name: job.sectorName,
          threatLevel: job.threatLevel,
          planet: {
            type: "crystalline-desert",
            textureUrl: null,
          },
          encounters: ["relay-beacon", "drift-miners", "void-storm"],
        },
        assetJobs: [
          {
            type: "planet_texture",
            status: "queued",
            payload: { seed: job.seed, provider: "fal" },
          },
          {
            type: "skybox",
            status: "queued",
            payload: { seed: job.seed, variant: "nebula" },
          },
        ],
      };
    },
  };
}

export async function generateSectorPackage(
  job: SectorGenerationJob,
): Promise<SectorGenerationResult> {
  const pipeline = createDaytonaPipelineStub();
  return pipeline.enqueueSectorGeneration(job);
}
