# Cursor_DartStats

**Dart Profile Tracker** — prywatny panel statystyk darta, budowany w Next.js 15.
Docelowo pod `dart.sylveoncompany.pl`.

> **Status:** v0.4 — README reorganizowane. Fazy 0-5 zdefiniowane. Czekam na start scaffoldingu.

---

## Spis treści

1. [Cel projektu](#cel-projektu)
2. [Założenia biznesowe](#założenia-biznesowe)
3. [Stack technologiczny](#stack-technologiczny)
4. [Schemat bazy danych](#schemat-bazy-danych)
5. [Parser N01 — kontrakt](#parser-n01--kontrakt)
6. [KPI — kontrakt](#kpi--kontrakt)
7. [Detekcja gracza](#detekcja-gracza)
8. [Design System — Sylveon Lift](#design-system--sylveon-lift)
9. [Konwencje pracy](#konwencje-pracy)
10. [Status / Roadmapa](#status--roadmapa)
11. [ADR — kluczowe decyzje](#adr--kluczowe-decyzje)
12. [Uruchomienie lokalne](#uruchomienie-lokalne)
13. [Dziennik zmian](#dziennik-zmian)

---

## Cel projektu

Kompletna historia zawodnika z lokalnych turniejów darta:
- Mecze pobierane z N01 i archiwizowane na stałe (JSON + HTML backup)
- Własny widok throw-by-throw, niezależny od n01darts.com
- Pełne statystyki, wykresy formy, analityka

Mobile-first, ciemny motyw, glassmorphism.

---

## Założenia biznesowe

- **MVP = single user** (Piotr „Groteł" Grotkowski). Bez logowania.
- **Multi-user-ready od dnia 0** — schemat DB z `customer_id` wszędzie.
- **Zero halucynacji** — brak pola w danych → ukrywam kafel, nie zmyślam.
- **Noindex** na profilach i share-linkach. Landing `/` — indeksowalny.
- **Docelowo freemium SaaS:**
  - Free: 3 mecze, podstawowe statystyki
  - Premium: pełne statystyki, bulk import, wykresy, eksport
  - Płatność: PayNow/PayU (polska bramka, PLN)
  - Role: user → premium → admin → superadmin
- **Hosting:** Vercel (free tier). DB: Supabase (free → Pro $25/mies.).

---

## Stack technologiczny

| Warstwa | Wybór |
|---|---|
| Framework | Next.js 15 (App Router) |
| Język | TypeScript (strict) |
| Styling | Tailwind v4 + shadcn/ui |
| Ikony | lucide-react |
| Wykresy | Recharts |
| DB + Storage + Auth | Supabase |
| Hosting | Vercel |
| Płatności (przyszłość) | PayNow (mBank) lub PayU |
| Package manager | pnpm |

---

## Schemat bazy danych

**Nowy schemat — czytelny, bez skrótów.**

```sql
-- Użytkownicy (MVP: 1 rekord, przyszłość: tysiące)
customers (
  customer_id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id    uuid REFERENCES auth.users,    -- NULL w MVP
  display_name    text NOT NULL,                 -- "Piotr „Groteł" Grotkowski"
  known_nicknames text[],                        -- ["Grotkowski", "Groteł"]
  role            text DEFAULT 'user',           -- 'user' | 'premium' | 'admin' | 'superadmin'
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
)

-- Mecze
matches (
  match_id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id     uuid REFERENCES customers,
  n01_tmid        text NOT NULL,                 -- identyfikator N01
  match_type      text NOT NULL,                 -- 'league' | 'tournament'
  title           text NOT NULL,
  opponent_name   text,                          -- znormalizowane nazwisko przeciwnika
  start_time      timestamptz NOT NULL,
  start_score     int DEFAULT 501,
  player_index    int,                           -- 0 lub 1 (który gracz to owner)
  player_legs_won int,
  opponent_legs_won int,
  player_average  numeric,
  player_first9   numeric,
  player_checkout_pct numeric,
  raw_payload     jsonb,                         -- cały JSON z N01 (źródło prawdy)
  snapshot_path   text NOT NULL,                 -- ścieżka w Storage
  html_snapshot_path text,
  share_token     text UNIQUE,                   -- 8 znaków, deterministyczny
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  UNIQUE(customer_id, n01_tmid)
)

-- Legi
legs (
  leg_id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id        uuid REFERENCES matches ON DELETE CASCADE,
  leg_number      int NOT NULL,                  -- 1, 2, 3...
  winner_index    int,                           -- 0 lub 1
  first_player    int,
  player_darts    int,
  opponent_darts  int,
  player_average  numeric,
  opponent_average numeric,
  UNIQUE(match_id, leg_number)
)

-- Wizyty (throw-by-throw)
visits (
  visit_id        bigserial PRIMARY KEY,
  leg_id          uuid REFERENCES legs ON DELETE CASCADE,
  player_index    int NOT NULL,                  -- 0 lub 1
  visit_number    int NOT NULL,                  -- 0 = setup, potem 1, 2, 3...
  raw_score       int NOT NULL,                  -- pole z N01 (może być ujemne)
  left_after      int NOT NULL,
  actual_score    int NOT NULL,                  -- po dekodowaniu negative-score
  darts_thrown    int NOT NULL,                  -- 1/2/3
  is_checkout     boolean DEFAULT false,
  is_bust         boolean DEFAULT false,
  is_setup        boolean DEFAULT false,
  UNIQUE(leg_id, player_index, visit_number)
)

-- Share linki
share_links (
  share_token     text PRIMARY KEY,              -- 8 znaków base36
  match_id        uuid REFERENCES matches ON DELETE CASCADE,
  created_at      timestamptz DEFAULT now(),
  revoked_at      timestamptz                    -- NULL = aktywny
)

-- Snapshoty (backup raw danych)
ingest_snapshots (
  snapshot_id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id        uuid REFERENCES matches ON DELETE SET NULL,
  customer_id     uuid REFERENCES customers,
  n01_tmid        text NOT NULL,
  payload_hash    text NOT NULL,
  snapshot_path   text NOT NULL,
  html_snapshot_path text,
  ingested_at     timestamptz DEFAULT now()
)

-- Audit log (dostęp do snapshotów)
snapshot_access_log (
  log_id          bigserial PRIMARY KEY,
  share_token     text NOT NULL,
  access_kind     text NOT NULL,                 -- 'json' | 'html'
  match_id        uuid,
  accessed_at     timestamptz DEFAULT now(),
  user_agent      text,
  ip_address      text
)
```

**Indeksy:**
- `matches(customer_id, start_time DESC)`
- `visits(leg_id, player_index, visit_number)`

**RLS:** deny-by-default. Dostęp tylko przez service_role w API Routes.

---

## Parser N01 — kontrakt

**Endpoint (zweryfikowany w Lovable):**
```
POST https://tk2-228-23746.vs.sakura.ne.jp/n01/tournament/n01_user_t.php?cmd=match_view
Body: { tmid: "..." }
```

Zwraca JSON: `statsData`, `legData`, `title`, `startTime`, `startScore`.

**Negative-score encoding** (w `legData.playerData[leg][visit]`):

| `score` | `left` | Znaczenie | `actual_score` | `darts_thrown` |
|---|---|---|---|---|
| 0 | 501 | Setup (pomijany) | 0 | 0 |
| ≥ 0 | > 0 | Normalna wizyta | = `score` | 3 |
| = 0 | > 0 | Miss/bust bez punktów | 0 | 3 |
| **< 0** | **= 0** | **CHECKOUT:** `|score|` = liczba lotek | = poprzedni `left` | `|score|` |
| < 0 | > 0 | Bust (przekroczenie) | 0 | `|score|` |

---

## KPI — kontrakt

Statystyki per-mecz i agregat gracza:

| KPI | Definicja |
|---|---|
| Legs | Wygrane legi |
| 3-Dart Average | `(total_score / total_darts) × 3` |
| First 9 | Średnia 3-dart z pierwszych 3 wizyt każdego lega |
| 60+ / 80+ / … / 180 | Exclusive: 60+=[60,79], 80+=[80,99]… |
| High Finish | Najwyższy checkout (wygrany leg) |
| 100+ Finishes | Liczba checkoutów ≥ 100 |
| Best Leg | Najkrótszy wygrany leg (lotki) |
| Worst Leg | Najdłuższy wygrany leg (lotki) |
| Checkout % | `wygrane_legi / próby` (approx: wizyty z `left ≤ 170`) |

Zweryfikowane 1:1 z `testdane.xlsx` w Lovable.

---

## Detekcja gracza

**STRICT MODE:**

1. **Auto-detect:** tylko `"Grotkowski"` lub `"Groteł"` (case-insensitive) w polu `name` z N01.
2. **Wszystko inne → pytaj użytkownika:**
   - Modal: „Kim jesteś w tym meczu?" + lista graczy (0/1) + opcja **ODRZUĆ**
   - Jeśli ODRZUĆ → mecz nie jest zapisywany, nie jest dodawany do profilu
3. **Zero false-positive** — nie wolno dodać meczu „na wszelki wypadek".

**Bug z Lovable:** Stary kod wykrywał "Piotr" → zbyt szeroki zakres (wielu Piotrów).

---

## Design System — Sylveon Lift

Paleta W2 (ciemny motyw), inspiracja: [sylveoncompany.pl](https://sylveoncompany.pl)

| Token | Kolor | Zastosowanie |
|---|---|---|
| `--background` | `#0a0f1e` | tło strony |
| `--card` | `#141a2e` | kafle (glass tile) |
| `--accent-from` | `#5ea0ff` | primary, gradient start |
| `--accent-to` | `#8b6bff` | gradient end |
| `--signal` | `#6be1ff` | highlight 180, high finish |
| `--border` | biały 14% | granice kafli |
| Font | **Inter** | całość |

Efekty: `.glass-tile` (blur + saturate), `.bg-grid`, `.text-accent-gradient`.

---

## Konwencje pracy

- **Kod EN, UI PL.** Funkcje po angielsku, teksty użytkownika po polsku.
- **README = źródło prawdy.** Aktualizacja po każdej zmianie.
- **Nie zakładamy — pytamy.** Zero halucynacji.
- **Iteracyjnie.** Po każdym etapie: Co zrobiłem / Co dalej / Ryzyka / Pytania.
- **Nie idziemy dalej bez akceptacji.**

---

## Status / Roadmapa

### Faza 0 — Bootstrap + MVP core (Lovable Fazy 0-4 + test-fetch)

**Z Lovable (zrobione tam, do odtworzenia tutaj):**

- [x] **0.1** Bucket `dart-snapshots` (private, RLS) _(Lovable Faza 0)_
- [x] **0.2** Shell UI PL, routing, wybór palety _(Lovable Faza 0)_
- [x] **0.3** Ingest N01 + parser (endpoint, negative-score) _(Lovable Faza 1.1-1.2)_
- [x] **0.4** Typy TS: `N01Match`, `N01Leg`, `N01Visit` _(Lovable Faza 1.2)_
- [x] **0.5** Detekcja gracza — **stary sposób buggy** (Piotr/Grotkowski/Groteł) _(Lovable Faza 1.3)_
- [x] **0.6** Silnik statystyk: `computeMatchStats`, `computePlayerStats` _(Lovable Faza 1.4)_
- [x] **0.7** Widok `/profile` — kafle stats, lista meczów, filtr zakresu _(Lovable Faza 1.5-1.6)_
- [x] **0.8** Widok `/m/[shareId]` — throw-by-throw _(Lovable Faza 1.6)_
- [x] **0.9** Seed 3 mecze testowe _(Lovable Faza 1.7-1.8)_
- [x] **0.10** Schemat DB (migracje Postgres, RLS deny-by-default) _(Lovable Faza 2.2)_
- [x] **0.11** Persystencja: `saveMatch`, `getMyMatches`, `getMatchByShareId` _(Lovable Faza 2.3)_
- [x] **0.12** Wykres formy (Recharts: 3-dart avg + First 9) _(Lovable Faza 2.4)_
- [x] **0.13** Ostatnie 5 meczów (kafel W/L) _(Lovable Faza 2.5)_
- [x] **0.14** Top 10 najczęstszych podejść _(Lovable Faza 2.6)_
- [x] **0.15** Top 10 najczęstszych zamknięć _(Lovable Faza 5.1)_
- [x] **0.16** Formularz „Dodaj mecz" + walidacja tmid _(Lovable Faza 3.1-3.3)_
- [x] **0.17** Obsługa duplikatów (Nadpisz / Pomiń) _(Lovable Faza 3.2)_
- [x] **0.18** Import hurtowy (textarea, sekwencyjny) _(Lovable Faza 5.2)_
- [x] **0.19** Signed URL do snapshotów (TTL 5 min) _(Lovable Faza 4.1)_
- [x] **0.20** Przycisk „Udostępnij mecz" _(Lovable Faza 4.2)_
- [x] **0.21** Audit-log dostępu _(Lovable Faza 4.3)_
- [x] **0.22** Fix-pack: forma avg, 140+ violet, filtry zakresu (30/90/180/365/all) _(Lovable Faza 4.5)_

**Nowe (do zrobienia w Next.js):**

- [ ] **0.23** Scaffold Next.js 15 + TypeScript + Tailwind v4 + shadcn/ui + pnpm
- [ ] **0.24** Design tokens Sylveon Lift + `.glass-tile` + fonty Inter
- [ ] **0.25** Supabase: projekt (user zakłada) + bucket + migracje (nowy schemat)
- [ ] **0.26** **Test-fetch endpointu N01** (zweryfikować czy działa)
- [ ] **0.27** Landing `/` (Target icon, gradient CTA)
- [ ] **0.28** Przepisanie logiki z Lovable → Next.js (parser, stats, routes)
- [ ] **0.29** Seed 3 mecze (URL z Lovable)
- [ ] **0.30** Deployment na Vercel (GitHub auto-deploy)

---

### Faza 1 — Fixy UI + UX (5.8-5.14)

- [ ] **1.1** Fix: Detekcja gracza STRICT (Grotkowski/Groteł + pytaj) _(5.x implicit)_
- [ ] **1.2** Fix 5.2.1: Bulk import — przy „Nadpisz wszystkie" nie pytaj ponownie o każdy duplikat
- [ ] **1.3** Fix 5.8: Paginacja meczów (profil: 3 najnowsze + button „Więcej" → lista 10/strona, rozwijalne)
- [ ] **1.4** Fix 5.9: Wynik meczu — nazwisko gracza (ja) podświetlone zielono/czerwono (W/L), wynik meczu na środku
- [ ] **1.5** Fix 5.10.1: „Best leg (r)" → „Best leg (lotka)" (bez skrótu `(r)`)
- [ ] **1.6** Fix 5.10.2: Throw-by-throw zwycięzca — „Grotkowski · 44 r" → „Grotkowski · 44 lotki"
- [ ] **1.7** Fix 5.10.3: Statystyki zawodnika — „40 m." → „40 meczów" (bez skrótu)
- [ ] **1.8** Fix 5.10.4: Top 10 sekcje — usunąć „10" po prawej na wysokości nagłówka
- [ ] **1.9** Fix 5.10.5: „Dodaj nowy mecz" — usunąć „01" po prawej na wysokości nagłówka
- [ ] **1.10** Fix 5.10.6: „Ostatnie mecze" — usunąć liczbę po prawej na wysokości nagłówka
- [ ] **1.11** Fix 5.11: Weryfikacja Top 10 zamknięć — sprawdzić czy dobrze liczone (31 wygranych legów, tylko 14 w top10?)
- [ ] **1.12** Fix 5.12: Import hurtowy → przenieść do sekcji „Dodaj nowy mecz"
- [ ] **1.13** Fix 5.13: „Dodaj nowy mecz" → rozwijane (jak import hurtowy był), przenieść na górę profilu (nad statystyki, zwinięte)
- [ ] **1.14** Fix 5.14: Unifikacja nazwisk — normalizacja do `"Nazwisko Imię"` (pierwsze litery wielkie), pseudonimy OK as-is

---

### Faza 2 — Zaawansowana analityka (5.3-5.6, Lovable niezrobione)

- [ ] **2.1** Średnia krocząca (rolling 5-mecz) + trend (linear regression)
- [ ] **2.2** Heatmapa dni tygodnia / godzin (kiedy grasz najlepiej)
- [ ] **2.3** Head-to-head — split statystyk vs konkretny przeciwnik
- [ ] **2.4** Rozkład finishingów (histogram: na jakich `left` najczęściej zamykasz)
- [ ] **2.5** ~~Export CSV/XLSX~~ → **CANCELLED** (5.7 — dane już w bazie, niepotrzebne)

---

### Faza 3 — Auth + Multi-user

- [ ] **3.1** Supabase Auth (Google login)
- [ ] **3.2** Sync `auth.uid()` → `customer_id` (tabela `customers`)
- [ ] **3.3** Onboarding: „Który zawodnik to Ty?" przy pierwszym ingest
- [ ] **3.4** Usunięcie stałej `OWNER_ID`
- [ ] **3.5** Landing z CTA „Zaloguj się / Zarejestruj"

---

### Faza 4 — Premium + Płatności

- [ ] **4.1** Model freemium (free: 3 mecze, basic stats; premium: pełne)
- [ ] **4.2** Bramka płatności (PayNow lub PayU)
- [ ] **4.3** Role: user / premium / admin / superadmin
- [ ] **4.4** Panel admina

---

### Faza 5 — Testy + Hardening

- [ ] **5.1** Vitest (parser + stats golden samples)
- [ ] **5.2** Playwright (happy-path: ingest → profil → share)
- [ ] **5.3** CI na PR (`typecheck && test`)

---

## ADR — kluczowe decyzje

1. **Next.js zamiast TanStack Start** — stabilniejszy, łatwiejszy deploy.
2. **Supabase zamiast self-hosted** — free tier na MVP, Pro przy wzroście.
3. **Polska bramka (PayNow/PayU)** — lokalny rynek, PLN.
4. **Parser: negative-score encoding** — N01 koduje ujemny `score` jako liczbę lotek.
5. **Share-link: deterministyczny token** — 8 znaków base36, krótki, bezpieczny.
6. **Schemat DB bez skrótów** — `customer_id`, `match_id`, `n01_tmid` (czytelność).
7. **Noindex na profilach/share** — prywatne dane, bez Google.
8. **Vercel jako hosting** — zero config, free tier, custom domain.
9. **Detekcja gracza STRICT** — tylko Grotkowski/Groteł auto, reszta → pytaj lub odrzuć.

---

## Uruchomienie lokalne

_Po scaffoldingu (Faza 0.23):_

```bash
pnpm install
pnpm dev
```

Podgląd: `http://localhost:3000/`

---

## Dziennik zmian

| Wersja | Data | Co zrobiono |
|---|---|---|
| v0.4 | 2026-07-11 | README reorganizowane: Fazy 0-5, nowy schemat DB (bez `c_id`), fixy 5.8-5.14, strict player detection, fix 5.2.1, 5.7 cancelled. |
| v0.3 | 2026-07-11 | Analiza repo Lovable (`dart-stats-hub`): parser, stats, routes, migracje SQL. |
| v0.2 | 2026-07-11 | Zrzuty + README Lovable → nowy README. Stack, roadmapa, design, ADR. |
| v0.1 | 2026-07-11 | Nowe repo na GitHub. |

---

## Seed URLs (testy)

Z kodu Lovable, zweryfikowane:

- `https://n01darts.com/n01/league/n01_view.html?tmid=t_84WD_6808_rr_1_ODeb_WvbB`
- `https://n01darts.com/n01/tournament/n01_view.html?tmid=t_AWMW_0234_t_2_ASmj_P4P5`
- `https://n01darts.com/n01/league/n01_view.html?tmid=t_84WD_6808_rr_1_6zyK_WvbB`

---

## Źródła

- **Stary projekt:** https://github.com/grotkowski9/dart-stats-hub
- **Inspiracja designu:** https://sylveoncompany.pl
- **System meczów:** https://n01darts.com
