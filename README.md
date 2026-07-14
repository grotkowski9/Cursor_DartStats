# Cursor_DartStats

**Dart Profile Tracker** — prywatny panel statystyk darta, budowany w Next.js 16.
Docelowo pod `dart.sylveoncompany.pl`.

> **Status:** **v1.0.0 WYDANY** (`backup/v1.0.0` na GitHub). **Następne:** **1.0.1.1** — audit noindex prod.

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
11. [Audyt bezpieczeństwa i prywatności (RODO)](#audyt-bezpieczeństwa-i-prywatności-rodo)
12. [Hosting i skalowanie](#hosting-i-skalowanie)
13. [ADR — kluczowe decyzje](#adr--kluczowe-decyzje)
14. [Uruchomienie lokalne](#uruchomienie-lokalne)
15. [Stan na koniec czatu + handoff](#stan-na-koniec-czatu--handoff)
16. [Dziennik zmian](#dziennik-zmian)

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
- **Docelowo freemium SaaS** (limity jako **konfiguracja**, nie na sztywno w kodzie — patrz **1.2.1**):
  - Free: domyślnie N meczów (start: 3), **wybrane** statystyki widoczne
  - Premium: pełny limit meczów, **wszystkie** wykresy i sekcje
  - Płatność: PayNow/PayU (polska bramka, PLN) — dopiero po audycie **1.0.1.x**
  - Role: user → premium → admin → superadmin
- **Hosting:** rekomendacja **Vercel + Supabase** (patrz [Hosting i skalowanie](#hosting-i-skalowanie)); Mikrus możliwy, ale więcej roboty ops.

---

## Stack technologiczny


| Warstwa                | Wybór                   |
| ---------------------- | ----------------------- |
| Framework              | Next.js 16 (App Router) |
| Język                  | TypeScript (strict)     |
| Styling                | Tailwind v4 + shadcn/ui |
| Ikony                  | lucide-react            |
| Wykresy                | Recharts                |
| DB + Storage + Auth    | Supabase                |
| Hosting                | Vercel                  |
| Płatności (przyszłość) | PayNow (mBank) lub PayU |
| Package manager        | npm                     |


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


| `score` | `left`  | Znaczenie             | `actual_score` | `darts_thrown`   |
| ------- | ------- | --------------------- | -------------- | ---------------- |
| 0       | 501     | Setup (pomijany)      | 0              | 0                |
| ≥ 0     | > 0     | Normalna wizyta       | = `score`      | 3                |
| = 0     | > 0     | Miss/bust bez punktów | 0              | 3                |
| **< 0** | **= 0** | **CHECKOUT:** `       | score          | ` = liczba lotek |
| < 0     | > 0     | Bust (przekroczenie)  | 0              | `                |


---

## KPI — kontrakt

Statystyki per-mecz i agregat gracza:


| KPI                 | Definicja                                              |
| ------------------- | ------------------------------------------------------ |
| Legs                | Wygrane legi                                           |
| 3-Dart Average      | `(total_score / total_darts) × 3`                      |
| First 9             | Średnia 3-dart z pierwszych 3 wizyt każdego lega       |
| 60+ / 80+ / … / 180 | Exclusive: 60+=[60,79], 80+=[80,99]…                   |
| High Finish         | Najwyższy checkout (wygrany leg)                       |
| 100+ Finishes       | Liczba checkoutów ≥ 100                                |
| Best Leg            | Najkrótszy wygrany leg (lotki)                         |
| Worst Leg           | Najdłuższy wygrany leg (lotki)                         |
| Checkout %          | `wygrane_legi / próby` (approx: wizyty z `left ≤ 170`) |


Zweryfikowane 1:1 z `testdane.xlsx` w Lovable.

---

## Detekcja gracza

**STRICT MODE** (wzorce z `known_nicknames` customer: `Grotkowski`, `Groteł`, `Grotel`):

1. **Auto-detect (**`auto`**):** dokładnie **jeden** gracz pasuje do wzorca → zapis bez pytania.
2. **Ambiguous (**`ambiguous`**):** **obaj** pasują (np. `Groteł` vs `Piotr Grotkowski`) → modal wyboru.
3. **None (**`none`**):** **nikt** nie pasuje (np. cudzy mecz, podobne nazwisko typu Grotowski) → **potwierdzenie + wybór** (plan: **1.1.3.4**).
4. **ODRZUĆ** → mecz nie jest zapisywany.

**Zasada:** nigdy nie zakładaj — podobne nazwiska (Grotowski, Grodkowski) **nie** matchują `Grotkowski` (substring strict). Testy poniżej.

**Bug z Lovable:** Stary kod wykrywał `"Piotr"` → zbyt szeroki zakres (wielu Piotrów). Naprawione.

### Scenariusze testowe (stan v1.0 — `detectPlayerIndex`)


| Mecz (gracz 0 vs gracz 1)                       | Wynik            | Co widzi user przy imporcie                                                                                                         |
| ----------------------------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Jarek Marciniak vs Mariusz Pudzianowski         | `none`           | Krok 1 (**1.1.3.4**): „Zawodnicy inni niż Ty — dodać mimo to?" **NIE** / **TAK**. Po TAK → „Kim jesteś?" gracz 1 / gracz 2 / odrzuć |
| Piotr Grotkowski vs Piotr Michałowicz           | `auto` → gracz 0 | Zapis **automatyczny** (tylko Grotkowski pasuje, „Piotr" samo w sobie nie liczy się)                                                |
| Groteł vs Piotr Grotkowski                      | `ambiguous`      | Modal wyboru — **obaj to Ty**, trzeba wskazać który slot N01                                                                        |
| Piotr Grotkowski vs Groteł                      | `ambiguous`      | j.w.                                                                                                                                |
| GROTKOWSKI Piotr vs Jan Kowalski                | `auto` → gracz 0 | Zapis automatyczny                                                                                                                  |
| Marciniak Jarek vs Grotkowski Piotr             | `auto` → gracz 1 | Zapis automatyczny                                                                                                                  |
| P. Grotkowski vs Wiśniewski Sławomir            | `auto` → gracz 0 | Zapis automatyczny (inicjał + nazwisko)                                                                                             |
| Groteł vs Kowalski Jan                          | `auto` → gracz 0 | Zapis automatyczny                                                                                                                  |
| Piotr Grotkowski (Katowice) vs Małkowski Adrian | `auto` → gracz 0 | Zapis automatyczny (miasto w nawiasie nie blokuje)                                                                                  |
| **Grotowski Piotr** vs Kowalski Jan             | `none`           | ⚠️ Podobne nazwisko — **nie** auto. Flow **1.1.3.4** (potwierdzenie + wybór)                                                        |
| **Grodkowski Piotr** vs Kowalski Jan            | `none`           | j.w. — Grodkowski ≠ Grotkowski                                                                                                      |
| Grotowski vs **Grotkowski Piotr**               | `auto` → gracz 1 | Tylko Grotkowski pasuje; Grotowski traktowany jako obcy                                                                             |
| Grodkowski vs **Grotkowski Piotr**              | `auto` → gracz 1 | j.w.                                                                                                                                |
| Piotr **Grotowski** vs Piotr **Grotkowski**     | `auto` → gracz 1 | Tylko drugi pasuje — brak false-positive na podobnym nazwisku                                                                       |
| Grotowski Piotr vs Grodkowski Adrian            | `none`           | Obaj obcy → flow **1.1.3.4**                                                                                                        |
| Marciniak Jarek vs **Grotowski** Piotr          | `none`           | Flow **1.1.3.4**                                                                                                                    |
| Marciniak Jarek vs **Grodkowski** Piotr         | `none`           | Flow **1.1.3.4**                                                                                                                    |


**Bulk import:** przy `none` / `ambiguous` bez wcześniejszego wyboru → wiersz `wymaga wyboru gracza` (nie zapisuje).

**Plan Faza 4.3.4 (**`none`**):** nie blokuj — **pytaj** w 2 krokach: (1) „Czy na pewno dodać?" NIE/TAK → (2) „Kim jesteś?" gracz 1 / gracz 2 / odrzuć. Przy `ambiguous` — podświetlić obie opcje jako „Ty".

---

## Duplikaty spotkań

**Definicja duplikatu:** ten sam `n01_tmid` już istnieje w profilu (`customer_id` + `n01_tmid` UNIQUE). Backend zwraca `{ status: "duplicate", shareToken }` — **nie nadpisuje** bez Twojej decyzji.

### Scenariusze (stan v1.0)


| Sytuacja                        | Import pojedynczy (teraz)                                                             | Import hurtowy (teraz)                                                       | Plan **1.1.3.6** / **1.1.3.7**                                               |
| ------------------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Link już w profilu              | Panel: „Ten mecz jest już w bazie" → **Nadpisz** / **Zobacz istniejący** / **Anuluj** | Modal: **Nadpisz** / **Nadpisz wszystkie** / **Pomiń** / **Pomiń wszystkie** | Jaśniejsze pytanie + kontekst meczu (tytuł, data, przeciwnik)                |
| Klik **Nadpisz**                | Ponowny fetch z N01 + `overwrite: true` → świeże dane i stats                         | j.w. dla bieżącego URL                                                       | Bez zmian logicznych                                                         |
| Klik **Anuluj** / **Pomiń**     | Mecz **nie** trafia ponownie do profilu                                               | Wiersz `pominięto`                                                           | Etykieta **Pomiń** zamiast Anuluj                                            |
| **Pomiń wszystkie duplikaty**   | —                                                                                     | `skip-all` — kolejne duplikaty w tej sesji bulk **bez pytania**              | Przemianować przycisk na **„Pomiń wszystkie duplikaty"** (jasne znaczenie)   |
| **Nadpisz wszystkie**           | —                                                                                     | `overwrite-all` — kolejne duplikaty w bulk **auto-nadpisuj**                 | Etykieta bez zmian; opcjonalnie potwierdzenie „Na pewno nadpisać wszystkie?" |
| Duplikat + `none` (obcy gracze) | Najpierw duplikat **albo** identity — kolejność API                                   | Bulk: duplikat obsłużony modal; identity → `wymaga wyboru gracza`            | **1.1.3.5**: modal identity też w bulk                                       |


**Zasada (jak 1.1.3.4):** duplikat = **pytaj**, nie zakładaj. Nigdy ciche nadpisanie.

**Plan 1.1.3.6 (pojedynczy import):**

1. „Ten mecz jest już w Twoim profilu." + podgląd (tytuł turnieju, data, przeciwnik, link)
2. **Nadpisz** (pobierz ponownie z N01) / **Zobacz istniejący** / **Pomiń**

**Plan 1.1.3.7 (bulk):**

- Przy duplikacie: ten sam modal co wyżej + **Pomiń wszystkie duplikaty** / **Nadpisz wszystkie duplikaty**
- `skip-all` dotyczy **tylko duplikatów** w bieżącym bulk (nie pomija błędów ani nowych meczów)

---

## Design System — Sylveon Lift

Paleta W2 (ciemny motyw), inspiracja: [sylveoncompany.pl](https://sylveoncompany.pl)


| Token           | Kolor     | Zastosowanie               |
| --------------- | --------- | -------------------------- |
| `--background`  | `#0a0f1e` | tło strony                 |
| `--card`        | `#141a2e` | kafle (glass tile)         |
| `--accent-from` | `#5ea0ff` | primary, gradient start    |
| `--accent-to`   | `#8b6bff` | gradient end               |
| `--signal`      | `#6be1ff` | highlight 180, high finish |
| `--border`      | biały 14% | granice kafli              |
| Font            | **Inter** | całość                     |


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

### Konwencja numeracji


| Prefiks     | Znaczenie                               | Status                                 |
| ----------- | --------------------------------------- | -------------------------------------- |
| **0.x.x**   | Prace historyczne (bootstrap → demo)    | ✅ zamknięte w **1.0.0**                |
| **1.0.0**   | Release milestone — backup na GitHub    | ✅ `backup/v1.0.0`, tag `v1.0.0-backup` |
| **1.0.1.x** | Po release: prod, audyt, deploy | ⏳ **teraz** |
| **1.0.2.x** | Copy / teksty UI (plan) | ⏳ po 1.0.1 |
| **1.1.x**   | Auth + multi-user + admin               | ⏳ po 1.0.1                             |
| **1.2.x**   | Premium + płatności                     | ⏳                                      |
| **1.3.x**   | Testy + hardening + perf                | ⏳                                      |


Subtaski: czwarty poziom, np. **1.1.2.4** = onboarding, flow `none`.

**Kolejność:** `1.0.1` → `1.1` → `1.2` → `1.3` (po kolei, bez skakania).

---

### 1.0.0 — Release ✅ WYDANY (2026-07-14)

Pełny stan projektu zamrożony poza `main`:

- Branch: `[backup/v1.0.0](https://github.com/grotkowski9/Cursor_DartStats/tree/backup/v1.0.0)`
- Tag: `v1.0.0-backup`
- Zawiera: profil prywatny (51 meczów), pełna analityka, demo publiczne + snapshot, landing, SEO

---

### 0.0.x — Bootstrap + MVP core ✅

**Z Lovable (odtworzone w Next.js):**

- [x] **0.0.1** Bucket `dart-snapshots` (private, RLS)
- [x] **0.0.2** Shell UI PL, routing, wybór palety
- [x] **0.0.3** Ingest N01 + parser (endpoint, negative-score)
- [x] **0.0.4** Typy TS: `N01Match`, `N01Leg`, `N01Visit`
- [x] **0.0.5** Detekcja gracza — stary sposób buggy *(naprawione w 0.1.1)*
- [x] **0.0.6** Silnik statystyk: `computeMatchStats`, `computePlayerStats`
- [x] **0.0.7** Widok `/profile` — kafle stats, lista meczów, filtr zakresu
- [x] **0.0.8** Widok `/m/[shareId]` — throw-by-throw
- [x] **0.0.9** Seed 3 mecze testowe
- [x] **0.0.10** Schemat DB (migracje Postgres, RLS deny-by-default)
- [x] **0.0.11** Persystencja: `saveMatch`, `getMyMatches`, `getMatchByShareId`
- [x] **0.0.12** Wykres formy (Recharts: 3-dart avg + First 9)
- [x] **0.0.13** Ostatnie 5 meczów (kafel W/L)
- [x] **0.0.14** Top 10 najczęstszych podejść
- [x] **0.0.15** Top 10 najczęstszych zamknięć
- [x] **0.0.16** Formularz „Dodaj mecz" + walidacja tmid
- [x] **0.0.17** Obsługa duplikatów (Nadpisz / Pomiń)
- [x] **0.0.18** Import hurtowy (textarea, sekwencyjny)
- [x] **0.0.19** Signed URL do snapshotów (TTL 5 min)
- [x] **0.0.20** Przycisk „Udostępnij mecz"
- [x] **0.0.21** Audit-log dostępu
- [x] **0.0.22** Fix-pack: forma avg, 140+ violet, filtry zakresu (30/90/180/365/all)

**Next.js scaffold + backend:**

- [x] **0.0.23** Scaffold Next.js 16 + TypeScript + Tailwind v4 + npm
- [x] **0.0.24** Design tokens Sylveon Lift + `.glass-tile` + font Inter
- [x] **0.0.25** Supabase: projekt + bucket + migracje
- [x] **0.0.26** Test-fetch endpointu N01 — działa, JSON OK
- [x] **0.0.27** Landing `/` (Target icon, gradient CTA)
- [x] **0.0.28** Przepisanie logiki z Lovable → Next.js (parser, stats, API)
- [x] **0.0.29** Seed 3 mecze — `npm run seed`
- [x] **0.0.30** Vercel-ready — `vercel.json` + instrukcja deploy
- [x] **0.0.31** `/profile` — pełny MVP UI
- [x] **0.0.32** `/profile` — karty meczów z KPI
- [x] **0.0.33** `/m/[shareToken]` — throw-by-throw + details + score card
- [x] **0.0.34** Import hurtowy + formularz „Dodaj mecz"

---

### 0.1.x — Fixy UI + UX ✅

- [x] **0.1.1** Detekcja gracza STRICT (Grotkowski/Groteł + pytaj / odrzuć)
- [x] **0.1.2** Bulk import — `useRef` dla dupPolicy, „Nadpisz wszystkie"
- [x] **0.1.3** Paginacja meczów (3 najnowsze + „Więcej" → 10/strona)
- [x] **0.1.4** Wynik meczu — moje nazwisko zielone/czerwone (W/L), wynik na środku
- [x] **0.1.5** `(lotka)` usunięte z etykiet Best/Worst leg
- [x] **0.1.6** Throw-by-throw — odmiana polska przez `dartWord()`
- [x] **0.1.7** Odmiana liczebnikowa mecz/meczów w kaflu statystyk
- [x] **0.1.8** Top 10 bez licznika, formularz bez „01"
- [x] **0.1.9** Fix dat/godzin (`getTime()` ms→s), re-import 51 meczów
- [x] **0.1.10** Import hurtowy w sekcji „Dodaj nowy mecz", rozwijany
- [x] **0.1.11** Normalizacja nazwisk przez `normalizeName()`
- [x] **0.1.12** Checkout ratio `42% (3/7)` inline wszędzie
- [x] **0.1.13** Kafel Win rate legów; „Throw-by-throw" → „Rzut po rzucie"
- [x] **0.1.14** Backup DB do repo (`.dev/backup-2026-07-11.json`)
- [x] **0.1.15** Weryfikacja Top 10 zamknięć — logika poprawna
- [x] **0.1.16** Wykres formy — `ProfileFormChart` (Recharts)

---

### 0.2.x — Zaawansowana analityka ✅

- [x] **0.2.1** Wykres formy + `computeFormSeries`
- [x] **0.2.2** Heatmapa aktywności — `ProfileActivity` + `computeDayStats`
- [x] **0.2.3** Head-to-head — `ProfileHeadToHead`
- [x] **0.2.4** Histogram zamknięć — `ProfileCheckoutDistribution`
- [x] **0.2.5** ~~Export CSV/XLSX~~ → **CANCELLED**
- [x] **0.2.6** Normalizacja nazw + miasta; `myDisplayName` z customer DB

---

### 0.3.x — Fix & Small features ✅

- [x] **0.3.1** Gradient pasków w Top 10 i Histogram zamknięć
- [x] **0.3.2** Ostatnie mecze: średnia przeciwnika pod nazwiskiem
- [x] **0.3.3** Ostatnie mecze: biały font KPI; kolory tylko na bucketach
- [x] **0.3.4** Nazwy: blacklista miast PL (60+)
- [x] **0.3.5** Nazwy: title-case per słowo
- [x] **0.3.6** Wykres formy: etykieta „Śr. ogólna" w legendzie
- [x] **0.3.7** Audyt średnich — wykres = kafel (ważona lotkami) — **KRYTYCZNE**
- [x] **0.3.8** Aktywność — godziny (`ProfileActivityHours`)
- [x] **0.3.9** Tekst formularza importu (PL)
- [x] **0.3.10** H2H: kolor 100+ spójny z 140+/180
- [x] **0.3.11** H2H: statystyki przeciwnika — widok „Ja vs On"
- [x] **0.3.12** Widok meczu Details: kolory 100+/140+/180
- [x] **0.3.13** `ProfileStatsBlock` labels & layout
- [x] **0.3.19** Wykres formy: tooltip po indeksie, data+godzina, opp, W/L
- [x] **0.3.20** Aktywność dni/godziny — układ poziomy, fix mobile
- [x] **0.3.21** Kolory bucketów w kartach + Details
- [x] **0.3.22** `BEST LEG AVG` — kafel w statystykach głównych

**Odłożone (analityka turniejowa — można modyfikować przed wdrożeniem):**

- [ ] **0.3.14** ⏸️ **Porównanie sesji / turniejów** — filtr po nazwie rozgrywek z N01 (`title`), np. „Liga X" vs „Turniej Y"
- [ ] **0.3.15** ⏸️ **Grupowanie meczów po turnieju** — lista turniejów z liczbą meczów, avg, W/L
- [ ] **0.3.16** ⏸️ **Trendy per turniej** — wykres formy osobno dla wybranego `title`
- [ ] **0.3.17** ⏸️ **Filtr sezon** — rok / półrocze na bazie `start_time`

> **Czy da się modyfikować?** Tak. To nie jest osobna baza — dane już są w `matches.title` i datach. Możemy wdrożyć od lekkiego filtra (**0.3.14**) po pełny dashboard turniejowy. Priorytet niższy niż Auth i prod.

- [ ] **0.3.18** → przeniesione do **1.3.6** (batch loading, limit 1000 Supabase)

---

### 0.4.x — Demo publiczne + SEO + landing ✅

> Profile/mecze usera = **noindex**. Demo `/demo/`* = **index**. Postać: **Antoni „Robot" Kowalski** (`demo/demo-persona.ts`).

**Demo + SEO:**

- [x] **0.4.1.1** Audit noindex — `/profile`, `/m/`*, `/api/*` + middleware
- [x] **0.4.1.2** `robots.txt` — `app/robots.ts`
- [x] **0.4.1.3** `sitemap.xml` — `app/sitemap.ts`
- [x] **0.4.1.4** Dataset demo — 10 meczów zanonimizowanych (Supabase + snapshot)
- [x] **0.4.1.5** `/demo/profile` — pełna analityka
- [x] **0.4.1.6** `/demo/m/[token]` — demo001…demo010, rzut po rzucie
- [x] **0.4.1.7** Reuse UI — `demoMode`, `matchPathPrefix`, snapshot bez Supabase w runtime
- [x] **0.4.1.8** Landing `/` — CTA demo + Sylveon cross-link
- [x] **0.4.1.9** SEO pack — OG image, JSON-LD, canonical

**Demo hardening (Supabase + snapshot):**

- [x] **0.4.2.1** Demo w Supabase — `DEMO_CUSTOMER_ID`, migracja SQL
- [x] **0.4.2.2** Import + polish — `seed-demo-matches.ts`, `lib/demo-import.ts`
- [x] **0.4.2.3** Statyczny snapshot KPI per zakres — `demo-profile-snapshot.json`
- [x] **0.4.2.4** Stałe offsety dat → rozkład **3/5/8/10/10** w filtrach
- [x] **0.4.2.5** Daty live, staty frozen — `refreshDemoSnapshotDates()`
- [x] **0.4.2.6** Skrypty `seed:demo`, `repolish:demo`, `snapshot:demo`
- [x] **0.4.2.7** Share URL meczu — `lib/share-url.ts`
- [x] **0.4.2.8** Izolacja od profilu usera — `DEFAULT_CUSTOMER_ID` nietknięty
- [x] **0.4.2.9** Demo: sekcja „Dodaj mecz" (UI jak profil, bez zapisu → CTA rejestracji)

**Landing polish:**

- [x] **0.4.3.1** `/login` placeholder + CTA auth na landing
- [x] **0.4.3.2** Landing Sylveon vibe (sekcje 01–06, tagline)
- [x] **0.4.3.3** OG image dynamiczne + JSON-LD

**Regeneracja demo:** `npm run repolish:demo` → commit `demo-profile-snapshot.json`.

---

### 1.0.1.x — Po release: audyt, bezpieczeństwo, prod ⏳ NASTĘPNE

> Domknięcie release **1.0.0** na produkcji + checklist pod RODO i przyszłą bramkę płatności. **Auth dopiero w 1.1.x.**

- [ ] **1.0.1.1** **Audyt prod — robots & indeksacja**
  - [ ] `/profile`, `/m/*`, `/api/*` — noindex na żywym URL (nagłówki + meta)
  - [ ] `/demo/*`, `/` — indexowalne; brak PII w HTML demo
  - [ ] Search Console: sitemap, brak przypadkowych URL-i usera
- [ ] **1.0.1.2** **Audyt prod — wyciek danych**
  - [ ] Demo ≠ dane Piotra Grotkowskiego (osobny customer, snapshot)
  - [ ] Share linki prywatne — brak listowania tokenów
  - [ ] `.env` / klucze service_role tylko na serwerze
  - [ ] Supabase Storage private + signed URL TTL
- [ ] **1.0.1.3** **Audyt prod — API i ataki**
  - [ ] Rate limit na `/api/ingest` (anty-spam, anty-DDoS warstwa app)
  - [ ] Brak SQL injection (parametryzowane zapytania — audit)
  - [ ] CSP / security headers (middleware)
  - [ ] Logi dostępu do snapshotów (już jest — weryfikacja)
- [ ] **1.0.1.4** Deploy Vercel + env (`NEXT_PUBLIC_SITE_URL`, Supabase)
- [ ] **1.0.1.5** Custom domain (np. `dart.sylveoncompany.pl` — zmienna env, nie hardcode)

**Checklist przed bramką płatności (1.2.x):** Auth + RLS (**1.1.x**), DPA z Supabase/Vercel, polityka prywatności, rejestr czynności, minimalizacja danych, prawo do usunięcia (**1.1.7**), audyt pentest light.

---

### 1.0.2.x — Copy i komunikacja UI ⏳ (plan wstępny)

> Poprawki tekstów na całej stronie — **bez zmian logiki**. Szczegóły doprecyzujemy przed wdrożeniem.

- [ ] **1.0.2.1** Landing `/` — nagłówki, CTA, tone of voice (dart-first, mniej korpo)
- [ ] **1.0.2.2** Profil demo + banner — spójne komunikaty „to jest podgląd"
- [ ] **1.0.2.3** Formularz importu — helper text, błędy po polsku, emoji tam gdzie pasuje
- [ ] **1.0.2.4** Empty states, loadery, 404
- [ ] **1.0.2.5** `/login` + onboarding — pierwsze wrażenie po rejestracji
- [ ] **1.0.2.6** Audyt spójności: „mecz/meczów", „lotek", nazwy KPI

---

### 1.1.x — Auth + Multi-user + Admin ⏳

- [ ] **1.1.1** Supabase Auth (Google login)
- [ ] **1.1.2** Sync `auth.uid()` → `customer_id`
- [ ] **1.1.3** Onboarding + detekcja gracza przy imporcie
  - [ ] **1.1.3.1** Ekran onboarding: ustaw `known_nicknames`
  - [ ] **1.1.3.2** Testy scenariuszy auto-detect → Vitest **1.3.2**
  - [ ] **1.1.3.3** UI `ambiguous` — wybór slotu N01
  - [ ] **1.1.3.4** UI `none` — 2 kroki: potwierdź → wybierz gracza / odrzuć
  - [ ] **1.1.3.5** Bulk import: modal przy `none`/`ambiguous`
  - [ ] **1.1.3.6** Duplikat — import pojedynczy: Nadpisz / Zobacz / Pomiń
  - [ ] **1.1.3.7** Duplikat — bulk: Pomiń wszystkie / Nadpisz wszystkie
  - [ ] **1.1.3.8** **Samouczek** — opcjonalny tour po `/demo/profile` (podświetlenia sekcji + krótki opis); przycisk **Pomiń samouczek**; po onboardingu
- [ ] **1.1.4** Usunięcie stałej `DEFAULT_CUSTOMER_ID`
- [ ] **1.1.5** Middleware — ochrona `/profile`, API tylko dla zalogowanego
- [ ] **1.1.6** RLS per user (zamiast deny-all + service_role)
- [ ] **1.1.7** Usuwanie meczu przez usera
  - [ ] **1.1.7.1** Przycisk „Usuń mecz" na karcie / widoku meczu
  - [ ] **1.1.7.2** Triple-check: potwierdź → podsumowanie → wpisz `usuwam`
  - [ ] **1.1.7.3** API `DELETE /api/matches/[id]` + cascade + RLS
  - [ ] **1.1.7.4** Undo toast (nice-to-have)
- [ ] **1.1.8** Panel admina superadmin (`/admin`)
  - [ ] **1.1.8.1** Lista userów (customers)
  - [ ] **1.1.8.2** Podgląd / usuwanie meczów dowolnego usera
  - [ ] **1.1.8.3** Ręczny backup DB (export JSON)
  - [ ] **1.1.8.4** Podgląd ingest / snapshot access log
  - [ ] **1.1.8.5** Ochrona route — tylko `role = superadmin`

> Panel **1.2.4** = subskrypcje premium (biznes). Panel **1.1.8** = operacyjny (Ty).

---

### 1.2.x — Premium + Płatności ⏳

> Limity **konfigurowalne** — jeden plik/plan w DB, bez magic numbers w kodzie.

- [ ] **1.2.1** Model freemium — `lib/plan-limits.ts` (lub tabela `plan_tiers`):
  - `freeMaxMatches` — domyślnie 3, **zmienialne bez deployu**
  - `freeVisibleStats[]` / `premiumVisibleStats[]` — które kafle/wykresy widać
  - `freeFeatures[]` — np. bulk import tylko premium
- [ ] **1.2.2** UI limitów — soft block + CTA upgrade gdy przekroczony limit
- [ ] **1.2.3** Bramka płatności (PayNow lub PayU)
- [ ] **1.2.4** Role: user / premium / admin / superadmin
- [ ] **1.2.5** Panel admina — subskrypcje premium

---

### 1.3.x — Testy + Hardening + Perf ⏳

- [ ] **1.3.1** Vitest — golden samples parsera N01
- [ ] **1.3.2** Vitest — golden samples stats
- [ ] **1.3.3** Playwright (ingest → profil → share → mecz)
- [ ] **1.3.4** CI na PR (`typecheck && test`)
- [ ] **1.3.5** Backup DB — procedura + harmonogram
- [ ] **1.3.6** Perf: paginacja Supabase (fix limit 1000; było 0.3.18)
- [ ] **1.3.7** **Hardening pola importu meczów** (single + bulk):
  - [x] Demo: walidacja client (`lib/n01-url.ts`) — URL vs N01, komunikaty UX
  - [ ] Server-side whitelist + rate limit (prod)

---

### Kolejność prac — skrót


| #     | ID          | Zadanie                                   |
| ----- | ----------- | ----------------------------------------- |
| **→** | **1.0.1.1–5** | Audyt bezpieczeństwa prod + deploy + domena |
| 2     | 1.0.2.x       | Copy UI (plan)                              |
| 3     | 1.1.1         | Supabase Auth (Google)                      |
| 4     | 1.1.2–1.1.3   | Sync auth, onboarding, **samouczek 1.1.3.8** |
| 5     | 1.1.4–1.1.8   | RLS, middleware, usuwanie, admin            |
| 6     | 1.2.x         | Freemium (limity jako config)               |
| 7     | 1.3.x         | Testy + **hardening importu 1.3.7** + perf  |

*Opcjonalnie później:* 0.3.14–0.3.17 analityka turniejowa.

---

## Audyt bezpieczeństwa i prywatności (RODO)

> **Cel docelowy:** aplikacja na tyle solidna, żeby prawnik RODO w UE nie kręcił nosem, a integrator płatności (PayNow/PayU) nie odrzucił ze względu na oczywiste dziury. **Stan 1.0.0:** fundament OK, pełny audyt = **1.0.1.x** + **1.1.x**.

### Co chronimy

| Dane | Gdzie | Ryzyko |
| ---- | ----- | ------ |
| Mecze, statystyki, nicki | Supabase Postgres | Wysokie — dane osobowe graczy i przeciwników |
| Raw JSON/HTML N01 | Storage (private) | Wysokie — pełny zapis meczu |
| Share tokeny | DB + URL | Średnie — kto zna link, widzi mecz |
| Demo | Statyczny snapshot | Niskie — zanonimizowane, bez Piotra G. |

### Warstwa 1 — Roboty i indeksacja (stan + audyt 1.0.1.1)

| Route | Polityka | Mechanizm |
| ----- | -------- | --------- |
| `/profile`, `/m/*` | **noindex, nofollow** | `metadata.robots` + middleware `X-Robots-Tag` |
| `/api/*` | **noindex** | middleware |
| `/demo/*`, `/`, `/login` | **index** (marketing) | brak noindex |
| Demo | Brak PII | snapshot + `DEMO_CUSTOMER_ID` |

**Weryfikacja prod:** curl/Google Search Console — upewnić się, że Google **nie** indeksuje profilu Piotra.

### Tytuł karty przeglądarki (`<title>`) — jeden wszędzie

**Reguła (od main po 1.0.0):** każda podstrona ma identyczny tytuł:

```text
Twoje statystyki darta | Dart Profile Tracker
```

- **Bez imion/nazwisk** w `<title>`, OpenGraph ani JSON-LD na `/` (wyciek SEO).
- **Bez różnych tytułów per route** (profil, mecz, login — to samo).
- Implementacja: `lib/page-metadata.ts` → `siteDocumentTitle()`; `app/layout.tsx` ustawia domyślny.
- **backup/v1.0.0** miał różne tytuły per strona (w tym „Antoni Robot" na demo) — **poprawione**.

Różnicowanie stron: `description`, `robots`, `canonical` — nie `<title>`.

### Warstwa 2 — Dostęp i auth (plan 1.1.x)

| Teraz (1.0.0) | Docelowo |
| ------------- | -------- |
| Jeden `DEFAULT_CUSTOMER_ID`, brak logowania | Supabase Auth + RLS per user |
| API przez service_role | Middleware: tylko zalogowany właściciel |
| Każdy kto zna URL może wejść na `/profile` | `/profile` za loginem |

### Warstwa 3 — RODO / prawo (plan przed 1.2.3 płatności)

- **Minimalizacja:** nie zbieramy więcej niż potrzeba do statystyk darta
- **Cel przetwarzania:** usługa statystyk dla zawodnika (nie marketing do obcych bez zgody)
- **Prawo dostępu / usunięcia:** usuwanie konta i meczów (**1.1.7**)
- **DPA:** umowy powierzenia z Supabase i hostem (Vercel)
- **Polityka prywatności + cookies:** strona informacyjna (do napisania przed płatnościami)
- **Rejestr czynności:** dokument wewnętrzny (administrator = Ty)
- **Demo:** wyłącznie zanonimizowane dane — nigdy profil usera

### Warstwa 4 — Input i API (plan 1.3.7)

- Pole „Dodaj mecz" **nie jest** polem dowolnym — tylko URL N01
- Server-side walidacja (klient można ominąć)
- Rate limiting na ingest — ochrona przed spamem i obciążeniem N01/DB
- Brak `eval`, brak zapisu surowego HTML usera do DB bez parsowania

### Warstwa 5 — Infrastruktura (DDoS, skalowanie)

| Zagrożenie | Ochrona |
| ---------- | ------- |
| DDoS na stronę | Vercel / CDN — filtracja ruchu (domyślnie); opcjonalnie Cloudflare przed domeną |
| DDoS na API | Rate limit + Vercel edge; Supabase connection pooling |
| Wyciek kluczy | `SUPABASE_SERVICE_ROLE_KEY` tylko server-side; nigdy w repo |
| SQL injection | Supabase client + parametry; audit zapytań raw |

**Mikrus/VPS:** DDoS spada głównie na Ciebie — przy kilkuset userach lepiej Vercel + Supabase niż samodzielny serwer bez CDN.

### Checklist „gotowość pod płatności"

- [ ] Auth + RLS (**1.1.x**)
- [ ] Audyt prod (**1.0.1.x**)
- [ ] Polityka prywatności + regulamin
- [ ] Usuwanie danych usera (**1.1.7**)
- [ ] Hardening importu (**1.3.7**)
- [ ] HTTPS everywhere (Vercel domyślnie)
- [ ] Logi i backup (**1.3.5**, **1.1.8**)

---

## Hosting i skalowanie

### Czym jest Vercel (w skrócie)

**Vercel** to hosting pod aplikacje **Next.js**. Podłączasz GitHub → push na `main` → strona sama się buduje i wstaje na internecie. Nie instalujesz nginx, Node, certyfikatów SSL — robi to za Ciebie.

- **Darmowy tier** — wystarczy na start i demo
- **Auto HTTPS** — kłódka od razu
- **Skalowanie** — przy większym ruchu Vercel dokłada maszyny (płacisz więcej dopiero gdy przekroczysz darmowy limit)
- **Custom domain** — podpinasz `dart.sylveoncompany.pl` w panelu + DNS

**Supabase** (osobno) = baza danych w chmurze. Frontend na Vercel, dane w Supabase — standardowy układ.

### Mikrus / własny VPS — czy się da?

**Tak**, ale:

- Sam stawiasz Node, reverse proxy, SSL, aktualizacje, backupy
- Przy **kilkuset userach** jeden mały VPS może **nie wystarczyć** bez tuningu
- **Skalowanie „3 kliki"** — na Vercel/Supabase: upgrade planu w panelu. Na Mikrusie: kup większy pakiet + migracja ręczna

### Rekomendacja pod Twój cel (tanio + szybko więcej mocy)

| Etap | Frontend | Baza | Koszt orientacyjny |
| ---- | -------- | ---- | ------------------ |
| Start (0–100 userów) | Vercel Hobby (free) | Supabase Free | ~0 zł |
| Wzrost (100–500) | Vercel Pro | Supabase Pro (~$25/m) | ~100–150 zł/m |
| Duży ruch | Vercel + ewent. Cloudflare | Supabase Pro + read replicas | skalowanie w panelu |

**Mikrus** ma sens jako backup/dev albo jeśli **koniecznie** chcesz wszystko w PL i masz czas na admina. Na produkcję SaaS z płatnościami — **Vercel + Supabase** mniej bólu głowy.

**Domena:** zawsze przez env `NEXT_PUBLIC_SITE_URL` — zmiana domeny = zmiana DNS + env, bez przepisywania kodu.

---

## ADR — kluczowe decyzje

1. **Next.js zamiast TanStack Start** — stabilniejszy, łatwiejszy deploy.
2. **Supabase zamiast self-hosted** — free tier na MVP, Pro przy wzroście.
3. **Polska bramka (PayNow/PayU)** — lokalny rynek, PLN.
4. **Parser: negative-score encoding** — N01 koduje ujemny `score` jako liczbę lotek.
5. **Share-link: deterministyczny token** — 8 znaków base36, krótki, bezpieczny.
6. **Schemat DB bez skrótów** — `customer_id`, `match_id`, `n01_tmid` (czytelność).
7. **Noindex na profilach/share** — prywatne dane, bez Google (`/profile`, `/m/`*).
8. **Demo publiczne pod** `/demo/`* — zanonimizowany dataset w Supabase (`DEMO_CUSTOMER_ID`) + statyczny snapshot KPI (`demo-profile-snapshot.json`) + `demo/demo-persona.ts`; indexowalny; **nigdy** dane Piotra Grotkowskiego w demo.
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
- `DEMO_CUSTOMER_ID` — opcjonalnie; domyślnie `b0000000-0000-4000-8000-000000000001` (tylko demo)

**Nigdy nie commituj** `.env.local`**.**

Podgląd w przeglądarce:

- **Strona główna:** [http://localhost:3000/](http://localhost:3000/)
- **Profil (import + lista meczów):** [http://localhost:3000/profile](http://localhost:3000/profile)
- **Mecz (placeholder):** [http://localhost:3000/m/{shareToken}](http://localhost:3000/m/{shareToken})

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

1. [https://vercel.com](https://vercel.com) → **Add New Project** → import `grotkowski9/Cursor_DartStats`
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

### v1.0.0 — Release ✅ | **1.0.1.1** ⏳ NASTĘPNE


| Element        | Status                                                 |
| -------------- | ------------------------------------------------------ |
| **1.0.0**      | ✅ WYDANY — branch `backup/v1.0.0`, tag `v1.0.0-backup` |
| **0.x.x**      | ✅ Bootstrap → demo (zamknięte w 1.0.0)                 |
| **1.0.1.x**    | ⏳ Prod audit + deploy + domena                         |
| **1.1.x**      | ⏳ Auth + multi-user (po 1.0.1)                         |
| **1.2.x**      | ⏳ Premium                                              |
| **1.3.x**      | ⏳ Testy + perf                                         |
| Backup lokalny | `.dev/backup-2026-07-12-v1.0.json` (51 meczów + KPI)   |


### Co wchodzi w 1.0.0


| Obszar          | Zakres (ID)                                |
| --------------- | ------------------------------------------ |
| Profil prywatny | 0.0.x–0.3.x — 51 meczów, pełna analityka   |
| Demo publiczne  | 0.4.x — snapshot, stałe daty, landing, SEO |
| Git backup      | `backup/v1.0.0` + tag `v1.0.0-backup`      |


### Co dalej — skrót

**Teraz:** 1.0.1.1 → 1.0.1.2 → 1.0.1.3  
**Potem:** 1.1.1 (Auth) → 1.1.2 → 1.1.3 → … → 1.2.x → 1.3.x

### Mapa wersji


| Wersja    | Nazwa             | Status      |
| --------- | ----------------- | ----------- |
| **0.x**   | Bootstrap → demo  | ✅ w 1.0.0   |
| **1.0.0** | Release milestone | ✅ WYDANY    |
| **1.0.1** | Prod + deploy     | ⏳ **teraz** |
| **1.1**   | Auth + admin      | ⏳           |
| **1.2**   | Premium           | ⏳           |
| **1.3**   | Testy + perf      | ⏳           |


### Pliki kluczowe (1.0.0)

```
demo/demo-persona.ts                          ← postać demo (podmiana osoby)
demo/demo-profile-snapshot.json               ← statyczne KPI + mecze (commit)
lib/demo.ts / lib/demo-snapshot.ts            ← loader + refresh dat
lib/demo-dates.ts / lib/demo-import.ts        ← offsety dat + anonimizacja
lib/page-metadata.ts                          ← jeden tytuł: Twoje statystyki darta | DPT
lib/n01-url.ts                                ← walidacja URL N01 (demo + przyszły server)
lib/share-url.ts                              ← link do udostępnienia meczu
scripts/seed-demo-matches.ts                  ← npm run seed:demo / repolish:demo
scripts/snapshot-demo.ts                      ← npm run snapshot:demo
supabase/migrations/20260713220000_demo_customer.sql
app/demo/profile/page.tsx                     ← profil publiczny index
app/demo/m/[shareToken]/page.tsx              ← mecze demo index
app/page.tsx / app/login/page.tsx             ← landing + auth placeholder
app/robots.ts / app/sitemap.ts                ← SEO
middleware.ts                                 ← X-Robots-Tag na /profile, /m, /api
components/demo-banner.tsx
```

### Pliki kluczowe (profil prywatny — 0.0.x–0.3.x)

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

Stan: **1.0.0 WYDANY** (backup/v1.0.0). NASTĘPNE: **1.0.1.1** audit noindex prod.
Potem: 1.0.1.2 deploy → 1.0.1.3 domena → **1.1.1 Auth**.
Numeracja: 0.x = historia, 1.0.0 = release, 1.0.1+ = dalsze prace.
```

### Podgląd na telefonie (dev)

```bash
npm run dev -- --hostname 0.0.0.0
# Telefon: http://192.168.100.11:3000/profile
# allowedDevOrigins w next.config.ts — zaktualizuj IP jeśli sieć się zmieni
```

---

## Dziennik zmian


| Wersja     | Data       | Co zrobiono                                                                                                                                                                                                                                                                                                         |
| ---------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1.0.0**  | 2026-07-14 | **Release milestone.** Backup `backup/v1.0.0`. Roadmapa 0.x / 1.0.x. |
| **1.0.0-post** | 2026-07-14 | SEO: jeden tytuł dokumentu wszędzie; bez imion w meta/OG/JSON-LD; demo „Dodaj mecz" + walidacja N01; README audyt. |
| v4.0.3     | 2026-07-14 | Demo hardening *(→ 1.0.0)* |
| **v4.0.2** | 2026-07-12 | Landing Sylveon vibe (numerowane sekcje 01–06, tagline), OG image dynamiczne, JSON-LD, dartboard-ring CSS.                                                                                                                                                                                                          |
| **v4.0.1** | 2026-07-12 | **Demo publiczne + SEO + landing 4.5.** `/demo/profile` (Antoni Robot Kowalski, 10 meczów), `/demo/m/demo001–010`, robots/sitemap, middleware noindex, Sylveon cross-link, `/login` placeholder. `npm run build:demo`.                                                                                              |
| **v1.0.0** | 2026-07-12 | **Milestone release** — Fazy 0–3 DONE. BEST LEG AVG, wykres formy tooltip, aktywność pozioma, kolory bucketów. Batch loading cofnięty (bug). Backup `.dev/backup-2026-07-12-v1.0.json`.                                                                                                                             |
| v0.13      | 2026-07-12 | Batch loading (cofnięty), BEST LEG AVG, wykres formy tooltip, aktywność pozioma, kolory 120+/170+ w kartach, Matches pill fix desktop.                                                                                                                                                                              |
| v0.12      | 2026-07-12 | Faza 3.1–3.13 done: gradient pasków, średnie ważone (wykres=kafel), nazwy (blacklista 60 miast, title-case), H2H Ja vs On, aktywność-godziny, spójność UI (100+/140+/180 kolory), ProfileStatsBlock labels (3-DART AVG, LEGS WIN RATE, compact layout). Zadania 3.14–3.17 zawieszone. README v0.12, package 0.12.0. |
| v0.11-plan | 2026-07-12 | Reorganizacja roadmapy: Faza 3 = Fix & Small features pack (3.1–3.16). Auth→Faza 4, Premium→Faza 5, Testy→Faza 6.                                                                                                                                                                                                   |
| v0.11      | 2026-07-12 | Faza 2 done: heatmapa aktywności per dzień tygodnia (ProfileActivity + computeDayStats), histogram zamknięć (ProfileCheckoutDistribution + computeCheckoutDistribution, 8 zakresów). README v0.11.                                                                                                                  |
| v0.10      | 2026-07-12 | Faza 1 done + Faza 2.1/2.3: wykres formy (Recharts), head-to-head stats, normalizeName z miastami, customer name propagation, 1.15 checkout verified.                                                                                                                                                               |
| v0.9       | 2026-07-11 | Faza 1 batch 1: fix dat (ms/s), re-import 51 meczów z N01, normalizeName, paginacja 3+10/str, Win rate legów, moje imię zielone/czerwone, checkout inline, Rzut po rzucie, backup DB, bulk overwrite-all fix.                                                                                                       |
| v0.8       | 2026-07-11 | MVP UI: profil (statystyki, top 10, karty, bulk), mecz throw-by-throw. Import 51 meczów z CSV Lovable.                                                                                                                                                                                                              |
| v0.6       | 2026-07-11 | Supabase + backend (parser, stats, API, import). Profil/mecz UI = placeholder.                                                                                                                                                                                                                                      |
| v0.5       | 2026-07-11 | Scaffold Next.js 16: landing, profil placeholder, design Sylveon Lift, build OK.                                                                                                                                                                                                                                    |
| v0.4       | 2026-07-11 | README reorganizowane: Fazy 0-5, nowy schemat DB, fixy 5.8-5.14.                                                                                                                                                                                                                                                    |
| v0.3       | 2026-07-11 | Analiza repo Lovable (`dart-stats-hub`): parser, stats, routes, migracje SQL.                                                                                                                                                                                                                                       |
| v0.2       | 2026-07-11 | Zrzuty + README Lovable → nowy README. Stack, roadmapa, design, ADR.                                                                                                                                                                                                                                                |
| v0.1       | 2026-07-11 | Nowe repo na GitHub.                                                                                                                                                                                                                                                                                                |


---

## Seed URLs (testy)

Z kodu Lovable, zweryfikowane:

- `https://n01darts.com/n01/league/n01_view.html?tmid=t_84WD_6808_rr_1_ODeb_WvbB`
- `https://n01darts.com/n01/tournament/n01_view.html?tmid=t_AWMW_0234_t_2_ASmj_P4P5`
- `https://n01darts.com/n01/league/n01_view.html?tmid=t_84WD_6808_rr_1_6zyK_WvbB`

---

## Źródła

- **Stary projekt:** [https://github.com/grotkowski9/dart-stats-hub](https://github.com/grotkowski9/dart-stats-hub)
- **Inspiracja designu:** [https://sylveoncompany.pl](https://sylveoncompany.pl)
- **System meczów:** [https://n01darts.com](https://n01darts.com)

