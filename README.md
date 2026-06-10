# GKI Delima · Presensi Karyawan

Employee attendance app for GKI Delima, implemented from the Claude Design handoff
(`GKI Delima Signup Flow.html`) as a Vite + React + TypeScript SPA, plus an Express
API backend (`server/`).

## Stack

- **Vite 8 + React 19 + TypeScript** (strict, `verbatimModuleSyntax`)
- **Tailwind CSS v4** via `@tailwindcss/vite` — design tokens mapped in `src/index.css` (`@theme inline`)
- **react-router-dom** for navigation
- **shadcn-style UI atoms** hand-written with `class-variance-authority` + `tailwind-merge` (`src/components/ui/`)
- Font: Plus Jakarta Sans (Google Fonts)
- **Backend:** Express 5 + Zod + Postgres (Supabase) via `postgres.js`, run with `tsx`

## Run

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL (Supabase pooled connection string)
npm run db:setup       # apply schema + seed admin (add `-- --demo` for demo data)
npm run dev            # frontend · http://localhost:5173 (proxies /api → :3001)
npm run server:dev     # backend  · http://localhost:3001 (watch mode; `npm run server` for plain)
npm run build          # type-check (app + server) + production build
```

## Feature map

| Area | Routes |
|---|---|
| Auth | `/` (splash), `/login` |
| Signup (3 steps + approval) | `/signup/step-1 … step-3`, `/signup/approval`, `/signup/success` |
| Home dashboard | `/home` (live clock, check-in/out hero, activity log) |
| Check-in flow | `/checkin/locating → ready → face → success` (+ `out-of-range`, `gps-off`) |
| Check-out flow | `/checkout/*` (same shape, mode-aware) |
| Requests hub | `/requests` |
| Cuti (leave) | `/requests/cuti`, `/cuti/sakit`, `/cuti/sent` — dynamic rules per type (tahunan/sakit/darurat/duka) |
| Dinas (business travel) | `/requests/dinas`, `/dinas/allowance`, `/dinas/sent` — Jabodetabek perimeter logic + allowance calculator |
| Lembur (overtime) | `/requests/lembur`, `/lembur/sent` — 0.5h stepper, 3h/day & 14h/week caps, 1/173 tariff |
| History & profile | `/history`, `/profile` |

## Demo mode

Demo mode is controlled by the **server** (`GKI_DEMO_MODE`, default on) and exposed to
the frontend via `GET /api/config`:

- Demo on — location checks always resolve **in range** (~±18 m) so the full happy
  path is clickable without real GPS, and signups auto-approve after ~4.5 s.
- `GKI_DEMO_MODE=false` — the frontend uses the browser Geolocation API and the server
  enforces the haversine distance against the real geofence; signups wait for a real
  admin decision (`POST /api/admin/users/:id/decision`).
- `CHURCH` coords (`server/rules.ts`) are a **Jakarta placeholder** (`-6.1944, 106.7892`).
  Replace with the actual GKI Delima coordinates before production.
- `GEOFENCE_RADIUS_M = 50`.

### Forcing failure states

Append a query param on the locating routes:

- `/checkin/locating?force=far` → out-of-range screen (±1.2 km)
- `/checkin/locating?force=gpsoff` → GPS-off help screen

Same for `/checkout/locating`.

### Simulated pieces

- **Face scan** uses the front camera via `getUserMedia` when available, with a graceful
  gradient placeholder fallback; the face *match* is simulated (~3.2 s) but the
  attendance record is real — the scan completion calls `POST /api/attendance/check-in`
  (or `check-out`) and the server validates the geofence again.
- Everything else is live: app state (attendance, log, leave balance, requests) is
  fetched from the API via `AppProvider` (`src/app/store.tsx`) using the typed client
  in `src/lib/api.ts`. The session token is kept in `localStorage` and app routes are
  gated by `RequireAuth` (`src/app/router.tsx`).

## Backend (`server/`)

Express 5 + Zod + Postgres on Supabase (`postgres.js` client; schema in
`server/schema.sql`, applied by `npm run db:setup`). The Vite dev server proxies
`/api` to `http://localhost:3001`. All business dates/times are evaluated in
`Asia/Jakarta` regardless of the server's clock.

Seeded accounts (`db:setup` seeds the admin from `ADMIN_EMAIL`/`ADMIN_PASSWORD`;
the demo employee only with `-- --demo`):

| Account | Email | Password |
|---|---|---|
| Admin (Koordinator Personalia) | `admin@gkidelima.org` (default) | `ADMIN_PASSWORD` (default `admin123`) |
| Demo employee (Ruth Simanjuntak, saldo cuti 7) | `ruth.simanjuntak@gkidelima.org` | `gkidelima` |

### Endpoints

| Area | Endpoint | Notes |
|---|---|---|
| Health/config | `GET /api/health`, `GET /api/config` | geofence coords + radius, demo mode |
| Signup | `POST /api/auth/signup` | creates a `pending` account |
| Approval polling | `GET /api/auth/signup/:id/status` | demo mode auto-approves after ~4.5 s |
| Login | `POST /api/auth/login` | → `{ token, user }` (HS256 bearer token, 7 days) |
| Profile | `GET /api/auth/me` | user + leave balance + today's attendance |
| Check-in/out | `POST /api/attendance/check-in`, `…/check-out` | body `{ lat?, lng?, force? }`; validates the 50 m geofence, flags late ≥ 08.00, `force: "far" \| "gpsoff"` mirrors the frontend query params |
| Attendance | `GET /api/attendance/today`, `GET /api/attendance/log` | log backs `/home` and `/history` |
| Requests | `GET /api/requests` | newest first |
| Cuti | `POST /api/requests/cuti` | tahunan ≤ saldo; sakit requires `doctorNote`; darurat 1 hari · 1×/bulan · 3×/tahun; duka maks 2 (dalam kota) / 4 (luar Jawa) hari |
| Dinas | `POST /api/requests/dinas` | Jabodetabek perimeter → no allowance; otherwise server computes transport/makan/akomodasi (75k/150k/350k rates) |
| Lembur | `POST /api/requests/lembur` | 0.5 h steps; caps 3 h/hari & 14 h/minggu enforced across existing requests |
| Admin | `GET /api/admin/users`, `POST /api/admin/users/:id/decision`, `GET /api/admin/requests`, `POST /api/admin/requests/:id/decision` | approving a cuti tahunan deducts the leave balance |

All business rules live in `server/rules.ts` (same constants as the frontend screens:
geofence, leave matrices, dinas rates, lembur caps). Env vars (see `.env.example`):
`DATABASE_URL` (required), `JWT_SECRET` (required in production), `GKI_DEMO_MODE`
(default: on in dev, off in production), `PORT` (default 3001), `ADMIN_EMAIL` /
`ADMIN_PASSWORD` (db:setup seeding).

## Deployment (Vercel + Supabase)

- **Database** — Supabase Postgres. Use the **pooled** connection string
  (Supavisor transaction mode, port 6543) as `DATABASE_URL`; the client runs with
  `prepare: false` to be pooler-compatible. Apply the schema once with
  `npm run db:setup`.
- **API** — `api/index.ts` exports the Express app as a single Vercel serverless
  function; `vercel.json` rewrites `/api/*` to it (the app routes on the original
  URL) and everything else to the SPA's `index.html`.
- **Frontend** — built by `npm run build` into `dist/`, served as static assets on
  the same domain (no CORS needed; the dev-only CORS middleware is skipped in
  production).
- **Required Vercel env vars** — `DATABASE_URL`, `JWT_SECRET`. Optional:
  `GKI_DEMO_MODE=true` to keep demo behaviour on a staging deployment.
- Before real use: replace the placeholder `CHURCH` coordinates in
  `server/rules.ts`.

## Design fidelity notes

All colors, gradients, radii, shadows, and animations are ported from the handoff
prototype's CSS variables (`--grad`, `--primary: #C13AD6`, `--bg: #FBF6FB`, etc.) and
keyframes (`gki-pulse`, `gki-userwave`, scan ring/line, skeleton shimmer, radar).
Screens follow the 402 px artboards; the app shell is a centered, max-width 430 px column.
