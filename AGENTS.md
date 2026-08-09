# AGENTS.md

## Cursor Cloud specific instructions

This is a single Next.js 16 (App Router, Turbopack) + React 19 + TypeScript app
("Dart Profile Tracker"). Its only backend is **Supabase** (Postgres + Auth +
Storage). There is no separate backend service. Standard commands live in
`package.json` (`dev`, `build`, `start`, `lint`, `seed`, `seed:demo`,
`snapshot:demo`) and setup steps are in `README.md`.

### Services

| Service | How to run | Notes |
| --- | --- | --- |
| Next.js dev server | `npm run dev` (port 3000) | The app itself. Uses `.env.local`. |
| Local Supabase | `supabase start` / `supabase stop` / `supabase status` | Postgres+Auth+Storage in Docker. Migrations in `supabase/migrations/` apply automatically on `supabase start`. |

### Non-obvious startup caveats (local dev on the cloud VM)

- **Docker daemon is not auto-started.** systemd is not running, so start it once
  per boot before Supabase: `sudo dockerd > /tmp/dockerd.log 2>&1 &` (wait ~5s).
  Docker uses the `fuse-overlayfs` storage driver and `iptables-legacy` (already
  configured in `/etc/docker/daemon.json` and via `update-alternatives`).
- **Supabase CLI is a two-binary shim.** Both `supabase` and `supabase-go` must be
  on `PATH` (both are in `/usr/local/bin`). Run it with sudo so it can reach the
  Docker socket: `sudo env PATH="$PATH" supabase start`.
- **`.env.local` is required and git-ignored.** The app throws at runtime if
  Supabase env vars are missing. Recreate it from `supabase status` values:
  `NEXT_PUBLIC_SUPABASE_URL` = Project URL (`http://127.0.0.1:54321`),
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = the Publishable key,
  `SUPABASE_SERVICE_ROLE_KEY` = the Secret key. Also set
  `SEED_CUSTOMER_ID=a0000000-0000-4000-8000-000000000001`, `OWNER_EMAIL=<you>`,
  `NEXT_PUBLIC_SITE_URL=http://localhost:3000` (see `.env.example`).
- **Seeding needs outbound network.** `npm run seed` fetches real matches from
  `n01darts.com` (fallback API `tk2-228-23746.vs.sakura.ne.jp`), parses them,
  computes stats and writes to Supabase for the seed customer. This is the core
  data pipeline. The seed customer row is created by the initial migration, so
  seed can run right after `supabase start`.

### Testing / viewing without login

- Login is **Google OAuth only** and cannot be exercised on the VM (no OAuth app /
  public callback), so `/profile` and `/onboarding` redirect to `/login`.
- Auth is **not** required to verify the live DB path: `/m/<shareToken>` renders a
  real match straight from the DB (get tokens via
  `select share_token, title from public.matches;`). `/demo/profile` renders the
  full stats dashboard from a static snapshot (`demo/demo-profile-snapshot.json`),
  no DB needed.

### Lint / build note

- `npm run lint`, `npm run build`, and `npm run dev` all work. Note `npm run lint`
  currently reports 2 pre-existing errors + some warnings in app code (unrelated to
  environment setup); these do not block `npm run build` (Next.js 16 does not fail
  the build on them).
