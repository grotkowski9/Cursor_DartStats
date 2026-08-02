# Security release attestation — v1.3.x (pre-prod)

**Branch:** `cursor/v1.3.x`  
**Date:** 2026-08-02  
**Scope:** full repo review + automated tests before production deploy.

## Verdict

**GO for deploy** from a code/security standpoint, with accepted risks listed below and **one human step remaining** (Google OAuth + one real N01 import on prod).

| Severity | Open |
|----------|------|
| CRITICAL | **0** |
| HIGH (unfixed) | **0** |
| HIGH → FIXED this sprint | open-redirect (`//evil`), ingest URL whitelist, PII in tracked sample, hardcoded home path in import script |
| ACCEPTED RISK | in-memory rate limit; CSP `unsafe-inline`/`unsafe-eval`; orphan Storage on abandoned identity confirm |

---

## What was fixed in this sprint

1. **`safeInternalPath`** — blocks protocol-relative / absolute open redirects on `next=` (login, Google OAuth start, middleware, auth callback cookies).
2. **Ingest server whitelist** — `checkN01MatchUrl` on `POST /api/ingest` before N01 fetch/save.
3. **Anonymized** `.dev/test-match-n01.json` + fixture `tests/fixtures/n01-sample.json` (no real names).
4. **Removed** hardcoded `/Users/grotkowskipiotr/...` default CSV path from `scripts/import-csv-matches.ts`.
5. **Deprecated** `PLAYER_DISPLAY_NAME` no longer embeds a real person string.
6. **ESLint** ignores `.dev/**` vendor dumps; CI runs typecheck + lint + unit tests + secret-pattern scan.

---

## Automated evidence

| Check | Result |
|-------|--------|
| `npm test` (Vitest) | **44 passed** — parser, URL, detect matrix, stats, toClientMatch, rate-limit, safe path, onboarding gates |
| `npm run typecheck` | **pass** |
| `npm run lint` | **0 errors** (warnings only, pre-existing UX) |
| `npm run test:e2e` (Playwright prod build) | **9 passed** — landing, demo, login, `/profile`→login, share 404, ingest 401, delete 401, **dev-upsert 403**, security headers |
| Tracked `.env*` | only `.env.example` (placeholders) |
| `"use client"` → `getSupabaseAdmin` | **none** |
| `.next/static` contains `SUPABASE_SERVICE_ROLE` / `getSupabaseAdmin` | **none** |
| Secret-like patterns in tracked source | only docs/example placeholders |

---

## Area review

| Area | Status | Notes |
|------|--------|-------|
| Auth / session | **OK** | Middleware protects `/profile`, `/onboarding`, `/api/*` (except `/api/auth/*`). Google OAuth via server route. |
| `dev-upsert` | **OK** | Blocked when `NODE_ENV=production` or `VERCEL_ENV=production` — e2e confirmed **403**. |
| OWNER_EMAIL → SEED | **OK / ops** | Intentional seed link; mis-set env is operational risk — verify on Vercel. |
| Ingest | **OK + FIXED** | Auth + rate limit + onboarding gate + **URL whitelist** + `toClientMatch` on save. |
| Match DELETE/PATCH | **OK** | Auth + ownership in `deleteMatch` / `updateMatchEdit`. |
| Share `/m/*` | **OK** | Public-by-link; noindex; access log; client strip of snapshot paths. |
| Demo `/demo/*` | **OK** | Static snapshot; no auth; write UI gated. |
| Supabase clients | **OK** | Browser = publishable only; admin = server/scripts/API/share page (RSC). |
| Headers / CSP | **OK / ACCEPTED** | nosniff, DENY frame, CSP present; `unsafe-inline`/`unsafe-eval` needed for Next/OAuth. |
| Rate limit | **ACCEPTED** | Per-process memory — weak on multi-instance; fine for early single deploy. |
| Storage orphans | **ACCEPTED** | Backup may run before identity confirm; delete cleans best-effort. |
| Scripts | **OK + FIXED** | Not in runtime bundle; require `.env.local`; CSV path must be passed explicitly. |
| Migrations / seed names | **OK** | Seed customer rows for MVP owner are expected DB seed data, not browser secrets. |
| Login placeholder `Grotkowski` | **ACCEPTED (dev UX)** | Visible only when `allowDevUpsert` (dev / `ALLOW_DEV_TEST_LOGIN`); not on prod Google-only path. |

---

## File categories reviewed

- `app/api/**` — auth gates, error shapes, no stack dumps of secrets
- `app/auth/**`, `app/login/**`, `lib/auth*.ts`, `lib/safe-path.ts`
- `lib/supabase/**`, `lib/matches.ts`, `lib/match-client.ts`, `lib/n01-*.ts`, `lib/player-detect.ts`, `lib/rate-limit.ts`, `lib/security-headers.ts`
- `app/m/**`, `app/demo/**`, `demo/**`, `middleware.ts`, `next.config.ts`
- `scripts/**`, `.env.example`, `.gitignore`, workflows

---

## Remaining for Piotr (cannot be automated safely)

1. Set Vercel env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`, optional `OWNER_EMAIL` / `SEED_CUSTOMER_ID` **consciously**.
2. After deploy: **Google login** once + **one real N01 import**.
3. Confirm prod: profile loads, share link works, `dev-upsert` still 403 on live URL.

---

## Commands to re-verify

```bash
npm run typecheck && npm run lint && npm test
npm run test:e2e   # needs .env.local for build
```
