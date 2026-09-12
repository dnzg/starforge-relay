import {
  buildSectorPackageStub,
  type SectorGenerationJob,
  type SectorGenerationResult,
} from "../../../shared/sectorGeneration";

export type { SectorGenerationJob, SectorGenerationResult };

export async function generateSectorPackage(
  job: SectorGenerationJob,
): Promise<SectorGenerationResult> {
  return buildSectorPackageStub(job);
}
