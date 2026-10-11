# Agent — czytaj to pierwsze

To **Sylveon Dart Profile** (`Cursor_DartStats`). **Źródło prawdy: `README.md`.** Ten plik to skrót, żebyś nie zgadywał.

## Stan (2026-10-10)

- Wersja **`3.1.0`** na `main`. Backup: branch `backup/v3.1.0`, tag `v3.1.0`. Rollback: `backup/v3.0.0`. Jak wrócić: README **Przywracanie backupa**.
- **Nie wydawaj na `main` bez wyraźnego polecenia usera.**
- Import: **N01** (mecz `tmid` / live `mid` / turniej / liga) + **Polski Ranking Darta** (turniej).
- Tagi per mecz: `matches.tags text[]` (max 8). Profil: uwzględnij tylko / wyklucz mecze z tagiem. Import overwrite **nie** czyści tagów. Migracja `20261010193000_match_tags.sql` **jest na produkcji**. Demo: tagi „Mecz towarzyski” / „Liga” + te same droplisty.
- Login gate: `app_settings.login_gate_enabled` + env `LOGIN_GATE_PASSWORD` (Vercel). Szczegóły w README.
- Dart i BET dzielą `auth.users` + `public.customers`; sesje cookie są **per subdomain**. Nie ruszaj `bet.*`.
- BET ≠ ukończony Dart. Brak `about_completed_at` → pełny onboarding Darta (`/onboarding` Krok 1, potem O Tobie). **Nie wydawaj na `main` bez wyraźnego polecenia usera.**
- Jedna tabela `public.matches`. Kolumna `source` (`n01` | `prd`). Zewnętrzne ID zawsze w `n01_tmid` (prawdziwy tmid albo `prd:<uuid>`). UNIQUE `(customer_id, n01_tmid)`.
- Prod DB: Supabase **`nwrhnmnaiqclpxcjfgcq`** (eu-west-1). Migracje `match_source` i `match_tags` **są na produkcji**.
- Ten projekt **współdzieli** Postgres z BET. **Nie ruszaj `bet.*`.** Żadnych DROP/ALTER poza `public` z naszej migracji.

## Zanim cokolwiek zaimplementujesz

1. Przeczytaj README (handoff + import + twarde zasady).
2. Nie zmieniaj planu w `.cursor/plans` jeśli user kazał go nie ruszać.
3. Pytaj o zakres backlogu **zanim** budujesz 2.0.x / admin / usuwanie konta.
4. Kod EN, UI PL. Zero halucynacji w KPI (brak danych → ukryj kafelek).
5. Tylko **501**. Inny `startScore` / `starting_points` → błąd, nie zapis.

## Szybki start

```bash
cp .env.example .env.local   # klucze z naszego Supabase, nie z PRD
npm install
npm run dev
npm test && npm run typecheck
```

## Import — gdzie kod

`lib/sources/*` → `POST /api/ingest/preview` (+ `/resolve`) → `POST /api/ingest/commit`  
UI: `app/profile/profile-add-match.tsx`  
Stary pojedynczy URL: `POST /api/ingest` nadal działa dla N01 `tmid`.

## Twarde nie

- Nie edytuj schematu `bet.*`, nie dodawaj FK z BET do naszych tabel poza istniejącym `public.customers`.
- Nie zapisuj `service_role` w kliencie. Publishable PRD to **ich** klucz z SPA — nie nasz secret.
- Nie commituj `.env.local` ani `.dev/*.json` (PII).
- Nie zakładaj playerIndex. Identity: 0 / 1 / N kandydatów → picker.
- Nie ciche nadpisanie duplikatu.

Szczegóły, URL-e, env, RLS, pliki, rollback: **README.md**.
