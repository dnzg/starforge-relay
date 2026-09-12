# Starforge Relay

Voice-first cosmic roguelite **Telegram Mini App** with a WebGL cockpit view. Original sci-fi IP only — inspired by space opera tone, not licensed franchises.

Fly sector to sector, issue bridge commands (`scan`, `hail`, `engage`, `flee`, `status`, `jump`), and watch the HUD + 3D viewport react in real time.

## Quick start

```bash
npm install
npm run dev
```

Open **http://127.0.0.1:43123** — you should see a live WebGL starfield, planet, cockpit frame, and command HUD.

Type `scan` or tap the **scan** chip. The transcript and status panel update immediately.

**Backend:** When `VITE_CONVEX_URL` is set, runs, combat stats, sector history, and the live leaderboard sync through **Convex**. Without it, a **local in-memory fallback** keeps the arcade loop working for offline dev.

## Architecture

| Layer | Tech | Status |
|-------|------|--------|
| Frontend | Vite + React + TypeScript | Ready |
| 3D viewport | React Three Fiber + drei + Three.js | Ready |
| Backend | Convex (runs, players, leaderboard, combat sync) | Live when `VITE_CONVEX_URL` is set |
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

## Convex setup (required for hackathon live backend)

The Mini App **automatically uses Convex** when `VITE_CONVEX_URL` is present at build time. Without it, the local fallback runs in-memory only.

### Local development with Convex

```bash
# Terminal 1 — Convex dev sync (creates deployment, pushes schema + functions)
npm run convex:dev

# Terminal 2 — Vite + Hono API
npm run dev
```

Copy the deployment URL from `npx convex dev` output into `.env`:

```env
VITE_CONVEX_URL=https://your-deployment.convex.cloud
CONVEX_DEPLOYMENT=dev:your-deployment
```

Restart Vite after changing `VITE_CONVEX_URL` (Vite inlines env at startup).

### What syncs to Convex

- **Players** — keyed by Telegram `initDataUnsafe.user.id` when available
- **Runs** — hull, shields, fuel, credits, sector seed/name, arcade score, kills
- **Sectors** — history on each jump
- **Command logs** — bridge commands + ship AI lines
- **Leaderboard** — top scores on run end (combat death, flee, etc.)

HUD shows **“Convex live”** badge + run id suffix, plus a live leaderboard panel when connected.

### Production deploy

```bash
npx convex deploy
```

Set in Render (and locally for production builds):

| Variable | Required | Purpose |
|----------|----------|---------|
| `VITE_CONVEX_URL` | Yes (for Convex path) | Client URL — **must be set at Vite build time** |
| `CONVEX_DEPLOY_KEY` | Yes (CI/deploy) | `npx convex deploy` from Render build or GitHub Actions |

Tables: `players`, `runs`, `sectors`, `commandLogs`, `leaderboard`. Schema: `convex/schema.ts`.

## Environment variables

See `.env.example`:

| Variable | Purpose |
|----------|---------|
| `VITE_CONVEX_URL` | Convex client URL (required for live backend; Vite build-time) |
| `CONVEX_DEPLOYMENT` | Local Convex dev deployment name |
| `CONVEX_DEPLOY_KEY` | CI / Render Convex deploy |
| `XAI_API_KEY` | x.ai Voice token + ship AI interpret + TTS fallback (server only) |
| `FAL_KEY` | Fal.ai planet textures, ship avatar, and TTS (server/worker only) |
| `TELEGRAM_BOT_TOKEN` | Telegram bot + Mini App + Stars webhook |
| `VITE_APP_URL` | Public URL for Telegram menu button + webhook |
| `STARS_MOCK` | `1` = mock Stars flow (auto in dev); `0` = force real invoice in dev |

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
| `VITE_CONVEX_URL` | Yes (hackathon) | Convex client URL — **baked into Vite build** |
| `CONVEX_DEPLOY_KEY` | Yes (with Convex) | Deploy schema/functions before or during build |
| `TELEGRAM_BOT_TOKEN` | No | Bot API + Stars webhook |
| `STARS_MOCK` | No | Set `1` on Render to demo Stars UX without live checkout |
| `PORT` | Auto | Render sets this automatically |

The service serves the Vite build from `dist/` and exposes `/api/*` on the same origin.

### Convex on Render

1. Run `npx convex deploy` (locally or in build step with `CONVEX_DEPLOY_KEY`)
2. Set `VITE_CONVEX_URL` in Render **before** `npm run build` runs (Render env vars are available at build time)
3. Redeploy after changing `VITE_CONVEX_URL` — the value is inlined into the client bundle

### Telegram Mini App

**BotFather checklist**

1. Create a bot: [@BotFather](https://t.me/BotFather) → `/newbot`
2. Attach the Mini App: `/newapp` (or **Bot Settings → Menu Button**) and set the URL to your public HTTPS app URL (`VITE_APP_URL`)
3. Local env (`.env.local`, never commit):
   ```env
   TELEGRAM_BOT_TOKEN=123456:ABC...
   VITE_APP_URL=https://your-tunnel-or-render-url
   ```
4. Render dashboard: set the same `TELEGRAM_BOT_TOKEN` and `VITE_APP_URL` on the web service
5. Verify: `GET /api/telegram/status` → `{ "botConfigured": true }` (token value is never exposed)

**Local tunnel test (Mini App requires HTTPS)**

```bash
npm run dev
# In another terminal:
cloudflared tunnel --url http://127.0.0.1:43123
```

Copy the `https://*.trycloudflare.com` URL into BotFather as the Mini App URL. Vite proxies `/api` to the API on port 43124, so one tunnel URL serves both UI and API.

Browser fallback works for judges without Telegram — a banner explains preview mode.

On launch, the app calls `Telegram.WebApp.disableVerticalSwipes()` (when supported) so swipe-down does not accidentally dismiss the Mini App during arcade play. Older Telegram clients without this API are unaffected.

### Telegram Stars (XTR) — livery credits

Digital goods only: Stars buy **taste/time** (livery rerolls), not combat damage.

| SKU | Stars | Grant |
|-----|-------|-------|
| `livery_reroll` | 35 | One Fal hull paint credit |
| `demo_boost` | 10 | Cosmetic bridge flair flag |

**Flow**

1. Hangar → **Buy with Stars** → `POST /api/stars/invoice` → Bot API `createInvoiceLink` (currency `XTR`, no `provider_token`)
2. Mini App opens invoice via `Telegram.WebApp.openInvoice(link, callback)`
3. Webhook `POST /api/telegram/webhook` answers `pre_checkout_query` and grants entitlements on `successful_payment`
4. `GET /api/stars/entitlements` drives the Hangar credit counter

**Set webhook (once per deploy URL)**

```bash
# Requires TELEGRAM_BOT_TOKEN + VITE_APP_URL in .env
npm run telegram:set-webhook
# → https://starforge-relay.onrender.com/api/telegram/webhook
```

**Testing**

| Mode | How |
|------|-----|
| Browser demo | Dev enables `STARS_MOCK` automatically — Hangar shows **Grant mock livery credit** |
| Render demo | Set `STARS_MOCK=1` in dashboard |
| Real Stars | Set `STARS_MOCK=0`, configure webhook, buy 1★ live in Telegram; refund via Bot API `refundStarPayment` if needed |

Telegram’s test environment often cannot acquire Stars — use mock mode for judges and a single live purchase for proof.

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

- [x] Wire Convex live (`GameProvider` → Convex when `VITE_CONVEX_URL` set)
- [x] Telegram Mini App menu + theme sync polish
- [x] x.ai Voice realtime command stream + interpret fallback
- [x] Leaderboard panel from `getLeaderboard`

### Stretch (if time remains)

- [ ] Daytona worker generates sector JSON + queues Fal jobs on jump
- [x] Telegram Stars payments for livery rerolls (Hangar MVP + mock mode)
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
| `npm run telegram:set-webhook` | Point bot webhook at `{VITE_APP_URL}/api/telegram/webhook` |

## License

MIT — hackathon project scaffold.
