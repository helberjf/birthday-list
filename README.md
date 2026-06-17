# Birthday List — Kids' Party Digital Invitations

[![CI](https://github.com/helberjf/birthday-list/actions/workflows/ci.yml/badge.svg)](https://github.com/helberjf/birthday-list/actions/workflows/ci.yml)

A web app to sell personalized digital invitations for kids' parties, with RSVP, an admin panel, photos, reminders and a theme catalog.

**Live demo:** https://birthday-list-eta.vercel.app

## Stack

| Layer | Technology |
|---|---|
| Monorepo | pnpm workspaces |
| Frontend | React + Vite + Tailwind CSS |
| Backend | Express 5 |
| Default database | PostgreSQL + Drizzle ORM |
| Optional database | Firebase Firestore (via REST) |
| Validation | Zod |
| API client | React Query + Orval (generated from OpenAPI) |

## Requirements

- Node.js >= 22
- pnpm >= 9 (`npm i -g pnpm`)
- Docker Desktop

## Run locally (automatic script)

**Linux / macOS / Git Bash / WSL**

```bash
bash dev.sh
# reset the database from scratch:
bash dev.sh --reset
```

**Windows (PowerShell)**

```powershell
.\dev.ps1
# reset the database from scratch:
.\dev.ps1 -Reset
```

The scripts automatically: check prerequisites (Node >= 22, pnpm, Docker), copy `.env.example` → `.env.local` if missing, install dependencies, start PostgreSQL via Docker, apply the schema (`db push`), and start the API (port 3000) and frontend (port 5173) in parallel.

URLs after startup:

| URL | Description |
|---|---|
| http://localhost:5173 | Frontend |
| http://localhost:5173/admin | Admin panel |
| http://localhost:3000/api | REST API |

Default admin password: `admin123` (env var `ADMIN_PASSWORD` in `.env.local`).

## Run locally (manual)

```bash
pnpm install
cp .env.example .env.local
docker compose up -d postgres
pnpm --filter @workspace/db run push
# in separate terminals:
pnpm run dev:api   # port 3000
pnpm run dev:web   # port 5173
```

## Deploy to Vercel with Firebase (recommended)

1. Create a Firebase project, enable Firestore, and generate a service account key.
2. In the Vercel project, set the environment variables:

| Variable | Value |
|---|---|
| `DATABASE_PROVIDER` | `firebase` |
| `FIREBASE_PROJECT_ID` | your Firebase project ID |
| `FIREBASE_DATABASE_ID` | `(default)` |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | the service account JSON |
| `JWT_SECRET` | long random string |
| `ADMIN_PASSWORD` | admin panel password |
| `ALLOWED_ORIGINS` | `https://yourapp.vercel.app` |

3. Connect the repository and deploy (`npx vercel --prod` or via the Vercel dashboard). `vercel.json` is configured with build `pnpm run build:vercel`, output `artifacts/birthday-invite/dist/public`, and rewrites (`/api/*` → serverless function, `/admin/*` → SPA).

## Deploy to a VPS with Docker

```bash
cp .env.vps.example .env
# edit POSTGRES_PASSWORD, JWT_SECRET, ADMIN_PASSWORD, ALLOWED_ORIGINS
docker compose up -d --build
```

The app container runs `drizzle push` on startup, serves the built frontend and exposes everything on `http://YOUR_IP:3000`. In production, put Nginx/Caddy/Traefik in front for HTTPS and a domain.

> PostgreSQL is the default. To use Firebase, copy `.env.firebase.example` to `.env.local` and set `DATABASE_PROVIDER=firebase` (use the Firestore emulator locally, or a real Firebase project with the service account).

## Useful scripts

```bash
pnpm run dev:api
pnpm run dev:web
pnpm --filter @workspace/db run push
pnpm run typecheck
pnpm run build
pnpm --filter @workspace/api-spec run codegen
```

## Main endpoints

| Method | Route | Description |
|---|---|---|
| GET | `/api/event-config` | Public event configuration |
| GET | `/api/themes` | Active themes |
| GET | `/api/guests` | Guest list |
| POST | `/api/guests` | Confirm attendance (RSVP) |
| GET | `/api/stats` | Public statistics |
| GET | `/api/photos` | Gallery photos |
| POST | `/api/admin/login` | Admin login |
| PUT | `/api/event-config` | Update event |
| GET/POST/PATCH/DELETE | `/api/admin/themes` | Themes CRUD |

Full spec in `lib/api-spec/openapi.yaml`.

## License

MIT
