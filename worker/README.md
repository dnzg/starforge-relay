# Daytona Worker — Sector Generation Pipeline

Local runnable fallback for **Starforge Relay** sector JSON + optional Fal.ai planet textures. Designed to mirror a future Daytona sandbox worker without requiring Daytona during the hackathon.

## What it does

1. Builds **sector JSON** (name, seed, threat, encounters, planet type)
2. Optionally requests a **Fal.ai planet texture** when `FAL_KEY` is set
3. Returns **asset job records** shaped for Convex / Daytona orchestration

## Run locally (no Daytona required)

From repo root:

```bash
# Sector JSON only (instant, no API keys)
npm run worker:sector -- --seed=482910 --name="Azure Belt 494" --threat=3

# Also request Fal texture when FAL_KEY is in environment
FAL_KEY=your_key npm run worker:sector -- --seed=482910 --fal
```

Example output:

```json
{
  "sectorJson": {
    "seed": 482910,
    "name": "Azure Belt 494",
    "threatLevel": 3,
    "planet": { "type": "crystalline-desert", "textureUrl": null },
    "encounters": ["relay-beacon", "drift-miners"]
  },
  "assetJobs": [ ... ]
}
```

## Environment variables

| Variable | Purpose |
|----------|---------|
| `FAL_KEY` | Fal.ai texture generation (`fal-ai/flux/schnell`) |
| `CONVEX_URL` | Future: persist sector + asset URLs |
| `DAYTONA_API_KEY` | Future: spawn sandbox workers |

Missing keys never crash the CLI — `textureUrl` stays `null` and the frontend keeps the procedural planet.

## Daytona-oriented production flow (planned)

```bash
# Future sketch — not deployed in this slice
daytona sandbox create --name starforge-relay-worker
daytona exec starforge-relay-worker -- npm run worker:sector -- --seed=482910 --fal
# Worker POSTs sectorJson + textureUrl back to Convex
```

## Files

| File | Role |
|------|------|
| `cli.ts` | Runnable local entrypoint |
| `sectorPipeline.ts` | Sector JSON builder + Fal hook + Daytona interface |

## App integration

- Frontend calls `POST /api/sector-art` (Vite dev/preview middleware) which reads `FAL_KEY` server-side
- `generateSectorArt(seed)` in `src/lib/assets/falSectorArt.ts` consumes that API and degrades to procedural textures
- On sector load / jump, `GameProvider` triggers sector package + texture fetch

See root `README.md` for Render deploy notes.
