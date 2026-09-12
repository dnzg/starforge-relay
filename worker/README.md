# Daytona Worker Stub

This folder holds the **Starforge Relay** offline generation pipeline stub for hackathon stretch goals.

## Purpose

When a player jumps to a new sector, a Daytona sandbox worker can:

1. Generate sector JSON (name, threat, encounters)
2. Queue Fal.ai texture jobs for the planet mesh
3. Push finished asset URLs back to Convex

## Current state

- `sectorPipeline.ts` exposes `createDaytonaPipelineStub()` and `generateSectorPackage()`
- Returns placeholder sector JSON and queued asset jobs
- No Daytona deploy wired yet

## Planned integration

```bash
# Example future flow (not implemented)
daytona sandbox create --name starforge-relay-worker
daytona exec starforge-relay-worker -- npm run worker:sector --seed=482910
```

Environment variables for production worker:

| Variable | Purpose |
|----------|---------|
| `FAL_KEY` | Fal.ai texture generation |
| `CONVEX_URL` | Persist sector + asset URLs |
| `DAYTONA_API_KEY` | Sandbox orchestration |

## Hook point

From Convex `sendCommand` on `jump`, call the worker stub (later: HTTP trigger to Daytona) with `{ runId, seed, sectorName, threatLevel }`.

See root README for hackathon ambition tiers.
