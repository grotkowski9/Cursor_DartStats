# Cursor_DartStats

**Sylveon Dart Profile** — prywatny panel statystyk darta (mecze **501**). Next.js 16 App Router. Docelowo `dart.sylveoncompany.pl` / `darts.pl`.

> **README = źródło prawdy dla agenta.** Czytaj od góry. Changelog historyczny jest na dole — nie nadpisuje stanu.

---

## Agent — start tutaj (v3.1.0)

**Data sync:** 2026-10-10. **`package.json` version `3.1.0`.**

| | |
| --- | --- |
| Produkcja git | `main` |
| Backup tego wydania | branch `backup/v3.1.0` + tag `v3.1.0` |
| Rollback v3.0 | `backup/v3.0.0` / tag `v3.0.0` |
| Rollback przed importem PRD | `backup/v2.0.1` / tag `v2.0.1`; firstPROD: `backup/v2.0-firstPROD` |
| Repo | `grotkowski9/Cursor_DartStats` |
| Owner produktowy | Piotr „Groteł” Grotkowski |
| Język | **Kod EN, UI PL** |

### Co jest na produkcji (fakt, nie plan)

- Multi-user: Google OAuth, RLS per `auth.users` → `customers.auth_user_id`.
- Login gate (hasło na `/login`) sterowany `app_settings.login_gate_enabled` — bez redeploy.
- Profil: `GET /api/profile/bootstrap` (bulk mecze + insights). Lista = karty, nie kompakt W/L.
- Demo publiczne `/demo/*` — **nigdy** dane Piotra; snapshot + `DEMO_CUSTOMER_ID`.
- **Import v3:** N01 mecz / turniej / liga / **live-or-history `mid`**, oraz turniej **Polski Ranking Darta**.
- **Tagi per mecz** (`matches.tags text[]`) + filtr profilu include/exclude. Migracja `20261010193000_match_tags.sql` **jest na produkcji**.
- Prod Postgres: projekt Supabase **`nwrhnmnaiqclpxcjfgcq`** (`https://nwrhnmnaiqclpxcjfgcq.supabase.co`, region `eu-west-1`).
- Kolumny **`public.matches.source`** i **`public.ingest_snapshots.source`** (`text NOT NULL DEFAULT 'n01'`, check `n01|prd`) **są na żywej bazie** (sprawdzone 2026-10-10). Historyczne mecze: `source = n01` (ok. 276 wierszy w momencie audytu).
- Ten sam Postgres ma schemat **`bet`** (inny produkt). **Nie ruszaj `bet.*`.** Jedyny most: FK z BET do `public.customers` jeśli już istnieje — nie dodawaj nowych.

### Twarde zasady (łamiesz = zły PR)

1. **Nie edytuj `bet.*`.** Zero DROP/ALTER/GRANT poza `public` z naszych migracji.
2. **Jedna tabela meczów:** `public.matches`. Nie twórz `prd_matches`.
3. **`n01_tmid` zostaje** zewnętrznym ID: prawdziwy tmid N01 **albo** `prd:<uuid>`. UNIQUE `(customer_id, n01_tmid)`.
4. **`source`** tylko `'n01' | 'prd'`.
5. **Tylko 501.** Inny start score → komunikat, brak zapisu. Trigger DB też odrzuca nie-501.
6. **Identity:** 1 kandydat → auto; 0 → pytanie + picker; N (np. dwóch Nowaków) → picker, nigdy zgadywanie.
7. **Duplikat:** pytaj (skip / overwrite). Preview odznacza już istniejące. Commit bez `overwrite` nie nadpisuje.
8. **Brak pola w danych → ukryj kafelek**, nie zmyślaj KPI.
9. **Noindex** `/profile`, `/m/*`, `/onboarding`, `/logintest`. Landing `/` i `/demo` indeksowalne.
10. **Nie commituj** `.env.local`, `.dev/*.json` (PII), planów usera jeśli kazał nie ruszać.
11. **Premium / PayNow (linia 2.0.x) — ⏸️.** Milestone v3 ≠ freemium.
12. **Backlog rosnąco po ID.** Nie zgaduj kolejności; potwierdź zakres.
13. **Nie wydawaj na `main` bez wyraźnego polecenia usera.** PR i gałąź — tak. Merge/push `main` + tag backup — tylko gdy user napisze.

### Prompt na nowy czat (wklej)

```
Projekt: Sylveon Dart Profile (Cursor_DartStats). README + AGENTS.md = źródło prawdy.

Stan: v3.1.0 na main. Backup backup/v3.1.0 + tag v3.1.0. Nie merguj na main bez polecenia.
DB: Supabase nwrhnmnaiqclpxcjfgcq. Nie ruszaj bet.*.
matches.source (n01|prd) + n01_tmid (tmid albo prd:<uuid>) UNIQUE(customer_id, n01_tmid). Migracja source jest na prod.
matches.tags text[] (max 8) — tag per mecz. Profil: uwzględnij tylko / wyklucz mecze z tagiem. Import overwrite nie czyści tagów. Migracja tags na prod.

Import: lib/sources/* → POST /api/ingest/preview (+ /resolve) → POST /api/ingest/commit.
N01: tmid, mid (match/list?mid= → tmid; skip niedokończone), turniej tdid, liga lgid.
PRD: https://polskirankingdarta.pl/turnieje/{slug}. Klucze ich SPA (builtin + rediscovery). Env PRD_* opcjonalne.
Tylko 501. Identity 0/1/N. Duplikaty pytaj. Kod EN, UI PL. 2.0.x płatności ⏸️.
```

---

## Spis treści

1. [Produkt](#produkt)
2. [Stack](#stack)
3. [Infrastruktura i sekrety](#infrastruktura-i-sekrety)
4. [Schemat bazy](#schemat-bazy)
5. [Import v3 — N01 + PRD](#import-v3--n01--prd)
6. [Parser N01](#parser-n01)
7. [KPI](#kpi)
8. [Detekcja gracza i duplikaty](#detekcja-gracza-i-duplikaty)
9. [Auth, onboarding, profil](#auth-onboarding-profil)
10. [Login gate — instrukcja (on/off, hasło)](#login-gate--instrukcja-onoff-hasło)
11. [Dart vs BET — ten sam Supabase](#dart-vs-bet--ten-sam-supabase)
12. [Tagi meczów i filtr profilu](#tagi-meczów-i-filtr-profilu)
13. [Mapa plików](#mapa-plików)
14. [Uruchomienie i testy](#uruchomienie-i-testy)
15. [Bezpieczeństwo](#bezpieczeństwo)
16. [Design](#design)
17. [Konwencje](#konwencje)
18. [Roadmapa skrócona](#roadmapa-skrócona)
19. [ADR](#adr)
20. [Dziennik wersji](#dziennik-wersji)

---

## Produkt

Kompletna historia zawodnika z lokalnych turniejów:

- Mecze z **N01** (pojedynczy / turniej / liga / link live `mid`) albo z **Polskiego Rankingu Darta** (turniej), archiwizowane (JSON + HTML backup w Storage).
- Własny widok throw-by-throw (`/m/{shareToken}`), niezależny od n01darts.com.
- Statystyki, forma, H2H, aktywność.

Mobile-first, ciemny motyw, glassmorphism.

**MVP historycznie** = single user, ale schemat od dnia 0 ma `customer_id`. **Teraz** to multi-user z Google.

Docelowo freemium SaaS — **konfiguracja limitów, nie hardcoded**; **start bez płatności**.

---

## Stack

| Warstwa | Wybór |
| --- | --- |
| Framework | Next.js 16 (App Router), React 19 |
| Język | TypeScript strict |
| Styling | Tailwind v4 + shadcn-style, Inter |
| Wykresy | Recharts |
| DB + Storage + Auth | Supabase (`nwrhnmnaiqclpxcjfgcq`) |
| Hosting | Vercel |
| Testy | Vitest + Playwright (`npm run test:e2e`) |
| Package manager | npm |

---

## Infrastruktura i sekrety

### Nasz Supabase (DartStats)

- Project ref: **`nwrhnmnaiqclpxcjfgcq`**
- URL: `https://nwrhnmnaiqclpxcjfgcq.supabase.co`
- Region: `eu-west-1`
- Env (patrz `.env.example`):
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (`sb_publishable_…`)
  - `SUPABASE_SERVICE_ROLE_KEY` — **tylko serwer** (`sb_secret_…`)
  - `SEED_CUSTOMER_ID` — uuid Piotra `a0000000-0000-4000-8000-000000000001`
  - `OWNER_EMAIL` — Google owner → auto-link do seed
  - `DEMO_CUSTOMER_ID` — default `b0000000-…`
  - `NEXT_PUBLIC_SITE_URL`
  - `LOGIN_GATE_PASSWORD` (opcjonalnie)
  - `ALLOW_DEV_TEST_LOGIN` — `/login` upsert w dev

**Publishable nasz ≠ service_role.** Publishable jest w SPA i to OK (RLS). Service role nigdy w kliencie.

### Polski Ranking Darta (cudzy projekt)

Ich publiczny REST (ostatnia znana para w kodzie, **nie** nasze sekrety):

- Site: `https://polskirankingdarta.pl`
- Builtin REST: `https://tszuyyibbyjyznwdpnpe.supabase.co` + `sb_publishable_…` w `lib/sources/prd-config.ts`
- Opcjonalnie wymuszenie: `PRD_SUPABASE_URL`, `PRD_SUPABASE_PUBLISHABLE_KEY`
- Gdy builtin/env padnie (401/403/martwy projekt): import **ściąga HTML+JS SPA** i wyciąga aktualny URL + publishable (ten sam, który ma ich przeglądarka). Cache ~30 min.
- To **nie** jest dump bazy. `/m/` u nas to capability URL (64-bit share token), nie wyciek tabeli.

Migracje aplikujemy w **SQL Editor** albo MCP `apply_migration` na **nasz** projekt. Lista:

| Plik | Po co |
| --- | --- |
| `20260711180000_initial_schema.sql` | rdzeń |
| `20260711190000_customer_name_fields.sql` | imię/nazwisko/nick |
| `20260713220000_demo_customer.sql` | demo |
| `20260715210000_auth_rls_per_user.sql` | RLS per user |
| `20260721210000_drop_customer_display_name.sql` | drop `display_name` |
| `20260721220000_customer_about_fields.sql` | O Tobie |
| `20260809154500_reject_non_501_matches.sql` | tylko 501 |
| `20260809214500_app_settings_login_gate.sql` | login gate |
| `20261010170000_match_source.sql` | **`source` n01/prd** — **na prod** |
| `20261010193000_match_tags.sql` | **`matches.tags text[]`** — tagi per mecz |

---

## Schemat bazy

Szkic aktualny (czytelne nazwy, bez skrótów). UI skleja imię przez `formatCustomerDisplayName()` — **brak kolumny `display_name`**.

```sql
customers (
  customer_id uuid PK,
  auth_user_id uuid REFERENCES auth.users,  -- NULL tylko legacy/seed
  first_name, last_name, nickname, known_nicknames text[],
  role text DEFAULT 'user',  -- user | premium | admin | superadmin
  -- pola About (1.1.10): city, brand, weight, hand, favorite, …
  created_at, updated_at
)

matches (
  match_id uuid PK,
  customer_id uuid REFERENCES customers,
  n01_tmid text NOT NULL,              -- N01 tmid ALBO prd:<uuid>
  source text NOT NULL DEFAULT 'n01',  -- n01 | prd
  match_type text NOT NULL,            -- league | tournament
  title, opponent_name, start_time,
  start_score int DEFAULT 501,
  player_index int,                    -- 0 lub 1
  player_legs_won, opponent_legs_won,
  player_average, player_first9, player_checkout_pct,
  raw_payload jsonb,
  snapshot_path text NOT NULL,
  html_snapshot_path text,
  share_token text UNIQUE,             -- nowe: 16 hex SHA256(customerId:tmid); legacy 8 znaków
  tags text[] NOT NULL DEFAULT '{}',   -- etykiety usera (max 8); import ich nie nadpisuje
  created_at, updated_at,
  UNIQUE(customer_id, n01_tmid)
)

legs (… ON DELETE CASCADE od match)
visits (… throw-by-throw; visit 0 = setup)
share_links (share_token, match_id, revoked_at)
ingest_snapshots (n01_tmid, payload_hash, snapshot_path, source, …)
snapshot_access_log
app_settings (key, value)  -- m.in. login_gate_enabled
```

**RLS:** deny-by-default na tabelach user data. API Routes używają session **albo** `service_role` po `requireAuth`. Ingest wymaga zalogowanego customer (gate onboarding).

**Share token:** `computeShareToken` = `SHA256(`${customerId}:${tmid}`).slice(0, 16)` (`lib/n01-parser.ts`).

---

## Import v3 — N01 + PRD

### Flow UI

`app/profile/profile-add-match.tsx`

1. User wkleja **jeden albo wiele URL-i** (linie).
2. `POST /api/ingest/preview` → grupy (turniej/liga/mecz) + identity + lista meczów (`alreadyInDb` odznaczone).
3. Jeśli `ambiguous` / `none` → picker (`POST /api/ingest/preview/resolve` z `participantId`).
4. User odznacza mecze, potem `POST /api/ingest/commit` (`overwrite` per item).
5. Stary path `POST /api/ingest` (pojedynczy N01 `tmid`) zostaje.

### Detekcja URL — `lib/sources/detect-url.ts`

| kind | Przykład |
| --- | --- |
| `n01_match` | `n01darts.com/.../n01_view.html?tmid=t_…` |
| `n01_mid` | live/history `?mid=9f7AyPX9_…` — **po `tmid` w parserze** |
| `n01_tournament` | `/tournament/comp.php?id={tdid}` |
| `n01_league` | `/league/portal.php?lgid=` albo `/league/season.php` |
| `prd_tournament` | `polskirankingdarta.pl/turnieje/{slug}` |
| `unknown` | inny host / brak id |

`tmid` wygrywa z `mid` na tym samym URL-u.

### N01

- Lista: `GET https://push.n01darts.com/api/v1/match/list` (`tmid` / `mid` / turniej / liga).
- Szczegół meczu (throw-by-throw): POST `N01_API` w `lib/constants.ts` (`match_view` + `tmid`).
- **`mid`:** `fetchN01MatchByMid` → wiersz z `tmid`. Preview używa `n01ViewUrl(tmid)`. **Niedokończone** (`endMatch !== 1`) **skip**.
- Liga: najpierw sezony/tdid, potem mecze finished.
- Identity N01: `tpid` + nazwy (`P. Grotkowski` vs last name + inicjał — `n01NameMatches`).

### PRD

- `lib/sources/prd.ts` + `prd-config.ts`.
- Turniej po slugu → uczestnicy → mecze group/knockout.
- Mapowanie rzutów PRD → kształt `N01Match` (ten sam `saveMatch`).
- Zewnętrzne ID: **`prd:${matchUuid}`**.
- `starting_points` na turnieju (nie na każdym meczu) — 501 only.
- Gdy ich projekt się zrotuje: rediscovery z HTML (`index-*.js`).

### Commit

`lib/sources/commit.ts` → N01: `ingestAndSave`; PRD: fetch + `parseAndBackupPrd` + `saveMatch`. Dedup w batchu po `source:externalId`.

---

## Parser N01

Endpoint szczegółów:

```
POST https://tk2-228-23746.vs.sakura.ne.jp/n01/tournament/n01_user_t.php?cmd=match_view
Body: { tmid: "..." }
```

JSON: `statsData`, `legData`, `title`, `startTime`, `startScore`.

**Negative-score encoding** (`lib/n01-parser.ts`):

| `score` | `left` | Znaczenie | `actual_score` | `darts_thrown` |
| --- | --- | --- | --- | --- |
| 0 | 501 | Setup (pomijany) | 0 | 0 |
| ≥ 0 | > 0 | Wizyta | = score | 3 |
| = 0 | > 0 | Miss | 0 | 3 |
| **< 0** | **= 0** | **Checkout:** `\|score\|` = lotki | checkout pts | \|score\| |
| < 0 | > 0 | Bust | 0 | 3 |

---

## KPI

| KPI | Definicja |
| --- | --- |
| 3-Dart Average | `(total_score / total_darts) × 3` |
| First 9 | 3-dart z pierwszych 3 wizyt każdego lega |
| 60+ / 80+ / … / 180 | Exclusive buckety |
| High Finish | Najwyższy checkout (wygrany leg) |
| 100+ Finishes | Checkout ≥ 100 |
| Best / Worst Leg | Najkrótszy / najdłuższy wygrany leg (lotki) |
| Checkout % | wygrane legi / próby (`left ≤ 170`) |

Kod: `lib/stats.ts`, `computeMatchStats`. Brak danych → UI ukrywa, nie kłamie.

---

## Detekcja gracza i duplikaty

Wzorce: `autoDetectPatterns(customer)` = **lastName + nickname + known_nicknames**. **Nie** samo imię (bug Lovable: wszyscy Piotrzy).

| Status | Zachowanie |
| --- | --- |
| `auto` (1 kandydat) | zapis bez pytania |
| `ambiguous` (N) | picker (np. 2× Nowak, albo Groteł vs Piotr Grotkowski w jednym meczu) |
| `none` (0) | pytanie + wybór slotu / uczestnika; **Odrzuć** = brak zapisu |

Podobne nazwiska (**Grotowski**, **Grodkowski**) **nie** matchują `Grotkowski`.

**Duplikat** = ten sam `(customer_id, n01_tmid)`. Preview: `alreadyInDb`, `selected: false`. Commit bez overwrite → `duplicate`. Nadpisanie tylko po decyzji.

Scenariusze unit: `tests/player-detect.test.ts`, `tests/sources-identity.test.ts`, `tests/sources-preview-dedupe.test.ts`.

---

## Auth, onboarding, profil

- Public login: `/login` **Google-only**. Dev email: `/logintest` (noindex).
- Flow: `/login` → `/api/auth/google` → Google → `/auth/callback` → `/profile` albo `/onboarding`.
- `needsOnboarding` = nick + real name (**nie** wymaga N01 nicków).
- `needsDartRegistration` = identity **lub** brak `about_completed_at`. BET nie zwalnia z tego — nowy na Dart zawsze Krok 1 + Krok 2.
- Soft CTA About: brak city/brand/weight/hand/favorite.
- Gate ingest: 403 `needs_onboarding`.
- Login gate: flaga SQL `login_gate_enabled` + `LOGIN_GATE_PASSWORD`. Cookie ~30 dni. Szczegóły: [Login gate — instrukcja](#login-gate--instrukcja-onoff-hasło).
- Usuwanie meczu: triple-check, bez undo. Edycja: PATCH (swap/rename opponent) — **nie przepisuj legs/visits**.
- Karty meczu: Rzut / Share / Edytuj / Usuń + **tagi** (patrz niżej).
- **Nazwy na kartach:** `normalizeName` **nie** zamienia CAPS/pseudonimów na „Koklusz”. Zostawia `KOKLUSZ`, `Błaszczu`, `GROTKOWSKI Piotr`. Title-case tylko gdy słowo jest całe z małych liter.

Google + iPhone LAN: Site URL w Supabase na `http://<IP-Maca>:3000` na czas testu; `allowedDevOrigins` w `next.config.ts`.

---

## Login gate — instrukcja (on/off, hasło)

To jest **hasło na wejście do `/login`** (odblokowanie przycisku Google), **nie** hasło konta gracza.

Zescreenuj i trzymaj:

### 1) Włączyć / wyłączyć bramę (bez redeploy)

Supabase Dashboard → projekt **`nwrhnmnaiqclpxcjfgcq`** → **SQL Editor**:

```sql
-- WŁĄCZ (formularz hasła zamiast Google)
UPDATE public.app_settings
SET value = 'true', updated_at = now()
WHERE key = 'login_gate_enabled';

-- WYŁĄCZ (Google od razu)
UPDATE public.app_settings
SET value = 'false', updated_at = now()
WHERE key = 'login_gate_enabled';

-- Stan
SELECT key, value, updated_at FROM public.app_settings WHERE key = 'login_gate_enabled';
```

Albo Table Editor → `app_settings` → wiersz `login_gate_enabled` → `true` / `false`.

Fail-open: jak DB nie odpowie, brama jest **wyłączona**.

### 2) Ustawić / zmienić hasło odblokowania

Hasło **nie jest w bazie**. Jest w env Vercel:

1. Vercel → projekt DartStats → **Settings → Environment Variables**
2. `LOGIN_GATE_PASSWORD` = nowe hasło (Production + Preview)
3. **Redeploy** (zmiana env wymaga nowego deployu)
4. Lokalnie: `.env.local` ta sama zmienna (nie commituj)

Po zmianie hasła **stare cookie odblokowania pada** (podpis HMAC z hasłem) — user musi wpisać nowe.

### 3) Co widzi gość

| Stan | `/login` |
| --- | --- |
| Gate OFF | od razu Google |
| Gate ON, brak cookie | pole hasła + „Odblokuj logowanie” + tekst o `kontakt@sylveoncompany.pl` |
| Gate ON, złe hasło | błąd, nadal brama |
| Gate ON, dobre hasło | cookie `sdp_login_gate` ~**30 dni**, potem Google |
| Już zalogowany na **dart.** (sesja Supabase) | middleware z `/login` **od razu na `/profile`** — brama się nie pokaże |
| Brak hasła admina | **nie** dojdzie do Google; landing `/` i `/demo` działają |

---

## Dart vs BET — ten sam Supabase

Ten sam projekt **`nwrhnmnaiqclpxcjfgcq`**, te same `auth.users`.

| | Dart (`dart.sylveoncompany.pl`) | BET (`bet.sylveoncompany.pl`) |
| --- | --- | --- |
| Auth | Google (ten sam user id) | ten sam Google |
| Wiersz produktu | `public.customers` | `bet.profiles` **FK → `public.customers`** |
| Sesja cookie | host `dart.…` | host `bet.…` — **osobne** (logowanie na jednym nie loguje automatycznie na drugim) |
| Kod | to repo | inne repo; **nie ruszaj `bet.*`** |

Stan (2026-10-10): ~21 profili BET, wszystkie z `public.customers` + `auth_user_id`. **Konto BET ≠ ukończona rejestracja Darta.** Marker Darta: `about_completed_at`. Kto go nie ma, dostaje pełny onboarding Darta (Krok 1 nick + Krok 2 lotki/fav), nawet gdy BET już wstawił nick.

### A) Gracz BET, **nie** używał Darta

1. Dni później wchodzi na `dart.sylveoncompany.pl`. Cookie BET **nie** działa. Jest gościem.
2. **Bez hasła gate:** widzi landing/demo. `/login` = tylko formularz hasła. Google **schowany**. `/profile` → redirect na `/login`.
3. **Z hasłem gate:** odblokowuje → Google (to samo konto co na BET).
4. Callback: `ensureCustomerForUser` znajduje istniejący `public.customers` (BET go stworzył przy rejestracji). **Nie** tworzy drugiego konta.
5. `needsDartRegistration` (brak `about_completed_at` albo brak nicka Darta) → **zawsze `/onboarding` (Krok 1)**, potem Krok 2 O Tobie. Nick z BET nie omija formularza Darta. `bet.profiles` nietknięte.
6. Profil Dart pusty (0 meczów), dopóki nie zaimportuje. Mecze BET **nie** wpadają na Dart.

### B) Gracz BET, **już** ma konto Dart (nick uzupełniony)

1. Gate + Google (albo już sesja na dart).
2. Ten sam `customers` wiersz. Onboarding **pomijany** (jest nick + prawdziwe imię).
3. Jeśli `about_completed_at` puste → `/onboarding/about` raz.
4. Widzi swoje zaimportowane mecze Dart. BET bez zmian.

### C) Gracz **tylko Dart**, pierwszy raz na BET

1. Ma `public.customers`. **Nie** ma `bet.profiles`, dopóki BET sam go nie utworzy przy pierwszym logowaniu.
2. Google na `bet.` = ten sam `auth.users` id.
3. Co BET zrobi (nowy `bet.profiles` vs błąd) zależy od **kodu BET**, nie Darta. Dart nic nie tworzy w `bet.*`.
4. Po stronie Darta zero zmian.

### D) „Jestem zalogowany i wchodzę na Dart”

- Zalogowany **na dart.** w tej przeglądarce: tak — `/login` skacze na profil, gate niewidoczny.
- Zalogowany **tylko na bet.**: na darcie jesteś wylogowany. Trzeba Google jeszcze raz (Google często bez hasła, bo sesja Google żyje).
- Inna przeglądarka / incognito: zawsze od zera (+ gate jeśli ON).

---

## Tagi meczów i filtr profilu

**Po co:** user oznacza pojedyncze mecze (np. „Gliwice”, „liga”) i na statystykach zostawia albo wycina cały ten zbiór. To **nie** jest filtr po tytule turnieju — tag jest ręczny, per mecz.

### Kontrakt

| | |
| --- | --- |
| Kolumna | `public.matches.tags text[] NOT NULL DEFAULT '{}'` |
| Limit | max **8** tagów na mecz; nazwa **1–32** znaki po trim |
| Dedup | case-insensitive (`Gliwice` = `gliwice`) — zostaje pierwsze casing |
| Katalog | unikalne tagi **tylko z meczów tego profilu** (`uniqueCatalogTags(matches)`). Demo = snapshot. Żywy user = jego wiersze. **Tag klienta nigdy nie trafia na `/demo`.** |
| Import | `saveMatch` / overwrite **nie wysyła** `tags` — istniejące zostają |
| API | `PATCH /api/matches/:id` body `{ tags: string[] }` (bez `playerIndex` / `playerNames`) |
| Demo | pre-seed: **Mecz towarzyski** (demo003/007/010), **Liga** (demo002/006). Picker działa **w pamięci** (nie zapisuje). Droplisty include/exclude jak na żywym profilu. |

### UI

1. Na karcie meczu (pod wynikiem, poza przyciskiem expand): chipy + **Tag**.
2. Picker: lista już utworzonych (których ten mecz jeszcze nie ma) **albo** pole „Dodaj nowy”.
3. Przy zakresie dat dwa `<select>`:
   - **Uwzględnij tylko mecze z tagiem** — default „Wszystkie mecze”.
   - **Wyklucz mecze z tagiem** — default „Żadne”.
4. Oba naraz: najpierw include, potem exclude. Ten sam tag w obu → pusta lista (OK).
5. Brak tagu / „Wszystkie” + „Żadne” = pełny profil.

### Co liczy się od nowa po filtrze

`filterByRange` → `filterByTags` → te same funkcje co zawsze: KPI, wykres formy, top podejścia/checkouty, H2H, aktywność dni/godzin, histogram checkoutów, **lista meczów**, streak (gdy filtr/zakres ≠ all → etykieta „W zakresie”, nie Lifetime).

Kod: `lib/match-tags.ts`, `lib/demo-snapshot.ts` (`DEMO_MATCH_TAGS`), `app/profile/profile-match-tags.tsx`, `app/profile/profile-tag-filters.tsx`, `app/profile/profile-client.tsx`. Testy: `tests/match-tags.test.ts`.

### Demo vs żywy profil — różnice

| | Demo `/demo/profile` | Żywy `/profile` |
| --- | --- | --- |
| Dane | statyczny JSON + daty „teraz”; tagi z `DEMO_MATCH_TAGS` | Supabase user |
| Import | atrapa, CTA na `/login` | prawdziwy ingest |
| Edycja / usuwanie meczu | nie | tak |
| Tagi | widać + można kliknąć lokalnie (odświeżenie kasuje nowe) | `PATCH` do DB |
| Filtry dat + tagów | **tak, ten sam kod** | tak |
| Wyloguj / onboarding | nie | tak |
| Tytuły meczów | zawsze „Turniej Przykładowy” | prawdziwe |
| Share | `/demo/m/{token}` | `/m/{token}` |

---

## Mapa plików

```
AGENTS.md                          ← skrót dla agenta
README.md                          ← to, źródło prawdy
.env.example                       ← nasze + komentarz PRD

lib/sources/detect-url.ts          ← klasyfikacja URL
lib/sources/types.ts               ← PreviewGroup, MatchSource, mid/tmid
lib/sources/identity.ts            ← haystack / n01NameMatches / resolveCandidates
lib/sources/n01-competition.ts     ← turniej, liga, mid→tmid
lib/sources/prd.ts                 ← REST PRD → N01Match
lib/sources/prd-config.ts          ← env / builtin / discover SPA
lib/sources/preview.ts             ← expand + dedupe + alreadyInDb
lib/sources/commit.ts              ← zapis batch
lib/sources/ingest-auth.ts         ← auth helper ingest
lib/n01-parser.ts                  ← match_view + share token + save shape
lib/n01-url.ts                     ← stary whitelist pojedynczego URL
lib/matches.ts                     ← save/get/delete/update, source, tags
lib/match-tags.ts                  ← sanitize + include/exclude
lib/customer.ts                    ← onboarding + autoDetectPatterns
lib/auth.ts                        ← ensureCustomerForUser
lib/stats.ts                       ← KPI
lib/rate-limit.ts                  ← in-memory (akceptowany limit)
lib/supabase/admin.ts              ← service role
lib/supabase/server.ts             ← SSR cookies

app/api/ingest/route.ts            ← legacy single N01
app/api/ingest/preview/route.ts
app/api/ingest/preview/resolve/route.ts
app/api/ingest/commit/route.ts
app/api/profile/bootstrap/route.ts
app/profile/profile-add-match.tsx
app/profile/profile-client.tsx
app/profile/profile-match-tags.tsx
app/profile/profile-tag-filters.tsx
app/m/[shareToken]/                ← share view + access log
app/demo/                          ← public demo
supabase/migrations/

tests/sources-detect.test.ts
tests/sources-identity.test.ts
tests/sources-preview-dedupe.test.ts
tests/prd-parser.test.ts
tests/prd-config.test.ts
tests/n01-parser.test.ts
tests/match-tags.test.ts
tests/e2e/smoke.spec.ts            ← m.in. ingest 401
```

---

## Uruchomienie i testy

```bash
cp .env.example .env.local   # nasze klucze nwrhnmnaiqclpxcjfgcq
npm install
npm run dev                  # http://localhost:3000
npm test                     # Vitest
npm run typecheck
npm run lint
npm run test:e2e             # Playwright (build)
```

LAN / telefon:

```bash
npm run dev -- --hostname 0.0.0.0
# http://<LAN-IP>:3000/login
```

Bez współdzielonej Wi-Fi w cloud: Cloudflare quick tunnel (`trycloudflare.com`) na port 3000 — URL jednorazowy.

**Seed:** `npm run seed` (SEED_URLS, skip duplikatów). Demo: `npm run seed:demo`, `npm run snapshot:demo`.

**Vercel env:** URL + publishable + service_role + `SEED_CUSTOMER_ID` + `OWNER_EMAIL` + `NEXT_PUBLIC_SITE_URL`. `PRD_*` nie jest wymagane.

---

## Bezpieczeństwo

Szczegóły historyczne: `SECURITY_RELEASE.md` (v1.3). Aktualne zasady:

- RLS + service_role tylko na serwerze.
- Ingest whitelist hostów (N01 / PRD), nie dowolny SSRF.
- Share `/m/{token}` = 64-bit capability, nie enumeracja UUID.
- Rate limit logowania **in-memory** (akceptowane: nie broni przed volumetric DDoS; to nie dump DB).
- CSP ma `unsafe-inline` (akceptowane na teraz).
- Robots: noindex prywatne ścieżki.
- Login spam ≠ wyciek; publikowalny klucz PRD = to, co i tak jest w ich JS.

RODO / regulamin / cookies / DPA: backlog **1.0.1.6** (privacy page jest; reszta ⏳).

---

## Design

Paleta W2, inspiracja [sylveoncompany.pl](https://sylveoncompany.pl):

| Token | Kolor |
| --- | --- |
| `--background` | `#0a0f1e` |
| `--card` | `#141a2e` |
| `--accent-from` / `--accent-to` | `#5ea0ff` / `#8b6bff` |
| `--signal` | `#6be1ff` |

`.glass-tile`, `.bg-grid`, `.text-accent-gradient`. Font Inter.

---

## Konwencje

- README aktualizuj gdy zmieniasz kontrakt (schema, import, env, twarde zasady).
- Nie zakładamy — pytamy (identity, duplikaty, zakres backlogu).
- Copy UI: historyczna inwentaryzacja MSG była w README v1.4; **żywe teksty są w kodzie** (`lib/site-config.ts`, landing, `profile-add-match`). Copy PRD+N01 zaktualizowane w v3.
- Iteracyjnie; nie idź w 2.0.x bez akceptacji.

---

## Roadmapa skrócona

Zrobione (nie implementuj drugi raz): 0.x MVP, 1.0 release, auth 1.1, profil About, delete/edit meczu, 1.2 UX, 1.3 testy+perf, 1.4 polish, **v2.0-firstPROD**, **v2.0.1 login gate**, **v3.0.0 import N01/PRD + mid**, **v3.1.0 tagi + onboarding BET + fav**.

Otwarte (rosnąco po ID — **pytaj przed startem**):

| ID | Temat |
| --- | --- |
| 1.0.1.6 | regulamin, cookies, DPA (privacy ✅) |
| 1.0.2.x | copy UI po tekstach ownera |
| 1.1.8 | panel admina |
| 1.1.11 | usuwanie konta |
| 1.1.12 | punkty gracza |
| 1.3.3+ | Playwright w CI, backup DB |
| **2.0.x** | premium + PayNow/PayU — **⏸️** |
| 5.x | pełne wydanie, Apple login — ⏸️ |

---

## ADR

1. Next.js, nie TanStack Start.
2. Supabase, nie self-hosted Postgres na MVP.
3. Polska bramka płatności w przyszłości (PayNow/PayU) — nie teraz.
4. Parser: negative-score N01.
5. Share token deterministyczny z `(customerId, tmid)`.
6. Nazwy kolumn pełne (`customer_id`, `n01_tmid`).
7. Noindex profili i share.
8. Demo ≠ dane właściciela.
9. Vercel hosting.
10. Detekcja STRICT (nazwisko + nick).
11. Brak `display_name` w DB.
12. **v3:** additive `source`, reuse `n01_tmid`, nie tykać `bet.*`.
13. Tylko 501 w produkcie.
14. Tagi per mecz (`matches.tags`); filtr include/exclude; import nie nadpisuje tagów.

---

## Dziennik wersji

| Tag / backup | Co |
| --- | --- |
| `v1.0.0` / `backup/v1.0.0` | pierwszy milestone |
| `v1.1.0` / `backup/v1.1.1` | Google auth + tożsamość |
| `v1.2.0` | profil UX, delete, edit |
| `v1.3.2` / `backup/v1.3.0` | testy, perf bootstrap, rebrand |
| `v1.4.0` | favicon, landing, OAuth docs |
| `v2.0-firstPROD` | pierwszy prod |
| `v2.0.1` | login gate |
| **`v3.0.0` / `backup/v3.0.0`** | PRD + N01 competition + mid; `matches.source`; copy; rediscovery PRD |
| **`v3.1.0` / `backup/v3.1.0`** | **tagi, demo filtry, nicki CAPS, onboarding BET, fav Ratajski/Białecki** |

v3.1.0 (2026-10-10):

- Tagi per mecz + include/exclude na całym profilu. Migracja `matches.tags` na prod.
- Demo: te same droplisty, pre-seed „Mecz towarzyski” / „Liga”; tagi klienta **nie** wyciekają na demo.
- `normalizeName` zostawia CAPS/nicks (KOKLUSZ, Błaszczu).
- BET ≠ ukończony Dart: brak `about_completed_at` → pełny onboarding (Krok 1 + 2).
- Fav: Ratajski, Białecki, reszta; `<select>` jak marka/waga. „ulubieńcem”. Checkbox porównań: odpłatne wyłączenie wkrótce.
- Copy na bramie logowania (`kontakt@sylveoncompany.pl`). **Nie merguj na `main` bez polecenia.**

v3.0.0 (2026-10-10):

- Migracja `source` na `matches` i `ingest_snapshots` (prod zastosowana).
- Pipeline `lib/sources` + API preview/resolve/commit.
- PRD turnieje; rediscovery kluczy z ich SPA.
- N01 `mid` → `tmid` (`match/list`).
- Public copy/SEO wspomina N01 i PRD.
- Tagi per mecz i demo filtry weszły w **v3.1.0**.
- Nadal tylko 501; BET nietknięty.
