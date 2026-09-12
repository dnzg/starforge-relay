import { generateFalSectorArtServer } from "../shared/falSectorArtServer.js";
import {
  buildQueuedAssetJobs,
  buildSectorJson,
  type SectorGenerationJob,
  type SectorGenerationResult,
} from "../shared/sectorGeneration.js";

export type { SectorGenerationJob, SectorGenerationResult };

export interface DaytonaSectorPipeline {
  enqueueSectorGeneration: (
    job: SectorGenerationJob,
  ) => Promise<SectorGenerationResult>;
}

export async function buildSectorGenerationResult(
  job: SectorGenerationJob,
  options?: { falKey?: string; requestFalTexture?: boolean },
): Promise<SectorGenerationResult> {
  const sectorJson = buildSectorJson(job);
  const assetJobs = buildQueuedAssetJobs(job.seed);

  if (options?.requestFalTexture === false) {
    return { job, sectorJson, assetJobs };
  }

  assetJobs[0] = { ...assetJobs[0], status: "running" };
  const art = await generateFalSectorArtServer(job.seed, options?.falKey);
  sectorJson.planet.textureUrl = art.textureUrl;
  assetJobs[0] = {
    ...assetJobs[0],
    status: art.textureUrl ? "done" : "failed",
    payload: {
      ...assetJobs[0].payload,
      textureUrl: art.textureUrl,
      error: art.error,
    },
  };

  return { job, sectorJson, assetJobs };
}

export function createDaytonaPipelineStub(): DaytonaSectorPipeline {
  return {
    async enqueueSectorGeneration(job) {
      return buildSectorGenerationResult(job, { requestFalTexture: false });
    },
  };
}

export async function generateSectorPackage(
  job: SectorGenerationJob,
): Promise<SectorGenerationResult> {
  return createDaytonaPipelineStub().enqueueSectorGeneration(job);
}

export async function generateSectorPackageLocal(
  job: SectorGenerationJob,
  options?: { falKey?: string; withFalTexture?: boolean },
): Promise<SectorGenerationResult> {
  return buildSectorGenerationResult(job, {
    falKey: options?.falKey,
    requestFalTexture: options?.withFalTexture ?? Boolean(options?.falKey),
  });
}
