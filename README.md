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
- **Backend:** Express 5 + Zod + Node's built-in `node:sqlite` (no native deps), run with `tsx`

## Run

```bash
npm install
npm run dev         # frontend · http://localhost:5173 (proxies /api → :3001)
npm run server:dev  # backend  · http://localhost:3001 (watch mode; `npm run server` for plain)
npm run build       # type-check (app + server) + production build
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

`src/app/store.tsx`:

- `DEMO_MODE = true` — geolocation always resolves **in range** (~±18 m) so the full
  happy path is clickable without real GPS. Set to `false` to use the browser
  Geolocation API + haversine distance against the real geofence.
- `CHURCH` coords are a **Jakarta placeholder** (`-6.1944, 106.7892`). Replace with the
  actual GKI Delima coordinates before production.
- `GEOFENCE_RADIUS_M = 50`.

### Forcing failure states

Append a query param on the locating routes:

- `/checkin/locating?force=far` → out-of-range screen (±1.2 km)
- `/checkin/locating?force=gpsoff` → GPS-off help screen

Same for `/checkout/locating`.

### Simulated pieces

- **Admin approval** (`/signup/approval`) auto-advances after ~4.5 s.
- **Face scan** uses the front camera via `getUserMedia` when available, with a graceful
  gradient placeholder fallback; completes after ~3.2 s.
- App state (attendance, log, leave balance, requests) lives in a React context
  (`AppProvider`) — in-memory only; the frontend is not wired to the API yet.

## Backend (`server/`)

Express 5 + Zod + `node:sqlite` (requires Node ≥ 22.5; the DB file is created at
`server/data/gki.db` on first start and seeded with demo data). The Vite dev server
proxies `/api` to `http://localhost:3001`.

Seeded accounts:

| Account | Email | Password |
|---|---|---|
| Employee (Ruth Simanjuntak, saldo cuti 7) | `ruth.simanjuntak@gkidelima.org` | `gkidelima` |
| Admin (Koordinator Personalia) | `admin@gkidelima.org` | `admin123` |

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
geofence, leave matrices, dinas rates, lembur caps). Env vars: `PORT` (default 3001),
`GKI_DB_PATH`, `JWT_SECRET`, `GKI_DEMO_MODE=false` to require real coordinates and
manual admin approval.

## Design fidelity notes

All colors, gradients, radii, shadows, and animations are ported from the handoff
prototype's CSS variables (`--grad`, `--primary: #C13AD6`, `--bg: #FBF6FB`, etc.) and
keyframes (`gki-pulse`, `gki-userwave`, scan ring/line, skeleton shimmer, radar).
Screens follow the 402 px artboards; the app shell is a centered, max-width 430 px column.
