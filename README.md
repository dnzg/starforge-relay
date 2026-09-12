# Starforge Relay

Voice-first cosmic roguelite **Telegram Mini App** with a WebGL cockpit view. Original sci-fi IP only — inspired by space opera tone, not licensed franchises.

Fly sector to sector, issue bridge commands (`scan`, `hail`, `engage`, `flee`, `status`, `jump`), and watch the HUD + 3D viewport react in real time.

## Quick start

```bash
npm install
npm run dev
```

Open **http://127.0.0.1:43123** — you should see a live WebGL starfield, planet, cockpit frame, and command HUD.

Type `scan` or tap the **scan** chip. The transcript and status panel update immediately via the **local game backend** (no API keys required for the demo loop).

## Architecture

| Layer | Tech | Status |
|-------|------|--------|
| Frontend | Vite + React + TypeScript | Ready |
| 3D viewport | React Three Fiber + drei + Three.js | Ready |
| Backend | Convex schema + mutations/queries | Stubbed, ready for `npx convex dev` |
| Voice | Text always works; browser speech + x.ai stub | Stub |
| Sector art | `generateSectorArt(seed)` Fal stub | Stub |
| Worker | Daytona sector pipeline interface | Stub (`worker/`) |
| Telegram | `window.Telegram.WebApp` bootstrap + browser fallback | Ready |

### Command loop

1. Player sends text or voice command
2. Resolver handles core verbs (`convex/commandResolver.ts`, mirrored in `src/lib/game/`)
3. Run state + transcript update
4. `jump` triggers hyperspace streaks in the 3D scene

### Planet texture hook

`src/components/scene/Planet.tsx` renders a procedural shader by default. Pass `textureUrl` from `generateSectorArt()` when Fal.ai is wired:

```ts
import { generateSectorArt } from "./lib/assets/falSectorArt";

const art = await generateSectorArt(run.sectorSeed);
// art.textureUrl -> Planet textureUrl prop
```

## Convex setup (optional for local demo)

The app runs locally without Convex. To connect a real backend:

```bash
npx convex dev
```

Copy the deployment URL into `.env`:

```env
VITE_CONVEX_URL=https://your-deployment.convex.cloud
```

Then wire `GameProvider` to Convex mutations (`startRun`, `sendCommand`) and query `getRun`. Schema lives in `convex/schema.ts`.

Tables: `players`, `runs`, `sectors`, `commandLogs`, `leaderboard`.

## Environment variables

See `.env.example`:

| Variable | Purpose |
|----------|---------|
| `VITE_CONVEX_URL` | Convex client URL |
| `CONVEX_DEPLOY_KEY` | CI / Render Convex deploy |
| `XAI_API_KEY` | x.ai Voice (future) |
| `FAL_KEY` | Fal.ai planet textures |
| `TELEGRAM_BOT_TOKEN` | Telegram bot + Mini App |
| `VITE_APP_URL` | Public URL for Telegram menu button |

Never commit real keys.

## Deploy on Render

### Static site (frontend)

1. Create a **Static Site** on Render
2. Build command: `npm install && npm run build`
3. Publish directory: `dist`
4. Environment: `VITE_CONVEX_URL`, `VITE_APP_URL`

### Convex

1. Run `npx convex deploy` in CI or locally
2. Set `CONVEX_DEPLOY_KEY` in Render (if using automated deploy)

### Telegram Mini App

1. Create a bot via [@BotFather](https://t.me/BotFather)
2. Set Mini App URL to your Render static URL
3. Add `TELEGRAM_BOT_TOKEN` when bot webhooks are implemented

Browser fallback works for judges without Telegram — a banner explains preview mode.

## Project structure

```
convex/           Backend schema, command resolver, runs API
src/
  components/     R3F scene + HUD overlay
  hooks/          Telegram WebApp bootstrap
  lib/
    game/         Local fallback client + shared resolver
    voice/        x.ai / speech stubs + command bus
    assets/       Fal sector art stub
worker/           Daytona pipeline stub + README
```

## Hackathon ambition tiers

**Deadline reference:** one-day hackathon ending **19:00 Belgrade time**.

### Must (scaffold — this repo)

- [x] WebGL cockpit / sector view (starfield, planet, hyperspace feel)
- [x] Voice-first UX with reliable text fallback
- [x] Core command verbs update game state
- [x] Convex schema + stub resolver
- [x] Telegram WebApp bootstrap + browser fallback
- [x] Fal / x.ai / Daytona interfaces stubbed

### Should (same-day build)

- [ ] Wire Convex live (`npx convex dev`, replace local client)
- [ ] Telegram Mini App menu + theme sync polish
- [ ] Fal.ai planet texture on jump (swap `Planet` `textureUrl`)
- [ ] x.ai Voice realtime command stream
- [ ] Leaderboard panel from `getLeaderboard`

### Stretch (if time remains)

- [ ] Daytona worker generates sector JSON + queues Fal jobs on jump
- [ ] Telegram Stars payments for fuel / repairs
- [ ] Deeper combat loop and encounter events
- [ ] Persistent captain profile across runs

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server on port 43123 |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run convex:dev` | Start Convex dev sync |

## License

MIT — hackathon project scaffold.
