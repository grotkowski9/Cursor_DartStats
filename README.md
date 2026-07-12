# Cursor_DartStats

**Dart Profile Tracker** — prywatny panel statystyk darta, budowany w Next.js 16.
Docelowo pod `dart.sylveoncompany.pl`.

> **Status:** v4.0.2 — **Demo + landing polish (Sylveon vibe, OG)**. **Następna: 4.1** Auth.

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
13. [Stan na koniec czatu + handoff](#stan-na-koniec-czatu--handoff)
14. [Dziennik zmian](#dziennik-zmian)

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
| Framework | Next.js 16 (App Router) |
| Język | TypeScript (strict) |
| Styling | Tailwind v4 + shadcn/ui |
| Ikony | lucide-react |
| Wykresy | Recharts |
| DB + Storage + Auth | Supabase |
| Hosting | Vercel |
| Płatności (przyszłość) | PayNow (mBank) lub PayU |
| Package manager | npm |

---

## Schemat bazy danych

**Nowy schemat — czytelny, bez skrótów.**

```sql
-- Użytkownicy (MVP: 1 rekord, przyszłość: tysiące)
customers (
  customer_id     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id    uuid REFERENCES auth.users,    -- NULL w MVP
  first_name      text NOT NULL,                 -- imię: "Piotr"
  last_name       text NOT NULL,                 -- nazwisko: "Grotkowski"
  nickname        text,                          -- pseudonim: "Groteł" (opcjonalny)
  display_name    text GENERATED ALWAYS AS (      -- tylko do wyświetlania
    CASE WHEN nickname IS NOT NULL AND btrim(nickname) <> ''
      THEN first_name || ' „' || nickname || '" ' || last_name
      ELSE first_name || ' ' || last_name
    END
  ) STORED,
  known_nicknames text[],                        -- ["Grotkowski", "Groteł"] — auto-detect N01
  role            text DEFAULT 'user',           -- 'user' | 'premium' | 'admin' | 'superadmin'
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
)
```

**Wyświetlanie:** UI bierze `first_name`, `last_name`, `nickname` z DB. Kolumna `display_name` jest GENERATED (nie edytować ręcznie).
Helper TS: `formatCustomerDisplayName()` w `lib/customer.ts`.

**Detekcja N01:** wzorce z `known_nicknames` rekordu customer (nie hardcoded).

```sql
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

**STRICT MODE** (wzorce z `known_nicknames` customer: `Grotkowski`, `Groteł`, `Grotel`):

1. **Auto-detect (`auto`):** dokładnie **jeden** gracz pasuje do wzorca → zapis bez pytania.
2. **Ambiguous (`ambiguous`):** **obaj** pasują (np. `Groteł` vs `Piotr Grotkowski`) → modal wyboru.
3. **None (`none`):** **nikt** nie pasuje (np. cudzy mecz, podobne nazwisko typu Grotowski) → **potwierdzenie + wybór** (plan: 4.3.4).
4. **ODRZUĆ** → mecz nie jest zapisywany.

**Zasada:** nigdy nie zakładaj — podobne nazwiska (Grotowski, Grodkowski) **nie** matchują `Grotkowski` (substring strict). Testy poniżej.

**Bug z Lovable:** Stary kod wykrywał `"Piotr"` → zbyt szeroki zakres (wielu Piotrów). Naprawione.

### Scenariusze testowe (stan v1.0 — `detectPlayerIndex`)

| Mecz (gracz 0 vs gracz 1) | Wynik | Co widzi user przy imporcie |
|---|---|---|
| Jarek Marciniak vs Mariusz Pudzianowski | `none` | Krok 1 (4.3.4): „Zawodnicy inni niż Ty — dodać mimo to?" **NIE** / **TAK**. Po TAK → „Kim jesteś?" gracz 1 / gracz 2 / odrzuć |
| Piotr Grotkowski vs Piotr Michałowicz | `auto` → gracz 0 | Zapis **automatyczny** (tylko Grotkowski pasuje, „Piotr" samo w sobie nie liczy się) |
| Groteł vs Piotr Grotkowski | `ambiguous` | Modal wyboru — **obaj to Ty**, trzeba wskazać który slot N01 |
| Piotr Grotkowski vs Groteł | `ambiguous` | j.w. |
| GROTKOWSKI Piotr vs Jan Kowalski | `auto` → gracz 0 | Zapis automatyczny |
| Marciniak Jarek vs Grotkowski Piotr | `auto` → gracz 1 | Zapis automatyczny |
| P. Grotkowski vs Wiśniewski Sławomir | `auto` → gracz 0 | Zapis automatyczny (inicjał + nazwisko) |
| Groteł vs Kowalski Jan | `auto` → gracz 0 | Zapis automatyczny |
| Piotr Grotkowski (Katowice) vs Małkowski Adrian | `auto` → gracz 0 | Zapis automatyczny (miasto w nawiasie nie blokuje) |
| **Grotowski Piotr** vs Kowalski Jan | `none` | ⚠️ Podobne nazwisko — **nie** auto. Flow 4.3.4 (potwierdzenie + wybór) |
| **Grodkowski Piotr** vs Kowalski Jan | `none` | j.w. — Grodkowski ≠ Grotkowski |
| Grotowski vs **Grotkowski Piotr** | `auto` → gracz 1 | Tylko Grotkowski pasuje; Grotowski traktowany jako obcy |
| Grodkowski vs **Grotkowski Piotr** | `auto` → gracz 1 | j.w. |
| Piotr **Grotowski** vs Piotr **Grotkowski** | `auto` → gracz 1 | Tylko drugi pasuje — brak false-positive na podobnym nazwisku |
| Grotowski Piotr vs Grodkowski Adrian | `none` | Obaj obcy → flow 4.3.4 |
| Marciniak Jarek vs **Grotowski** Piotr | `none` | Flow 4.3.4 |
| Marciniak Jarek vs **Grodkowski** Piotr | `none` | Flow 4.3.4 |

**Bulk import:** przy `none` / `ambiguous` bez wcześniejszego wyboru → wiersz `wymaga wyboru gracza` (nie zapisuje).

**Plan Faza 4.3.4 (`none`):** nie blokuj — **pytaj** w 2 krokach: (1) „Czy na pewno dodać?" NIE/TAK → (2) „Kim jesteś?" gracz 1 / gracz 2 / odrzuć. Przy `ambiguous` — podświetlić obie opcje jako „Ty".

---

## Duplikaty spotkań

**Definicja duplikatu:** ten sam `n01_tmid` już istnieje w profilu (`customer_id` + `n01_tmid` UNIQUE). Backend zwraca `{ status: "duplicate", shareToken }` — **nie nadpisuje** bez Twojej decyzji.

### Scenariusze (stan v1.0)

| Sytuacja | Import pojedynczy (teraz) | Import hurtowy (teraz) | Plan 4.3.6 / 4.3.7 |
|---|---|---|---|
| Link już w profilu | Panel: „Ten mecz jest już w bazie" → **Nadpisz** / **Zobacz istniejący** / **Anuluj** | Modal: **Nadpisz** / **Nadpisz wszystkie** / **Pomiń** / **Pomiń wszystkie** | Jaśniejsze pytanie + kontekst meczu (tytuł, data, przeciwnik) |
| Klik **Nadpisz** | Ponowny fetch z N01 + `overwrite: true` → świeże dane i stats | j.w. dla bieżącego URL | Bez zmian logicznych |
| Klik **Anuluj** / **Pomiń** | Mecz **nie** trafia ponownie do profilu | Wiersz `pominięto` | Etykieta **Pomiń** zamiast Anuluj |
| **Pomiń wszystkie duplikaty** | — | `skip-all` — kolejne duplikaty w tej sesji bulk **bez pytania** | Przemianować przycisk na **„Pomiń wszystkie duplikaty"** (jasne znaczenie) |
| **Nadpisz wszystkie** | — | `overwrite-all` — kolejne duplikaty w bulk **auto-nadpisuj** | Etykieta bez zmian; opcjonalnie potwierdzenie „Na pewno nadpisać wszystkie?" |
| Duplikat + `none` (obcy gracze) | Najpierw duplikat **albo** identity — kolejność API | Bulk: duplikat obsłużony modal; identity → `wymaga wyboru gracza` | 4.3.5: modal identity też w bulk |

**Zasada (jak 4.3.4):** duplikat = **pytaj**, nie zakładaj. Nigdy ciche nadpisanie.

**Plan 4.3.6 (pojedynczy import):**
1. „Ten mecz jest już w Twoim profilu." + podgląd (tytuł turnieju, data, przeciwnik, link)
2. **Nadpisz** (pobierz ponownie z N01) / **Zobacz istniejący** / **Pomiń**

**Plan 4.3.7 (bulk):**
- Przy duplikacie: ten sam modal co wyżej + **Pomiń wszystkie duplikaty** / **Nadpisz wszystkie duplikaty**
- `skip-all` dotyczy **tylko duplikatów** w bieżącym bulk (nie pomija błędów ani nowych meczów)

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

- [x] **0.23** Scaffold Next.js 16 + TypeScript + Tailwind v4 + npm
- [x] **0.24** Design tokens Sylveon Lift + `.glass-tile` + font Inter
- [x] **0.25** Supabase: projekt (user zakłada) + bucket + migracje (nowy schemat)
- [x] **0.26** **Test-fetch endpointu N01** — ✅ działa, JSON OK
- [x] **0.27** Landing `/` (Target icon, gradient CTA)
- [x] **0.28** Przepisanie logiki z Lovable → Next.js (parser, stats, API ingest/matches) — **backend OK, UI minimalne**
- [x] **0.29** Seed 3 mecze — skrypt `npm run seed` (SEED_URLS z README)
- [x] **0.30** Vercel-ready — `vercel.json` + instrukcja deploy w README (ręczne podłączenie repo)

**UI do odtworzenia w Next.js (było w Lovable, tu jeszcze brak):**

- [x] **0.31** `/profile` — pełny MVP: kafle statystyk, filtr zakresu, ostatnie 5, top 10
- [x] **0.32** `/profile` — karty meczów z KPI (jak na zrzutach)
- [x] **0.33** `/m/[shareToken]` — throw-by-throw + details + score card
- [x] **0.34** Import hurtowy + formularz „Dodaj mecz" (rozwijany, na górze)

---

### Faza 1 — Fixy UI + UX (5.8-5.14)

- [x] **1.1** Fix: Detekcja gracza STRICT (Grotkowski/Groteł + pytaj / odrzuć) — **backend OK**
- [x] **1.2** Fix 5.2.1: Bulk import — `useRef` dla dupPolicy, „Nadpisz wszystkie" działa bez ponownych pytań
- [x] **1.3** Fix 5.8: Paginacja meczów (profil: 3 najnowsze + button „Więcej" → lista 10/strona, rozwijalne karty)
- [x] **1.4** Fix 5.9: Wynik meczu — moje nazwisko zielone/czerwone (W/L), wynik `3:1` na środku między nazwiskami
- [x] **1.5** Fix 5.10.1: `(lotka)` usunięte z etykiet Best/Worst leg
- [x] **1.6** Fix 5.10.2: Throw-by-throw — „44 lotek" (pełna odmiana polska przez `dartWord()`)
- [x] **1.7** Fix 5.10.3: Odmiana liczebnikowa mecz/meczów w kaflu statystyk
- [x] **1.8** Fix 5.10.4 / 5.10.5: Top 10 bez licznika, formularz bez „01"
- [x] **1.9** Fix dat/godzin: błąd `getTime()` w `rowsToN01Match` → milisekundy zamiast sekund → **naprawione**, re-import 51 meczów z N01
- [x] **1.10** Fix 5.12 / 5.13: Import hurtowy w sekcji „Dodaj nowy mecz", rozwijany
- [x] **1.11** Fix 5.14: Normalizacja nazwisk przez `normalizeName()` — ALL_CAPS/lowercase → Title Case; pseudonimy bez zmian
- [x] **1.12** Checkout ratio `42% (3/7)` inline wszędzie (kafel, karta meczu, szczegóły)
- [x] **1.13** Osobny kafel Win rate legów z win% pod `59–93`; "Throw-by-throw" → "Rzut po rzucie"
- [x] **1.14** Backup DB do repo (`.dev/backup-2026-07-11.json`, 51 meczów)
- [x] **1.15** Fix 5.11: Weryfikacja Top 10 zamknięć — logika poprawna (`isCheckout = score < 0 && left === 0`; liczymy tylko wygrane legi)
- [x] **1.16** Wykres formy — `ProfileFormChart` (Recharts): 3-dart avg + First 9, kolorowe kropki W/L, linia referencyjna avg

---

### Faza 2 — Zaawansowana analityka ✅

- [x] **2.1** Wykres formy z avg kroczącą — `ProfileFormChart` + `computeFormSeries` (Recharts, 3-dart avg + First 9)
- [x] **2.2** Heatmapa aktywności — `ProfileActivity` + `computeDayStats`: słupki per dzień tygodnia, avg
- [x] **2.3** Head-to-head — `ProfileHeadToHead`: dropdown przeciwnika, W/L, avg, legi, checkout, 100+/140+/180
- [x] **2.4** Histogram zamknięć — `ProfileCheckoutDistribution` + `computeCheckoutDistribution`: rozkład skuteczności per zakres (`2–20` … `141–170`)
- [x] **2.5** ~~Export CSV/XLSX~~ → **CANCELLED**
- [x] **Normalizacja nazw + miasta**: `normalizeName()` z blacklistą polskich miast; `myDisplayName` z customer DB propagowane do kart meczów

---

### Faza 3 — Fix & Small features pack ✅ ZAMKNIĘTA

> **Stan:** wszystkie zadania obowiązkowe done. **3.14–3.17** zawieszone (opcjonalne). **3.18** odłożone → **6.8** (perf).

**Fix-pack UI + statystyki** ✅

- [x] **3.1** Gradient pasków w Top 10 i Histogram zamknięć — taki sam jak w Aktywność-dni
- [x] **3.2** Ostatnie mecze: średnia przeciwnika pod nazwiskiem (przed rozwinięciem)
- [x] **3.3** Ostatnie mecze: biały font KPI (avg, checkout…); kolory tylko na bucketach score
- [x] **3.4** Nazwy: usuwanie miast — rozszerzona blacklista PL (60+ miast), lepsze czyszczenie
- [x] **3.5** Nazwy: unifikacja wielkości liter (`Małkowski Adrian` zamiast `MAŁKOWSKI Adrian`), title-case per słowo
- [x] **3.6** Wykres formy: widoczna etykieta avg w legendzie pod wykresem („Śr. ogólna")
- [x] **3.7** **Audyt średnich** — wykres = kafel (średnia ważona lotkami, nie średnia arytmetyczna z meczów) — **KRYTYCZNE**
- [x] **3.8** Aktywność — godziny (`computeHourStats`, `ProfileActivityHours`, grid dynamiczny, pomija puste zakresy)
- [x] **3.9** Tekst formularza importu: „Wklej link do swojego meczu z n01 — pobiorę dane, zrobię wyliczenia i uaktualnię Twój profil gracza."

**Spójność statystyk w UI** ✅

- [x] **3.10** Head-to-head: kolor **100+** (spójnie z 140+ violet i 180 signal)
- [x] **3.11** Head-to-head: **statystyki przeciwnika** obok moich — widok „Ja vs On" (avg, First 9, checkout, 100+/140+/180), grid porównawczy
- [x] **3.12** Widok meczu Details: kolory **100+/140+/180** (jak w rozwiniętej karcie profilu)
- [x] **3.13** `ProfileStatsBlock` labels & layout: `3-DART AVG`, `FIRST 9 AVG`, `LEGS WIN RATE` (procent main, W/L sub), `Matches` pill (mobile), `100+ Finish`, checkout ratio format, compact bottom row
- [x] **3.19** Wykres formy: tooltip po indeksie meczu (fix duplikatów dat), pełna data+godzina, przeciwnik, W/L
- [x] **3.20** Aktywność dni/godziny — układ poziomy (jak histogram zamknięć), fix mobile
- [x] **3.21** Kolory bucketów w kartach meczów + Details: 100+/120+ (accent), 140+/170+ (violet), 180 (signal)
- [x] **3.22** `BEST LEG AVG` — kafel w statystykach głównych (max avg z wygranych legów, liczone live)

**Odłożone / zawieszone**

- [ ] **3.18** → przeniesione do **6.8** (batch loading z paginacją — fix limit 1000 Supabase)
- [ ] **3.14** ⏸️ Porównanie sesji / turniejów — filtr po nazwie rozgrywek
- [ ] **3.15** ⏸️ Grupowanie meczów po `title` / turnieju z N01
- [ ] **3.16** ⏸️ Widok trendów per turniej: avg, win rate, liczba meczów
- [ ] **3.17** ⏸️ Opcjonalny filtr „sezon" (rok / półrocze)

---

### Release v4.0.1 — Demo publiczne + SEO ✅ DONE (+ landing 4.5)

> **Cel:** Prawdziwe profile/mecze = **noindex** (prywatne). Osobna **zanonimizowana wersja demo** = **index** (marketing dla nowych graczy przed rejestracją).
>
> **Postać demo (wstępnie):** **Antoni „Robot" Kowalski** — persona w jednym pliku konfiguracyjnym, żeby później szybko podmienić osobę w demo bez grzebania w danych meczów.

**Stan v1.0 (już jest):**
- `/profile` → `robots: noindex, nofollow` ✅
- `/m/[shareToken]` → `robots: noindex, nofollow` ✅
- `/` (landing) → indexowalny (brak noindex) ✅

- [x] **4.0.1.1** **Audit noindex** — `/profile`, `/m/*`, `/api/*` + `middleware.ts` (`X-Robots-Tag`)
- [x] **4.0.1.2** **`robots.txt`** — `app/robots.ts`
- [x] **4.0.1.3** **`sitemap.xml`** — `app/sitemap.ts` (publiczne URL)
- [x] **4.0.1.4** **Dataset demo** — `npm run build:demo` → `demo/demo-matches.json` (10 meczów, bez PII)
- [x] **4.0.1.5** **`/demo/profile`** — Antoni „Robot" Kowalski, pełna analityka
- [x] **4.0.1.6** **`/demo/m/[token]`** — demo001…demo010, rzut po rzucie
- [x] **4.0.1.7** **Reuse UI** — `demoMode`, `matchPathPrefix`, bez Supabase na demo
- [x] **4.0.1.8** **Landing `/`** — CTA demo + Sylveon cross-link (SEO obu domen)
- [x] **4.0.1.9** **SEO pack** — OG image (`app/opengraph-image.tsx`), JSON-LD, canonical
- [ ] **4.0.1.10** **Weryfikacja prod** — Search Console po deploy (6.5)

**Podmiana postaci demo:** edytuj `demo/demo-persona.ts` → opcjonalnie `npm run build:demo` → commit JSON.

**Po v4.0.1:** **4.1** (Auth) — landing **4.5** już działa (`/login` placeholder).

---

### Kolejność prac po v1.0.0

Realizuj **po kolei**: **v4.0.1** (demo + SEO) → cała **Faza 4** → **5** → **6**.

| # | Release / Faza | Zadanie | Opis |
|---|---|---|---|
| 1 | 4.0.1 | **4.0.1.1** | Audit noindex — checklist route'ów prywatnych |
| 2 | 4.0.1 | **4.0.1.2** | `robots.txt` |
| 3 | 4.0.1 | **4.0.1.3** | `sitemap.xml` (tylko publiczne) |
| 4 | 4.0.1 | **4.0.1.4** | Anonimizacja → `demo/demo-persona.ts` + `demo/demo-matches.json` (10 meczów) |
| 5 | 4.0.1 | **4.0.1.5** | `/demo/profile` — Antoni „Robot" Kowalski, 10 spotkań |
| 6 | 4.0.1 | **4.0.1.6** | `/demo/m/[token]` — wszystkie 10 meczów, rzut po rzucie |
| 7 | 4.0.1 | **4.0.1.7** | Reuse UI (`demoMode`, bez Supabase) |
| 8 | 4.0.1 | **4.0.1.8** | Landing CTA → demo |
| 9 | 4.0.1 | **4.0.1.9** | SEO meta + OG |
| 10 | 4.0.1 | **4.0.1.10** | Weryfikacja noindex / brak wycieku PII |
| 11 | 4 | **4.1** | Supabase Auth (Google login) |
| 12 | 4 | **4.2** | Sync `auth.uid()` → `customer_id` |
| 13 | 4 | **4.3** | Onboarding + detekcja gracza (4.3.1–4.3.7) |
| 14 | 4 | **4.4** | Usunięcie stałej `DEFAULT_CUSTOMER_ID` |
| 15 | 4 | **4.5** | Landing z CTA „Zaloguj się / Zarejestruj" |
| 16 | 4 | **4.6** | Middleware — ochrona `/profile`, API tylko dla zalogowanego |
| 17 | 4 | **4.7** | RLS per user (zamiast deny-all + service_role) |
| 18 | 4 | **4.8** | **Usuwanie meczu** przez usera (triple-check, wpisz „usuwam") |
| 19 | 4 | **4.9** | **Panel admina superadmin** (Ty) — userzy, mecze, audit, backup |
| 20 | 5 | **5.1** | Model freemium (free: 3 mecze; premium: pełne) |
| 21 | 5 | **5.2** | Bramka płatności (PayNow lub PayU) |
| 22 | 5 | **5.3** | Role: user / premium / admin / superadmin |
| 23 | 5 | **5.4** | Panel admina — subskrypcje premium (biznes) |
| 24 | 5 | **5.5** | Limity w UI (blokada importu / wykresów dla free) |
| 25 | 6 | **6.1** | Vitest — golden samples parsera N01 |
| 26 | 6 | **6.2** | Vitest — golden samples stats |
| 27 | 6 | **6.3** | Playwright (ingest → profil → share → mecz) |
| 28 | 6 | **6.4** | CI na PR (`typecheck && test`) |
| 29 | 6 | **6.5** | Deploy produkcyjny Vercel + env |
| 30 | 6 | **6.6** | Custom domain `dart.sylveoncompany.pl` |
| 31 | 6 | **6.7** | Backup DB — procedura + harmonogram |
| 32 | 6 | **6.8** | Perf: batch loading z paginacją (fix 1000-row limit) |

*Opcjonalnie później (poza główną kolejnością):* 3.14–3.17 analityka turniejowa.

---

### Faza 4 — Auth + Multi-user + Admin ⏳ (po v4.0.1)

- [ ] **4.1** Supabase Auth (Google login)
- [ ] **4.2** Sync `auth.uid()` → `customer_id` (tabela `customers`)
- [ ] **4.3** Onboarding + detekcja gracza przy imporcie
  - [ ] **4.3.1** Ekran onboarding po pierwszym logowaniu: ustaw `known_nicknames` (Grotkowski, Groteł, Grotel + edycja)
  - [ ] **4.3.2** Testy scenariuszy auto-detect (tabela w README → Vitest w 6.2)
  - [ ] **4.3.3** UI `ambiguous`: obaj gracze oznaczeni jako „Ty" — wybór slotu N01 (Groteł vs Grotkowski)
  - [ ] **4.3.4** UI `none` — **nie blokuj, pytaj** (2 kroki):
    1. „Wygląda na to, że zawodnicy są inni niż Ty. Czy na pewno chcesz dodać ten mecz do profilu?" → **NIE** / **TAK**
    2. Po **TAK** → „Kim jesteś?" → wybierz **gracz 1** / **gracz 2** / **odrzuć mecz**
    - Dotyczy m.in. Marciniak vs Pudzianowski, Grotowski, Grodkowski (podobne nazwiska ≠ auto-match)
  - [ ] **4.3.5** Bulk import: przy `none`/`ambiguous` → wstrzymaj i pokaż modal (nie tylko „wymaga wyboru gracza" w tabeli)
  - [ ] **4.3.6** Duplikat — import pojedynczy: pytaj z kontekstem meczu → **Nadpisz** / **Zobacz istniejący** / **Pomiń** (nie ciche nadpisanie)
  - [ ] **4.3.7** Duplikat — bulk: modal + **Pomiń wszystkie duplikaty** / **Nadpisz wszystkie duplikaty** (tylko duplikaty w sesji, reszta URL-i normalnie)
- [ ] **4.4** Usunięcie stałej `DEFAULT_CUSTOMER_ID` / `OWNER_ID`
- [x] **4.5** Landing z CTA „Zaloguj się / Zarejestruj" — `/` + `/login` (Auth w 4.1)
- [ ] **4.6** Middleware — ochrona `/profile`, API tylko dla zalogowanego usera
- [ ] **4.7** RLS per user (zamiast deny-all + service_role everywhere)
- [ ] **4.8** **Usuwanie meczu przez usera** z profilu
  - [ ] **4.8.1** Przycisk „Usuń mecz" na karcie meczu (rozwiniętej) i/lub widoku `/m/[shareToken]`
  - [ ] **4.8.2** Triple-check: (1) „Czy na pewno?" → (2) podsumowanie meczu → (3) wpisz **`usuwam`** aby potwierdzić
  - [ ] **4.8.3** API `DELETE /api/matches/[id]` — cascade legs + visits + share_links; tylko własne mecze (RLS)
  - [ ] **4.8.4** Odświeżenie profilu + undo toast opcjonalnie (30 s) — nice-to-have
- [ ] **4.9** **Panel admina superadmin** (`/admin`, rola `superadmin` — **Ty**)
  - [ ] **4.9.1** Lista userów (customers): email, rola, liczba meczów, data rejestracji
  - [ ] **4.9.2** Podgląd / usuwanie meczów dowolnego usera (audit log)
  - [ ] **4.9.3** Ręczny backup DB (export JSON jak `.dev/backup-*`)
  - [ ] **4.9.4** Podgląd ingest log / snapshot access log
  - [ ] **4.9.5** Ochrona route — tylko `role = superadmin` (Twój account)

> **Uwaga:** Panel **5.4** to później warstwa **biznesowa** (subskrypcje premium). Panel **4.9** to **Twój** panel operacyjny jako właściciel aplikacji.

---

### Faza 5 — Premium + Płatności ⏳

- [ ] **5.1** Model freemium (free: 3 mecze, basic stats; premium: pełne)
- [ ] **5.2** Bramka płatności (PayNow lub PayU)
- [ ] **5.3** Role: user / premium / admin / superadmin
- [ ] **5.4** Panel admina — **subskrypcje i płatności premium** (nie mylić z 4.9 superadmin)
- [ ] **5.5** Limity w UI (blokada importu / wykresów dla free tier)

---

### Faza 6 — Testy + Hardening + Deploy ⏳

- [ ] **6.1** Vitest — golden samples parsera N01
- [ ] **6.2** Vitest — golden samples stats (`computeMatchStats`, `normalizeName`, avg ważona)
- [ ] **6.3** Playwright (happy-path: ingest → profil → share → mecz)
- [ ] **6.4** CI na PR (`typecheck && test`)
- [ ] **6.5** Deploy produkcyjny Vercel + env
- [ ] **6.6** Custom domain `dart.sylveoncompany.pl`
- [ ] **6.7** Backup DB — procedura + harmonogram
- [ ] **6.8** Perf: batch loading z paginacją Supabase (fix limit 1000 wierszy; zastępuje cofnięte 3.18)

---

## ADR — kluczowe decyzje

1. **Next.js zamiast TanStack Start** — stabilniejszy, łatwiejszy deploy.
2. **Supabase zamiast self-hosted** — free tier na MVP, Pro przy wzroście.
3. **Polska bramka (PayNow/PayU)** — lokalny rynek, PLN.
4. **Parser: negative-score encoding** — N01 koduje ujemny `score` jako liczbę lotek.
5. **Share-link: deterministyczny token** — 8 znaków base36, krótki, bezpieczny.
6. **Schemat DB bez skrótów** — `customer_id`, `match_id`, `n01_tmid` (czytelność).
7. **Noindex na profilach/share** — prywatne dane, bez Google (`/profile`, `/m/*`).
8. **Demo publiczne pod `/demo/*`** — zanonimizowany dataset statyczny (JSON) + `demo/demo-persona.ts` (postać: Antoni „Robot" Kowalski, łatwa podmiana); indexowalny; **nigdy** dane usera z DB (plan: **v4.0.1**).
9. **Vercel jako hosting** — zero config, free tier, custom domain.
10. **Detekcja gracza STRICT** — wzorce z `known_nicknames` customer, reszta → pytaj lub odrzuć.
11. **Customer name split** — `first_name`, `last_name`, `nickname` w DB; `display_name` GENERATED.

---

## Uruchomienie lokalne

```bash
cd ~/Cursor_DartStats
cp .env.example .env.local   # uzupełnij klucze Supabase
npm install
npm run dev
```

### Podgląd na telefonie (ta sama Wi-Fi)

```bash
npm run dev -- --hostname 0.0.0.0
ipconfig getifaddr en0   # np. 192.168.100.11
```

Na telefonie: `http://192.168.100.11:3000/profile` (nie `localhost` — to na telefonie wskazuje na sam telefon).

`next.config.ts` ma `allowedDevOrigins` pod IP Maca — po zmianie sieci zaktualizuj IP i zrestartuj serwer.

**Uwaga:** pierwsze ładowanie meczów trwa ~12 s (51 meczów). Poczekaj — spinner „Ładuję mecze…" zniknie dopiero po pobraniu danych.

W `.env.local` potrzebne:

- `NEXT_PUBLIC_SUPABASE_URL` — URL projektu Supabase
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — klucz publishable (`sb_publishable_…`)
- `SUPABASE_SERVICE_ROLE_KEY` — klucz secret (`sb_secret_…`, tylko serwer)
- `DEFAULT_CUSTOMER_ID` — UUID seed customer (MVP: `a0000000-0000-4000-8000-000000000001`)

**Nigdy nie commituj `.env.local`.**

Podgląd w przeglądarce:

- **Strona główna:** http://localhost:3000/
- **Profil (import + lista meczów):** http://localhost:3000/profile
- **Mecz (placeholder):** http://localhost:3000/m/{shareToken}

Zatrzymanie serwera: `Ctrl + C` w terminalu.

### Migracja customer name fields (jednorazowo)

Jeśli baza ma jeszcze starą kolumnę `display_name` (tekstowa), zastosuj:

```bash
# Supabase Dashboard → SQL Editor → wklej zawartość:
# supabase/migrations/20260711190000_customer_name_fields.sql
```

### Seed 3 meczów testowych

Po migracji i `.env.local`:

```bash
npm run seed
```

Skrypt importuje SEED_URLS z README (pomija duplikaty).

### Import meczów z Lovable (CSV export)

Eksport z Supabase Lovable (`matches` table) → CSV z kolumnami `tmid`, `ttype`, `me_index`.
Skrypt pobiera pełne dane z N01 (legi + wizyty), pomija duplikaty po `n01_tmid`:

```bash
npx tsx scripts/import-csv-matches.ts ~/Downloads/matches-export-*.csv
```

Stan: **51 meczów** zaimportowanych (2026-07-11).

### Deploy na Vercel

1. https://vercel.com → **Add New Project** → import `grotkowski9/Cursor_DartStats`
2. Framework: Next.js (auto-detect)
3. **Environment Variables** (Production + Preview):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `DEFAULT_CUSTOMER_ID`
   - `NEXT_PUBLIC_SITE_URL` — `https://dart.sylveoncompany.pl` lub `https://darts.pl` (canonical)
4. Deploy. Custom domain: `dart.sylveoncompany.pl` / `darts.pl` — ten sam build, inny env.

---

## Stan na koniec czatu + handoff

### v4.0.1 — Demo + SEO ✅ | Faza 4.1 ⏳ NASTĘPNA

| Element | Status |
|---|---|
| **v4.0.1** | ✅ Demo publiczne, landing, SEO, Sylveon cross-link |
| **v1.0.0** | ✅ Profil prywatny, 51 meczów w DB |
| Fazy 0–3 | ✅ **ZAMKNIĘTE** |
| **Faza 4** | ⏳ **4.1 Auth** następne (4.5 landing done) |
| Faza 5 | ⏳ Premium + Płatności (po Fazie 4) |
| Faza 6 | ⏳ Testy + Deploy (po Fazie 5) |
| Backup | `.dev/backup-2026-07-12-v1.0.json` (51 meczów + snapshot KPI) |

### Najważniejsze zmiany v4.0.1

| Zmiana | Impact |
|---|---|
| **`/demo/profile`** | 10 meczów, Antoni „Robot" Kowalski, indexowalny |
| **`/demo/m/demo001…010`** | Rzut po rzucie, indexowalny |
| **Landing `/` + `/login`** | CTA demo + auth placeholder (4.5) |
| **SEO** | robots.txt, sitemap, canonical, link do sylveoncompany.pl |
| **`demo/demo-persona.ts`** | Szybka podmiana postaci demo |
| **`npm run build:demo`** | Regeneracja JSON z DB (anonimizacja) |

### Co dalej — pełna lista (po kolei)

**Faza 4 (teraz):** 4.1 → 4.2 → 4.3 → 4.4 → ~~4.5~~ → 4.6 → 4.7 → 4.8 → 4.9  
**Faza 5 (potem):** 5.1 → 5.2 → 5.3 → 5.4 → 5.5  
**Faza 6 (na końcu):** 6.1 → 6.2 → 6.3 → 6.4 → 6.5 → 6.6 → 6.7 → 6.8

### Pełna mapa faz

| Faza | Nazwa | Zrobione / razem | Status |
|---|---|---|---|
| 0 | Bootstrap + MVP | 34 / 34 | ✅ ZAMKNIĘTA |
| 1 | Fixy UI/UX | 16 / 16 | ✅ ZAMKNIĘTA |
| 2 | Analityka rdzeniowa | 5 / 5 | ✅ ZAMKNIĘTA |
| 3 | Fix & Small features | 19 / 19* | ✅ ZAMKNIĘTA |
| **4.0.1** | **Demo publiczne + SEO** | **9 / 10** | ✅ (4.0.1.10 po deploy) |
| **4** | **Auth + Admin + UX** | **1 / 9** (+ subtaski) | ⏳ **4.1 następne** |
| 5 | Premium + Płatności | 0 / 5 | ⏳ |
| 6 | Testy + Deploy + Perf | 0 / 8 | ⏳ |
| | **Razem do zrobienia** | **22** | (+ 4.0.1.10 po deploy) |

### Pliki kluczowe (v4.0.1)

```
demo/demo-persona.ts                          ← postać demo (podmiana osoby)
demo/demo-matches.json                        ← 10 meczów zanonimizowanych
scripts/build-demo-dataset.ts                 ← npm run build:demo
lib/demo.ts / lib/site-config.ts              ← loader demo + URL SEO
app/page.tsx                                  ← landing 4.5 + Sylveon SEO
app/login/page.tsx                            ← placeholder auth
app/demo/profile/page.tsx                     ← profil publiczny index
app/demo/m/[shareToken]/page.tsx              ← mecze demo index
app/robots.ts / app/sitemap.ts                ← SEO
middleware.ts                                 ← X-Robots-Tag na /profile, /m, /api
components/demo-banner.tsx / sylveon-footer.tsx
```

### Pliki kluczowe (v1.0.0 — profil prywatny)

```
.dev/backup-2026-07-12-v1.0.json            ← backup DB milestone (51 meczów + KPI snapshot)
lib/matches.ts                              ← getMyMatches N+1 (batch loading cofnięty)
lib/stats.ts                                ← bestLegAvg, computeHourStats, normalizeName
app/profile/profile-form-chart.tsx          ← tooltip po indeksie, oppName, W/L
app/profile/profile-activity.tsx            ← poziome słupki (dni tygodnia)
app/profile/profile-activity-hours.tsx      ← poziome słupki (godziny)
app/profile/profile-match-card.tsx          ← kolory 100+/120+/140+/170+/180
app/profile/profile-stats-block.tsx         ← BEST LEG AVG, 3-DART AVG, LEGS WIN RATE
app/m/[shareToken]/match-view.tsx           ← kolory 120+/170+ w Details
```

### Prompt na nowy czat

```
Projekt: Dart Profile Tracker (Cursor_DartStats)
README = źródło prawdy — sekcja „Stan na koniec czatu + handoff".

Stan v4.0.1 — demo + landing DONE. NASTĘPNA: 4.1 Auth (Google).
Landing/login działają; /profile nadal prywatny (noindex).
Podmiana demo: demo/demo-persona.ts + opcjonalnie npm run build:demo.
```

### Podgląd na telefonie (dev)

```bash
npm run dev -- --hostname 0.0.0.0
# Telefon: http://192.168.100.11:3000/profile
# allowedDevOrigins w next.config.ts — zaktualizuj IP jeśli sieć się zmieni
```

---

## Dziennik zmian

| Wersja | Data | Co zrobiono |
|---|---|---|
| **v4.0.2** | 2026-07-12 | Landing Sylveon vibe (numerowane sekcje 01–06, tagline), OG image dynamiczne, JSON-LD, dartboard-ring CSS. |
| **v4.0.1** | 2026-07-12 | **Demo publiczne + SEO + landing 4.5.** `/demo/profile` (Antoni Robot Kowalski, 10 meczów), `/demo/m/demo001–010`, robots/sitemap, middleware noindex, Sylveon cross-link, `/login` placeholder. `npm run build:demo`. |
| **v1.0.0** | 2026-07-12 | **Milestone release** — Fazy 0–3 DONE. BEST LEG AVG, wykres formy tooltip, aktywność pozioma, kolory bucketów. Batch loading cofnięty (bug). Backup `.dev/backup-2026-07-12-v1.0.json`. |
| v0.13 | 2026-07-12 | Batch loading (cofnięty), BEST LEG AVG, wykres formy tooltip, aktywność pozioma, kolory 120+/170+ w kartach, Matches pill fix desktop. |
| v0.12 | 2026-07-12 | Faza 3.1–3.13 done: gradient pasków, średnie ważone (wykres=kafel), nazwy (blacklista 60 miast, title-case), H2H Ja vs On, aktywność-godziny, spójność UI (100+/140+/180 kolory), ProfileStatsBlock labels (3-DART AVG, LEGS WIN RATE, compact layout). Zadania 3.14–3.17 zawieszone. README v0.12, package 0.12.0. |
| v0.11-plan | 2026-07-12 | Reorganizacja roadmapy: Faza 3 = Fix & Small features pack (3.1–3.16). Auth→Faza 4, Premium→Faza 5, Testy→Faza 6. |
| v0.11 | 2026-07-12 | Faza 2 done: heatmapa aktywności per dzień tygodnia (ProfileActivity + computeDayStats), histogram zamknięć (ProfileCheckoutDistribution + computeCheckoutDistribution, 8 zakresów). README v0.11. |
| v0.10 | 2026-07-12 | Faza 1 done + Faza 2.1/2.3: wykres formy (Recharts), head-to-head stats, normalizeName z miastami, customer name propagation, 1.15 checkout verified. |
| v0.9 | 2026-07-11 | Faza 1 batch 1: fix dat (ms/s), re-import 51 meczów z N01, normalizeName, paginacja 3+10/str, Win rate legów, moje imię zielone/czerwone, checkout inline, Rzut po rzucie, backup DB, bulk overwrite-all fix. |
| v0.8 | 2026-07-11 | MVP UI: profil (statystyki, top 10, karty, bulk), mecz throw-by-throw. Import 51 meczów z CSV Lovable. |
| v0.6 | 2026-07-11 | Supabase + backend (parser, stats, API, import). Profil/mecz UI = placeholder. |
| v0.5 | 2026-07-11 | Scaffold Next.js 16: landing, profil placeholder, design Sylveon Lift, build OK. |
| v0.4 | 2026-07-11 | README reorganizowane: Fazy 0-5, nowy schemat DB, fixy 5.8-5.14. |
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
