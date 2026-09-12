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
| Voice | x.ai realtime + `/api/voice/*` + browser speech + ship TTS | Wired (graceful fallback) |
| Sector art | `generateSectorArt(seed)` → Fal `flux/schnell` via `/api/sector-art` | Wired (graceful fallback) |
| Ship AI | Fal portrait (`/api/ship-avatar`) + Fal/x.ai TTS (`/api/voice/speak`) | Wired (offline fallback) |
| Worker | Daytona sector pipeline + local CLI | Runnable (`npm run worker:sector`) |
| Telegram | `window.Telegram.WebApp` bootstrap + browser fallback | Ready |

### Command loop

1. Player sends text or voice command
2. Resolver handles core verbs (`convex/commandResolver.ts`, mirrored in `src/lib/game/`)
3. Run state + transcript update
4. `jump` triggers hyperspace streaks in the 3D scene

### Voice (x.ai + fallbacks)

1. Add `XAI_API_KEY` to `.env` (server-side only)
2. API routes (Hono server on port **43124** in dev, same process in production):
   - `GET /api/voice/status` — whether x.ai is configured
   - `POST /api/voice/token` — short-lived realtime client secret
   - `POST /api/voice/interpret` — map freeform speech/text to bridge commands via ship AI
   - `POST /api/voice/speak` — TTS for key ship AI lines (Fal `xai/tts/v1` first, then x.ai `/v1/tts`)
3. Client prefers **x.ai realtime** when configured; otherwise **browser SpeechRecognition**; always falls back to **typed commands**
4. HUD shows the female ship-computer avatar when the ship AI speaks; TTS plays when `FAL_KEY` or `XAI_API_KEY` is set, otherwise silent text

Without `XAI_API_KEY`, voice mock + browser speech + text still work. Without both keys, the checked-in avatar at `/avatars/ship-ai.jpg` still appears.

### Ship AI avatar + TTS

1. `GET /api/ship-avatar` generates or returns a cached portrait keyed `ship-ai-v1` (Fal `flux/schnell`, same cache pattern as sector art)
2. HUD mounts the portrait in the top chrome; it glows while a ship line is speaking
3. `POST /api/voice/speak` with `{ "text": "..." }` caches MP3s under `.cache/ship-tts`
4. Keys stay server-side (`FAL_KEY`, `XAI_API_KEY`) — never `VITE_`

### Planet textures (Fal.ai)

1. Add `FAL_KEY` to `.env` (server-side only — never prefix with `VITE_`)
2. Dev/preview server exposes `POST /api/sector-art` with `{ "seed": number }`
3. `generateSectorArt(seed)` in the client calls that route and returns a hosted `textureUrl` when Fal succeeds
4. `Planet.tsx` crossfades from procedural shader to the Fal JPEG when the URL loads
5. Without `FAL_KEY`, status shows **Procedural planet** and gameplay continues

```bash
# Optional: generate sector JSON locally (see worker/README.md)
npm run worker:sector -- --seed=482910 --name="Azure Belt 494" --fal
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
| `XAI_API_KEY` | x.ai Voice token + ship AI interpret + TTS fallback (server only) |
| `FAL_KEY` | Fal.ai planet textures, ship avatar, and TTS (server/worker only) |
| `TELEGRAM_BOT_TOKEN` | Telegram bot + Mini App |
| `VITE_APP_URL` | Public URL for Telegram menu button |

Never commit real keys.

## Deploy on Render

This repo ships a **Node web service** (not static-only) so API keys stay server-side.

### Option A — Blueprint (`render.yaml`)

1. Push repo to Origin/GitHub
2. In Render: **New → Blueprint** and point at this repo
3. Set secret env vars in the dashboard: `FAL_KEY`, `XAI_API_KEY`, optional `TELEGRAM_BOT_TOKEN`, `VITE_APP_URL`

### Option B — Manual web service

| Setting | Value |
|---------|-------|
| Runtime | Node |
| Build command | `npm install && npm run build` |
| Start command | `npm start` |
| Health check | `/api/health` |

**Environment variables (Render dashboard):**

| Variable | Required | Purpose |
|----------|----------|---------|
| `FAL_KEY` | No | Fal planet textures, ship avatar, and TTS |
| `XAI_API_KEY` | No | x.ai voice token + ship AI interpret + TTS |
| `VITE_APP_URL` | No | Public URL for Telegram Mini App menu |
| `TELEGRAM_BOT_TOKEN` | No | Future bot webhooks |
| `PORT` | Auto | Render sets this automatically |

The service serves the Vite build from `dist/` and exposes `/api/*` on the same origin.

### Convex (optional)

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
server/           Hono API + production static server (Fal, x.ai)
shared/           Fal, voice, sector generation, command interpreter
src/
  components/     R3F scene + HUD overlay
  hooks/          Telegram WebApp bootstrap
  lib/
    game/         Local fallback client + command resolver
    voice/        x.ai realtime engine, browser speech, interpret client
    assets/       Fal client wrapper (generateSectorArt)
    sector/       Browser-safe sector package stub
worker/           Daytona pipeline + runnable CLI (worker/README.md)
render.yaml       Render blueprint
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
- [x] Fal.ai planet textures wired with graceful fallback (`FAL_KEY`)
- [x] Runnable local worker for sector JSON (`npm run worker:sector`)

### Should (same-day build)

- [ ] Wire Convex live (`npx convex dev`, replace local client)
- [ ] Telegram Mini App menu + theme sync polish
- [x] x.ai Voice realtime command stream + interpret fallback
- [ ] Leaderboard panel from `getLeaderboard`

### Stretch (if time remains)

- [ ] Daytona worker generates sector JSON + queues Fal jobs on jump
- [ ] Telegram Stars payments for fuel / repairs
- [ ] Deeper combat loop and encounter events
- [ ] Persistent captain profile across runs

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | API server (43124) + Vite (43123) with `/api` proxy |
| `npm run dev:vite` | Frontend only (needs `npm run dev:api` separately) |
| `npm run dev:api` | Hono API only on port 43124 |
| `npm run build` | Typecheck + Vite production build |
| `npm start` | Production server (static `dist/` + `/api/*`) |
| `npm run preview` | Build + API + Vite preview |
| `npm run worker:sector` | Local sector JSON CLI |
| `npm run convex:dev` | Start Convex dev sync |

## License

MIT — hackathon project scaffold.
