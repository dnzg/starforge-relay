#!/usr/bin/env node
import { parseArgs } from "node:util";
import { generateSectorPackageLocal } from "./sectorPipeline.js";

const { values } = parseArgs({
  options: {
    seed: { type: "string" },
    name: { type: "string", default: "Unknown Sector" },
    threat: { type: "string", default: "3" },
    "run-id": { type: "string", default: "local-run" },
    fal: { type: "boolean", default: false },
  },
});

const seed = values.seed
  ? Number.parseInt(values.seed, 10)
  : Math.floor(Math.random() * 1_000_000);
const threatLevel = Number.parseInt(values.threat ?? "3", 10);
const falKey = process.env.FAL_KEY;
const withFal = values.fal || Boolean(falKey);

if (Number.isNaN(seed)) {
  console.error("Invalid --seed value");
  process.exit(1);
}

const result = await generateSectorPackageLocal(
  {
    runId: values["run-id"] ?? "local-run",
    seed,
    sectorName: values.name ?? "Unknown Sector",
    threatLevel: Number.isNaN(threatLevel) ? 3 : threatLevel,
  },
  {
    falKey,
    withFalTexture: withFal,
  },
);

console.log(JSON.stringify(result, null, 2));

if (!falKey && withFal) {
  console.error(
    "\nNote: FAL_KEY is not set. Planet textureUrl will be null (procedural fallback in app).",
  );
}
