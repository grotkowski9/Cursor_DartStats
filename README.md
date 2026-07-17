# Cursor_DartStats

**Dart Profile Tracker** — prywatny panel statystyk darta, budowany w Next.js 16.
Docelowo pod `dart.sylveoncompany.pl`.

> **Status:** **v1.1.0** — Auth core **1.1.1–1.1.6 WYDANY** (Google, onboarding, RLS, test Mac + iPhone LAN). **Następne:** **1.1.7** usuwanie meczu · plan **1.1.9** obowiązkowy formularz profilu.

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
16. [Inwentaryzacja copy klienta](#inwentaryzacja-copy-klienta)
17. [Dziennik zmian](#dziennik-zmian)

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
- **Copy klienta:** przed wdrożeniem komunikatów UI — **pytam o docelowe teksty** (patrz **1.0.2.x**); brak technicznego żargonu w UI.
- **Iteracyjnie.** Po każdym etapie: Co zrobiłem / Co dalej / Ryzyka / Pytania.
- **Nie idziemy dalej bez akceptacji.**

---

## Status / Roadmapa

### Konwencja numeracji


| Prefiks     | Znaczenie                               | Status                                 |
| ----------- | --------------------------------------- | -------------------------------------- |
| **0.x.x**   | Prace historyczne (bootstrap → demo)    | ✅ zamknięte w **1.0.0**                |
| **1.0.0**   | Release milestone — backup na GitHub    | ✅ `backup/v1.0.0`, tag `v1.0.0-backup` |
| **1.0.1**   | Feedback po testach manualnych — inwentaryzacja copy | ✅ **wydany** |
| **1.0.1.x** | Prod, audyt, deploy | ⏳ po 1.1.7 / równolegle |
| **1.0.2.x** | Copy / teksty UI (fix po Twojej akceptacji) | ⏳ po inwentaryzacji |
| **1.1.x**   | Auth + multi-user + admin               | ✅ **1.1.0** (1.1.1–6) · dalej **1.1.7+** / **1.1.9** |
| **1.2.x**   | Premium + płatności                     | ⏳                                      |
| **1.3.x**   | Testy + hardening + perf                | ⏳                                      |
| **5.x**     | Pełne wydanie produktu (odłożone)     | ⏸️ po 1.x — m.in. **Apple login**        |


Subtaski: czwarty poziom, np. **1.1.2.4** = onboarding, flow `none`.

**Kolejność:** `1.0.1` → `1.1` → `1.2` → `1.3` (po kolei, bez skakania). **5.x** = dopiero po domknięciu pełnego produktu 1.x (hen hen do przodu).

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

### 1.0.1 — Feedback po testach manualnych ✅ WYDANY (2026-07-14)

> Checkpoint po **1.0.0** i ręcznych testach UI. **Bez zmian w kodzie copy** — tylko pełna lista komunikatów frontowych do Twojego review.

- [x] **1.0.1.0** Inwentaryzacja copy — ~245 pozycji MSG (patrz [Inwentaryzacja copy klienta](#inwentaryzacja-copy-klienta))
- [x] **1.0.1.0** Znane problemy copy/UX — tabela w **1.0.2.x** (tmid w UI, bulk identity, przycisk Odrzuć)
- [ ] **1.0.1.0** Twoja akceptacja tekstów — checkbox `[ ] do review` przy każdym MSG

**Workflow dalej:** przechodzisz MSG-y w README → podajesz docelowe copy → **1.0.2.x** implementacja.

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

### 1.0.2.x — Copy i komunikaty klienta ⏳ (plan — **bez kodu na razie**)

> **Workflow:** przed wdrożeniem każdej podsekcji — **pytam Cię o docelowe copy** (lista komunikatów → Ty podajesz teksty PL → dopiero wtedy commit). Żadnych technicznych `throw Error(...)` w UI bez mapowania na ludzki język.

- [x] **1.0.2.0** **Inwentaryzacja copy** — ✅ w **1.0.1** ([pełna lista MSG](#inwentaryzacja-copy-klienta)). Ty zatwierdzasz słownik.
- [ ] **1.0.2.1** Landing `/` — nagłówki, CTA, tone of voice (dart-first)
- [ ] **1.0.2.2** Profil demo + banner — spójne komunikaty „to jest podgląd"
- [ ] **1.0.2.3** Formularz importu (single) — helper, sukces, błędy po polsku
- [ ] **1.0.2.4** Import hurtowy — te same reguły co single; **bez** suchego „wymaga wyboru gracza" w tabeli
- [ ] **1.0.2.5** Empty states, loadery, 404
- [ ] **1.0.2.6** `/login` + onboarding — pierwsze wrażenie po rejestracji
- [ ] **1.0.2.7** Spójność PL: „mecz/meczów", „lotek", nazwy KPI

#### Znane problemy do fixu (copy + UX) — czeka na Twoje teksty

**Walidacja URL / import (dziś w kodzie — technicznie, niespójnie):**

| Gdzie | Obecny komunikat (źle) | Uwaga |
| ----- | ------------------------ | ----- |
| HTML `type=url` + „asdf" | „Wprowadź adres URL" (browser) | Obejść walidacją własną + copy od Ciebie |
| Demo / klient | Teksty z `lib/n01-url.ts` | OK kierunek, ale do zatwierdzenia |
| Backend `lib/matches.ts` | `URL nie zawiera prawidłowego tmid` | **Runtime Error** w UI — mapować na PL |
| `lib/n01-parser.ts` | `Brak parametru tmid w URL` | j.w. |
| `lib/n01-parser.ts` | `URL musi pochodzić z n01darts.com` | j.w. |
| Bulk (ang.) | `invalid url` / surowe błędy fetch | PL + jeden styl |
| Bulk + identity | status `error`, message `wymaga wyboru gracza` | **Powinno pytać** (modal jak przy single), nie cichy błąd w liście |

**Modale / przyciski:**

| Gdzie | Obecnie | Docelowo (propozycja do Twojej akceptacji) |
| ----- | ------- | ------------------------------------------ |
| Identity: „Nie rozpoznano Cię…" | „Odrzuć — nie zapisuj" — szary, mało widoczny | **Czerwony, domyślny/destructive** primary |
| Bulk duplikat / identity | Brak spójnego flow z importem pojedynczym | Zunifikować z **1.1.3.5** |

**Zasady na fix (1.0.2.x + część 1.1.3):**

1. User **nigdy** nie widzi `tmid`, stack trace ani angielskiego z parsera.
2. Jeden słownik błędów: `lib/user-messages.ts` (robocza nazwa) — mapowanie kod → copy PL.
3. Bulk przy `needs_identity_confirmation` → **modal pytania**, nie wiersz „error".
4. Wszystkie teksty zatwierdza **Piotr** przed merge.

---

### 1.1.x — Auth + Multi-user + Admin

> **v1.1.0 (2026-07-15):** wydany core auth **1.1.1–1.1.6**. Dalej: usuwanie / admin / tour.

- [x] **1.1.1** Supabase Auth (**Google** login) — `/login`, `/api/auth/google`, `/auth/callback`, `/auth/signout`, `@supabase/ssr`
  - OAuth start po stronie serwera (PKCE cookies); callback zapisuje sesję na redirect
  - Dev z telefonu: Site URL w Supabase = `http://<IP-Maca>:3000` (nie `localhost` na iPhonie)
  - ⏸️ **Apple Sign In** → **5.0.1**
- [x] **1.1.2** Sync `auth.uid()` → `customer_id` — `ensureCustomerForUser()`; `OWNER_EMAIL` → `SEED_CUSTOMER_ID`
- [x] **1.1.3** Onboarding + detekcja gracza przy imporcie
  - [x] **1.1.3.1** Ekran `/onboarding` — imię, nazwisko, nick, `known_nicknames` *(scaffold; pełny obowiązkowy flow → **1.1.9**)*
  - [ ] **1.1.3.2** Testy scenariuszy auto-detect → Vitest **1.3.2**
  - [x] **1.1.3.3** UI `ambiguous` — wybór slotu N01 (podświetlenie „Ty?")
  - [x] **1.1.3.4** UI `none` — 2 kroki: potwierdź → wybierz gracza / odrzuć
  - [x] **1.1.3.5** Bulk import: modal przy `none`/`ambiguous`
  - [x] **1.1.3.6** Duplikat — import pojedynczy: Nadpisz / Zobacz / Pomiń
  - [x] **1.1.3.7** Duplikat — bulk: Pomiń wszystkie / Nadpisz wszystkie
  - [ ] **1.1.3.8** **Samouczek** — opcjonalny tour po `/demo/profile`
- [x] **1.1.4** Usunięcie runtime `DEFAULT_CUSTOMER_ID` — API wymaga sesji; seed → `SEED_CUSTOMER_ID`
- [x] **1.1.5** Middleware — `/profile`, `/onboarding`, `/api/*` tylko zalogowany (+ noindex); `/?code=` → `/auth/callback`
- [x] **1.1.6** RLS per user — migracja `20260715210000_auth_rls_per_user.sql` (zastosowana na Supabase)
- [ ] **1.1.7** Usuwanie meczu przez usera ⏳ **NASTĘPNE**
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
- [ ] **1.1.9** **Obowiązkowy formularz profilu po rejestracji** ⏳ PLAN *(bez kodu w tym commicie)*
  - Auth na ten moment: tylko **Google** (**1.1.1**). Apple → **5.0.1**.
  - [ ] **1.1.9.1** Formularz **wymagany** po pierwszym logowaniu Google (`/onboarding`)
    - Pola obowiązkowe:
      1. **Imię**
      2. **Nazwisko**
      3. **Pseudonim główny** (wyświetlany na profilu)
      4. **Pseudonimy do rozpoznawania w spotkaniach** (`known_nicknames`) — ≥1 wzorzec N01
    - Imię + nazwisko: **prefill z Google** (`user_metadata` / `full_name`) — user może poprawić
    - Bez ukończenia → brak pełnego `/profile` (redirect `/onboarding`) — wzmocnić scaffold **1.1.3.1**
  - [ ] **1.1.9.2** Prefill imię/nazwisko z Google przy `ensureCustomerForUser` / tworzeniu customer
  - [ ] **1.1.9.3** **Gate na ingest (obrona w głąb):** jeśli brak kluczowych danych (imię, nazwisko, `known_nicknames`) — nawet gdy ktoś „ominie” onboarding — **odmowa zapisu meczu**
    - API + UI: błąd PL w stylu „Brakuje danych kluczowych do rozpoznawania zawodnika — uzupełnij profil”
    - CTA / redirect → `/onboarding` (ten sam formularz)
    - Dotyczy single i bulk; **pierwszy** i każdy kolejny import bez kompletnego profilu
  - [ ] **1.1.9.4** **Edycja profilu** później w `/profile` — te same pola co w formularzu rejestracji (Edytuj → zapis PATCH)
  - [ ] **1.1.9.5** Placeholder UI w profilu: przycisk **„Włącz wyższy bieg — konto premium”**
    - Na razie: widoczny, **bez płatności** (disabled / „wkrótce” albo soft link do przyszłego **1.2.x**)
    - Pełna bramka + limity → **1.2.1–1.2.3**

> Panel **1.2.4** = subskrypcje premium (biznes). Panel **1.1.8** = operacyjny (Ty).

---

### 1.2.x — Premium + Płatności ⏳

> Limity **konfigurowalne** — jeden plik/plan w DB, bez magic numbers w kodzie.
> CTA w UI profilu przygotować wcześniej jako placeholder (**1.1.9.5**): **„Włącz wyższy bieg — konto premium”**.

- [ ] **1.2.1** Model freemium — `lib/plan-limits.ts` (lub tabela `plan_tiers`):
  - `freeMaxMatches` — domyślnie 3, **zmienialne bez deployu**
  - `freeVisibleStats[]` / `premiumVisibleStats[]` — które kafle/wykresy widać
  - `freeFeatures[]` — np. bulk import tylko premium
- [ ] **1.2.2** UI limitów — soft block + CTA upgrade gdy przekroczony limit (ten sam copy co **1.1.9.5**)
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

### 5.x — Pełne wydanie produktu ⏸️ (odłożone — po zamknięciu 1.x)

> **Nie teraz.** Dopiero gdy 1.x (auth, premium, prod, copy, testy) będzie domknięte i wypuszczony pełny produkt. Numer **5.0** = milestone „pełna wersja”, nie kolejny krok po 1.3.

- [ ] **5.0.0** Milestone — pełne wydanie (kryteria doprecyzujemy przy 1.3)
- [ ] **5.0.1** **Logowanie Apple** — „Zaloguj przez Apple” obok Google (`Sign in with Apple` w Supabase + przycisk na `/login`)
  - Wymaga: konto Apple Developer, konfiguracja domeny, uwaga na ukryte e-maile Apple (relay)
- [ ] **5.x** Inne providery auth (opcjonalnie) — tylko jeśli biznesowo potrzebne

**Na dziś:** wystarczy **Google** (1.1.1). Apple nie jest w scope aż do **5.x**.

---

### Kolejność prac — skrót


| #     | ID            | Zadanie                                      |
| ----- | ------------- | -------------------------------------------- |
| **→** | **1.1.7**     | Usuwanie meczu (UI + API + triple-check)     |
| 2     | **1.1.9**     | Obowiązkowy formularz po Google + gate ingest + edycja profilu + CTA premium (placeholder) |
| 3     | 1.1.8         | Panel admina superadmin                      |
| 4     | 1.1.3.8       | Samouczek po onboardingu                     |
| 5     | 1.0.1.4–5     | Deploy Vercel + custom domain                |
| 6     | 1.0.1.1–3     | Audyt prod (robots, wycieki, API)            |
| 7     | 1.0.2.x       | Copy klienta (Twoje teksty → fix)            |
| 8     | 1.3.2         | Vitest detekcja gracza (`1.1.3.2`)           |
| 9     | 1.2.x         | Freemium (limity jako config) — podłącza **1.1.9.5** |
| 10    | 1.3.x         | Testy + hardening importu + perf             |

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

### Warstwa 2 — Dostęp i auth (stan po 1.1.1–1.1.6)

| Było (1.0) | Teraz |
| ---------- | ----- |
| Jeden `DEFAULT_CUSTOMER_ID`, brak logowania | Google OAuth → `customers.auth_user_id` |
| API otwarte + service_role | Middleware + `requireAuthCustomerApi()` |
| `/profile` publiczny | `/profile` + `/onboarding` za loginem |
| RLS deny-all | RLS per user (`current_customer_id()`) |

**Setup Google (jednorazowo):**

1. **Google Cloud** → OAuth client → Authorized redirect URI =  
   `https://<project-ref>.supabase.co/auth/v1/callback`
2. **Supabase** → Authentication → Providers → Google (Client ID/Secret)
3. **Supabase** → URL Configuration:
   - **Site URL (dev Mac):** `http://localhost:3000`
   - **Site URL (test iPhone w LAN):** `http://<IP-Maca>:3000` — inaczej Safari wraca na `localhost` (= telefon) i „brak odpowiedzi"
   - **Redirect URLs:**  
     `http://localhost:3000/auth/callback`  
     `http://<IP-Maca>:3000/auth/callback`  
     (+ prod URL po deployu)
4. **`.env.local`:** `OWNER_EMAIL=` Twój Gmail → link do seed 51 meczów; `NEXT_PUBLIC_SITE_URL=http://localhost:3000` (dev)

Flow w app: `/login` → `GET /api/auth/google` → Google → `/auth/callback` (exchange + cookies sesji) → `/profile` lub `/onboarding`.

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

- [x] Auth + RLS (**1.1.1–1.1.6** / v1.1.0)
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

Na telefonie: `http://192.168.100.11:3000/login` (nie `localhost` — na telefonie to sam telefon).

`next.config.ts` ma `allowedDevOrigins` pod IP Maca — po zmianie sieci zaktualizuj IP i zrestartuj serwer.

**Logowanie Google z iPhone (dev):** w Supabase ustaw **Site URL** na `http://192.168.100.11:3000` oraz Redirect URL `…/auth/callback` dla tego hosta. Potem wróć Site URL na `localhost` gdy testujesz tylko na Macu — albo trzymaj IP jako Site URL w trakcie testów LAN.

**Uwaga:** pierwsze ładowanie meczów trwa ~12 s (51 meczów). Poczekaj — spinner „Ładuję mecze…" zniknie dopiero po pobraniu danych.

W `.env.local` potrzebne:

- `NEXT_PUBLIC_SUPABASE_URL` — URL projektu Supabase
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — klucz publishable (`sb_publishable_…`)
- `SUPABASE_SERVICE_ROLE_KEY` — klucz secret (`sb_secret_…`, tylko serwer)
- `SEED_CUSTOMER_ID` — UUID seed customer Piotra (`a0000000-…`) — skrypty + link `OWNER_EMAIL`
- `OWNER_EMAIL` — e-mail Google właściciela → auto-link do seed (51 meczów)
- `DEMO_CUSTOMER_ID` — opcjonalnie; domyślnie `b0000000-…` (tylko demo)

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
  - `SEED_CUSTOMER_ID`
  - `OWNER_EMAIL`
  - `NEXT_PUBLIC_SITE_URL` — `https://dart.sylveoncompany.pl` lub `https://darts.pl` (canonical)
4. Deploy. Custom domain: `dart.sylveoncompany.pl` / `darts.pl` — ten sam build, inny env.

---

## Stan na koniec czatu + handoff

### v1.1.0 Auth ✅ | **1.1.7** ⏳ NASTĘPNE


| Element         | Status                                                      |
| --------------- | ----------------------------------------------------------- |
| **1.0.0**       | ✅ WYDANY — branch `backup/v1.0.0`, tag `v1.0.0-backup`      |
| **1.0.1**       | ✅ WYDANY — inwentaryzacja copy (~245 MSG)                   |
| **1.1.0**       | ✅ WYDANY — Auth 1.1.1–1.1.6 (Google, RLS, onboarding; Mac+iPhone) |
| **1.1.7+**      | ⏳ Usuwanie meczu, **1.1.9** formularz obowiązkowy, admin, samouczek |
| **1.0.1.x**     | ⏳ Prod audit + deploy + domena                              |
| **1.2.x**       | ⏳ Premium                                                   |
| Backup lokalny  | `.dev/backup-2026-07-12-v1.0.json` (51 meczów + KPI)        |


### Co wchodzi w 1.0.0


| Obszar          | Zakres (ID)                                |
| --------------- | ------------------------------------------ |
| Profil prywatny | 0.0.x–0.3.x — 51 meczów, pełna analityka   |
| Demo publiczne  | 0.4.x — snapshot, stałe daty, landing, SEO |
| Git backup      | `backup/v1.0.0` + tag `v1.0.0-backup`      |


### Co dalej — skrót

**Teraz:** **1.1.7** usuwanie meczu → **1.1.9** obowiązkowy formularz / gate / edycja profilu → **1.1.8** admin → **1.1.3.8** samouczek  
**Potem:** 1.0.1.x prod / 1.0.2 copy → 1.2.x (podłącza CTA premium z 1.1.9.5) → 1.3.x

### Mapa wersji


| Wersja      | Nazwa                        | Status        |
| ----------- | ---------------------------- | ------------- |
| **0.x**     | Bootstrap → demo             | ✅ w 1.0.0     |
| **1.0.0**   | Release milestone            | ✅ WYDANY      |
| **1.0.1**   | Feedback + copy inventory    | ✅ WYDANY      |
| **1.1.0**   | Auth core (Google + RLS)     | ✅ WYDANY      |
| **1.1.7+**  | Usuwanie / admin / tour      | ⏳ **teraz**   |
| **1.0.1.x** | Prod + deploy                | ⏳             |
| **1.2**     | Premium                      | ⏳             |
| **1.3**     | Testy + perf                 | ⏳             |
| **5.x**     | Pełne wydanie + Apple login  | ⏸️ odłożone   |


### Pliki kluczowe (Auth v1.1.0)

```
lib/auth.ts                                   ← ensureCustomerForUser, requireAuth*
lib/request-origin.ts / lib/app-origin.ts     ← origin LAN vs localhost
lib/auth-redirect-*.ts                        ← cookies origin/next po OAuth
lib/supabase/server.ts / middleware.ts        ← SSR cookies + gate
lib/customer.ts                               ← sync / onboarding
app/api/auth/google/route.ts                  ← server-side OAuth start (PKCE)
app/auth/callback/route.ts                    ← exchange code → session cookies
app/auth/signout/route.ts
app/login/*                                   ← przycisk Google
app/onboarding/*                              ← known_nicknames
supabase/migrations/20260715210000_auth_rls_per_user.sql
middleware.ts                                 ← protect + /?code= → callback
```

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

Stan: **v1.1.0 Auth WYDANY** (1.1.1–1.1.6). NASTĘPNE: **1.1.7** usuwanie meczu.
Auth działa na Mac + iPhone (LAN). Pliki: lib/auth.ts, app/api/auth/google, app/auth/callback, middleware.
```

### Podgląd na telefonie (dev)

```bash
npm run dev -- --hostname 0.0.0.0
# Telefon: http://192.168.100.11:3000/login
# Supabase Site URL na czas testów LAN = http://192.168.100.11:3000
# allowedDevOrigins w next.config.ts — zaktualizuj IP jeśli sieć się zmieni
```

---

## Inwentaryzacja copy klienta

> **Wersja:** 1.0.1 · **Data:** 2026-07-14 · **~245 pozycji MSG**  
> **Cel:** każdy komunikat widoczny dla usera — do przejrzenia i zatwierdzenia przed **1.0.2.x**.  
> **Legenda:** `[ ] do review` → Ty podajesz docelowy tekst (lub ✓ zostawiamy).  
> **Uwaga:** nazwy graczy, tytuły meczów, daty i liczby to dane dynamiczne — nie są tu wymienione.

### Global / tytuł / branding

| ID | Plik / kontekst | Kiedy | Tekst | Review |
|----|-----------------|-------|-------|--------|
| MSG-001 | `lib/page-metadata.ts` — `<title>` | Każda strona | `Twoje statystyki darta \| Dart Profile Tracker` | [ ] do review |
| MSG-002 | `lib/site-config.ts` | Footer, OG, JSON-LD | `Dart Profile Tracker` | [ ] do review |
| MSG-003 | `lib/site-config.ts` — OG alt | Share preview | `Dart Profile Tracker — statystyki darta z N01` | [ ] do review |

### Landing — `app/page.tsx`

| ID | Kontekst | Tekst | Review |
|----|----------|-------|--------|
| MSG-010 | Hero H1 | `Dart` + `Profile` + ` Tracker` | [ ] do review |
| MSG-011 | Hero subtitle | `Importuj mecze z N01, zobacz jak grasz naprawdę — średnie, checkout, forma, head-to-head. Prywatny profil, publiczne demo do obejrzenia przed rejestracją.` | [ ] do review |
| MSG-012 | CTA primary | `Zobacz profil demo` | [ ] do review |
| MSG-013 | CTA secondary | `Zaloguj się / Zarejestruj` | [ ] do review |
| MSG-014 | Demo note | `Demo: przykładowy profil gracza · {matchCount} spotkań` | [ ] do review |
| MSG-015 | Hero tile | `Meczów w demo` | [ ] do review |
| MSG-016 | Hero tile | `Start score` | [ ] do review |
| MSG-017 | Hero tile | `Import linkiem` | [ ] do review |
| MSG-018 | Hero tile | `vs przeciwnicy` | [ ] do review |
| MSG-019 | Features heading | `Co dostajesz` | [ ] do review |
| MSG-020 | Features sub | `Od linku N01 do profilu gracza` | [ ] do review |
| MSG-021 | Feature | `Import z N01` | [ ] do review |
| MSG-022 | Feature body | `Wklejasz link z n01darts.com — legi, lotki, checkouty. Bez ręcznego przepisywania po turnieju.` | [ ] do review |
| MSG-023 | Feature | `Analityka na serio` | [ ] do review |
| MSG-024 | Feature body | `Średnia ważona, first 9, forma, aktywność po dniach i godzinach, histogram checkoutów.` | [ ] do review |
| MSG-025 | Feature | `H2H i top listy` | [ ] do review |
| MSG-026 | Feature body | `Kto cię bije, kogo bijesz, najlepsze rzuty i finish — z meczów, nie z pamięci.` | [ ] do review |
| MSG-027 | Feature | `Share meczu` | [ ] do review |
| MSG-028 | Feature body | `Link do meczu z rzutem po rzucie. Profil zostaje prywatny (noindex).` | [ ] do review |
| MSG-029 | Demo block heading | `{matchCount} spotkań demo — bez konta` | [ ] do review |
| MSG-030 | Demo block body | `Pełna analityka na` + `przykładowym profilu demo` + `: statystyki, wykres formy, H2H i mecze z widokiem rzut po rzucie.` | [ ] do review |
| MSG-031 | Demo CTA | `Otwórz profil demo` | [ ] do review |
| MSG-032 | Demo link | `Przykładowy mecz` | [ ] do review |
| MSG-033 | Footer note | `Masz już dostęp?` + `/profile` + `(prywatny)` | [ ] do review |

### Login — `app/login/page.tsx` *(zaktualizowane w 1.1.0)*

| ID | Kontekst | Tekst | Review |
|----|----------|-------|--------|
| MSG-040 | Nav | `Strona główna` | [ ] do review |
| MSG-041 | H1 | `Konto gracza` | [ ] do review |
| MSG-042 | Intro | `Zaloguj się przez Google, zaimportuj mecze z N01…` + link demo | [ ] do review |
| MSG-043 | CTA demo | `Zobacz profil demo` | [ ] do review |
| MSG-044 | CTA Google | `Zaloguj się przez Google` | [ ] do review |
| MSG-045 | Błąd auth | `Logowanie nieudane. Zamknij kartę…` | [ ] do review |
| MSG-046 | ~~Zarejestruj~~ | usunięte (rejestracja = Google) | n/a |
| MSG-047 | ~~dev footer~~ | usunięte | n/a |

### Footer — `components/site-footer.tsx`

| ID | Tekst | Review |
|----|-------|--------|
| MSG-050 | `Dart Profile Tracker` | [ ] do review |
| MSG-051 | `Profil demo` | [ ] do review |
| MSG-052 | `Logowanie` | [ ] do review |
| MSG-053 | `Mój profil` | [ ] do review |
| MSG-054 | `© {year}` + `Sylveon Company` | [ ] do review |

### Demo banner — `components/demo-banner.tsx`

| ID | Tekst | Review |
|----|-------|--------|
| MSG-060 | `To` + `przykładowy profil demo` + `. Pełna analityka dostępna na wyciągnięcie ręki. Utwórz swoje konto, zaimportuj swoje mecze i śledź swoją formę.` | [ ] do review |
| MSG-061 | `Załóż konto` | [ ] do review |

### Demo profile — `app/demo/profile/page.tsx`

| ID | Tekst | Review |
|----|-------|--------|
| MSG-070 | `Strona główna` | [ ] do review |
| MSG-071 | `Załóż konto →` | [ ] do review |
| MSG-072 | Tagline (`demo-persona.ts`) | `Twój Dart Profile Tracker — Wszystkie Twoje statystyki z turniejów lokalnych w jednym miejscu.` | [ ] do review |

### Demo match — `app/demo/m/[shareToken]/page.tsx`

| ID | Tekst | Review |
|----|-------|--------|
| MSG-080 | `← Wróć do profilu demo` | [ ] do review |
| MSG-081 | `Załóż własne konto` | [ ] do review |

### Private profile — `app/profile/page.tsx`

| ID | Tekst | Review |
|----|-------|--------|
| MSG-090 | `Strona główna` | [ ] do review |
| MSG-091 | Fallback greeting | `Witaj,` | [ ] do review |
| MSG-092 | Fallback H1 | `Profil zawodnika` | [ ] do review |

### Profile header — `app/profile/profile-header.tsx`

| ID | Tekst | Review |
|----|-------|--------|
| MSG-100 | Greeting | `Witaj,` | [ ] do review |
| MSG-101 | Nickname | `„{nickname}"` | [ ] do review |

### Dodaj mecz — `app/profile/profile-add-match.tsx`

| ID | Kontekst | Tekst | Review |
|----|----------|-------|--------|
| MSG-110 | Tytuł sekcji | `Dodaj nowy mecz` | [ ] do review |
| MSG-111 | Opis | `Wklej link do swojego meczu z n01 — pobiorę dane, zrobię wyliczenia i uaktualnię Twój profil gracza.` | [ ] do review |
| MSG-112 | Toggle | `−` / `+` | [ ] do review |
| MSG-120 | Placeholder URL | `https://n01darts.com/n01/...` | [ ] do review |
| MSG-121 | Submit idle | `Pobierz dane` | [ ] do review |
| MSG-122 | Submit loading | `Pobieram…` | [ ] do review |
| MSG-123 | Demo CTA body | `Załóż konto i zacznij śledzić swoje statystyki. Dodasz swoje mecze, a my pokażemy Ci jak grasz.` | [ ] do review |
| MSG-124 | Demo CTA btn | `Załóż konto →` | [ ] do review |
| MSG-125 | Sukces | `Zapisano: {match.title}` | [ ] do review |
| MSG-126 | Sukces fallback | `Mecz zapisany` | [ ] do review |
| MSG-127 | Błąd fallback | `Import nieudany` | [ ] do review |
| MSG-128 | Overwrite błąd | `Nadpisanie nieudane` | [ ] do review |
| MSG-130 | Identity prompt | `Nie rozpoznano Cię automatycznie. Który gracz to Ty?` | [ ] do review |
| MSG-131 | Identity buttons | `{players[0]}` / `{players[1]}` | [ ] do review |
| MSG-132 | Identity reject | `Odrzuć — nie zapisuj` | [ ] do review |
| MSG-140 | Duplikat heading | `Ten mecz jest już w bazie` | [ ] do review |
| MSG-141 | Duplikat btn | `Nadpisz` | [ ] do review |
| MSG-142 | Duplikat link | `Zobacz istniejący` | [ ] do review |
| MSG-143 | Duplikat btn | `Anuluj` | [ ] do review |
| MSG-150 | Bulk tytuł | `Import hurtowy` | [ ] do review |
| MSG-151 | Bulk opis | `Wiele linków — jeden URL w każdej linii.` | [ ] do review |
| MSG-152 | Bulk placeholder | `https://n01darts.com/n01/league/...` (2 linie przykładu) | [ ] do review |
| MSG-153 | Bulk idle | `Importuj wszystkie` | [ ] do review |
| MSG-154 | Bulk progress | `Importuję… ({done}/{total})` | [ ] do review |
| MSG-155 | Bulk dup heading | `Duplikat: mecz już istnieje` | [ ] do review |
| MSG-156 | Bulk dup | `Nadpisz` | [ ] do review |
| MSG-157 | Bulk dup | `Nadpisz wszystkie` | [ ] do review |
| MSG-158 | Bulk dup | `Pomiń` | [ ] do review |
| MSG-159 | Bulk dup | `Pomiń wszystkie` | [ ] do review |
| MSG-160 | Bulk badge | `OK {n}` | [ ] do review |
| MSG-161 | Bulk badge | `Duplikat {n}` | [ ] do review |
| MSG-162 | Bulk badge | `Błąd {n}` | [ ] do review |
| MSG-163 | Bulk row icon | `…` | [ ] do review |
| MSG-164 | Bulk row icon | `✓` | [ ] do review |
| MSG-165 | Bulk row icon | `=` | [ ] do review |
| MSG-166 | Bulk row icon | `!` | [ ] do review |
| MSG-167 | Bulk row msg | `pominięto` | [ ] do review |
| MSG-168 | Bulk row msg | `nadpisano` | [ ] do review |
| MSG-169 | Bulk row msg | `wymaga wyboru gracza` | [ ] do review |
| MSG-170 | Bulk row msg | `błąd` | [ ] do review |

### Walidacja URL — `lib/n01-url.ts`

| ID | Tekst | Review |
|----|-------|--------|
| MSG-180 | `N01_URL_HINT` | `Wklej pełny adres URL meczu z n01darts.com (np. https://n01darts.com/n01/league/n01_view.html?tmid=…).` | [ ] do review |
| MSG-181 | `N01_ONLY_MESSAGE` | `Ups. Tutaj możesz nawrzucać, ale tylko mecze n01 🙈` | [ ] do review |

### Profile client — `app/profile/profile-client.tsx`

| ID | Tekst | Review |
|----|-------|--------|
| MSG-190 | `Ostatnie mecze` | [ ] do review |
| MSG-191 | `Ładuję mecze…` | [ ] do review |
| MSG-192 | `Brak meczów w tym zakresie` | [ ] do review |
| MSG-193 | `Dodaj pierwszy link z N01 powyżej.` | [ ] do review |
| MSG-194 | `Brak meczów w tym zakresie czasu.` | [ ] do review |
| MSG-195 | `Więcej spotkań ({count})` | [ ] do review |
| MSG-196 | `Wstecz` | [ ] do review |
| MSG-197 | `Strona {page+1} / {totalPages}` | [ ] do review |
| MSG-198 | `Dalej` | [ ] do review |
| MSG-199 | `Zwiń listę` | [ ] do review |
| MSG-19A | Fetch error (nie wyświetlane dziś) | `Błąd pobierania` | [ ] do review |

### Statystyki — `app/profile/profile-stats-block.tsx`

| ID | Tekst | Review |
|----|-------|--------|
| MSG-200 | `Statystyki zawodnika` | [ ] do review |
| MSG-201 | `{n} mecz` / `{n} meczów` | [ ] do review |
| MSG-202 | `30 dni` | [ ] do review |
| MSG-203 | `90 dni` | [ ] do review |
| MSG-204 | `180 dni` | [ ] do review |
| MSG-205 | `365 dni` | [ ] do review |
| MSG-206 | `Wszystko` | [ ] do review |
| MSG-207 | `Ładuję dane…` | [ ] do review |
| MSG-208 | `Brak meczów w tym zakresie.` | [ ] do review |
| MSG-209 | `3-DART AVG` | [ ] do review |
| MSG-210 | `FIRST 9 AVG` | [ ] do review |
| MSG-211 | `Win rate` | [ ] do review |
| MSG-212 | `{wins}W · {losses}L` | [ ] do review |
| MSG-213 | `LEGS WIN RATE` | [ ] do review |
| MSG-214 | `{legsWon}W · {legsLost}L` | [ ] do review |
| MSG-215 | `Mecze` | [ ] do review |
| MSG-216 | `60+` | [ ] do review |
| MSG-217 | `80+` | [ ] do review |
| MSG-218 | `100+` | [ ] do review |
| MSG-219 | `120+` | [ ] do review |
| MSG-220 | `140+` | [ ] do review |
| MSG-221 | `170+` | [ ] do review |
| MSG-222 | `180` | [ ] do review |
| MSG-223 | `High finish` | [ ] do review |
| MSG-224 | `100+ Finish` | [ ] do review |
| MSG-225 | `Best leg` | [ ] do review |
| MSG-226 | `Best leg avg` | [ ] do review |
| MSG-227 | `Checkout` | [ ] do review |
| MSG-228 | Brak danych | `—` | [ ] do review |

### Wykres formy — `app/profile/profile-form-chart.tsx`

| ID | Tekst | Review |
|----|-------|--------|
| MSG-230 | `Wykres formy` | [ ] do review |
| MSG-231 | Tooltip | `vs {oppName}` | [ ] do review |
| MSG-232 | Tooltip | `Avg` + `{average}` | [ ] do review |
| MSG-233 | Tooltip | `First 9` + `{first9}` | [ ] do review |
| MSG-234 | Tooltip win | `Wygrana` | [ ] do review |
| MSG-235 | Tooltip loss | `Przegrana` | [ ] do review |
| MSG-236 | Legenda | `3-dart avg` | [ ] do review |
| MSG-237 | Legenda | `First 9` | [ ] do review |
| MSG-238 | Legenda | `Śr. ogólna: {overallAvg}` | [ ] do review |

### Ostatnie 5 — `app/profile/profile-recent-matches.tsx`

| ID | Tekst | Review |
|----|-------|--------|
| MSG-240 | `Ostatnie 5 meczów` | [ ] do review |
| MSG-241 | `{wins}W · {losses}L` | [ ] do review |
| MSG-242 | Badge | `W` / `L` / `–` | [ ] do review |

### Top listy — `app/profile/profile-top-lists.tsx`

| ID | Tekst | Review |
|----|-------|--------|
| MSG-250 | `Top 10 najczęstszych podejść` | [ ] do review |
| MSG-251 | `Top 10 najczęstszych zamknięć` | [ ] do review |
| MSG-252 | Suffix | `×{count}` | [ ] do review |

### Head-to-head — `app/profile/profile-head-to-head.tsx`

| ID | Tekst | Review |
|----|-------|--------|
| MSG-260 | `Head-to-head` | [ ] do review |
| MSG-261 | Select placeholder | `— wybierz przeciwnika —` | [ ] do review |
| MSG-262 | Select option | `{name} ({count} meczów)` | [ ] do review |
| MSG-263 | `Win` | [ ] do review |
| MSG-264 | `Win rate` | [ ] do review |
| MSG-265 | `Loss` | [ ] do review |
| MSG-266 | Header | `Ja` / `vs` / `{selected}` | [ ] do review |
| MSG-267 | Row labels | `Mecze`, `Avg`, `First 9`, `Legi`, `Checkout`, `100+`, `140+`, `180` | [ ] do review |
| MSG-268 | Empty | `Brak meczów z tym przeciwnikiem w wybranym zakresie.` | [ ] do review |

### Aktywność — dni — `app/profile/profile-activity.tsx`

| ID | Tekst | Review |
|----|-------|--------|
| MSG-270 | `Aktywność — dni tygodnia` | [ ] do review |
| MSG-271 | Dni (`lib/stats.ts`) | `Pon`, `Wt`, `Śr`, `Czw`, `Pt`, `Sob`, `Nd` | [ ] do review |
| MSG-272 | Bar (1 mecz) | `{n} mecz` | [ ] do review |
| MSG-273 | Bar (≠1) | `{n} meczów` | [ ] do review |
| MSG-274 | Pusty | `–` | [ ] do review |
| MSG-275 | Suffix | `{avg} avg` | [ ] do review |

### Aktywność — godziny — `app/profile/profile-activity-hours.tsx`

| ID | Tekst | Review |
|----|-------|--------|
| MSG-280 | `Aktywność — godziny` | [ ] do review |
| MSG-281 | Etykiety | `{HH}-{HH+1}` | [ ] do review |
| MSG-282 | Bar | `{n} mecz` / `{n} meczów` | [ ] do review |
| MSG-283 | Suffix | `{avg} avg` | [ ] do review |

### Histogram checkoutów — `app/profile/profile-checkout-distribution.tsx`

| ID | Tekst | Review |
|----|-------|--------|
| MSG-290 | `Histogram zamknięć` | [ ] do review |
| MSG-291 | Zakresy | `2–20`, `21–40`, `41–60`, `61–80`, `81–100`, `101–120`, `121–140`, `141–170` | [ ] do review |
| MSG-292 | Overlay | `{n} prób` | [ ] do review |
| MSG-293 | Rate | `{rate}% ({hits}/{attempts})` | [ ] do review |
| MSG-294 | Pusty | `–` | [ ] do review |

### Karta meczu — `app/profile/profile-match-card.tsx`

| ID | Tekst | Review |
|----|-------|--------|
| MSG-300 | Badge | `W` / `L` | [ ] do review |
| MSG-301 | KPI labels | `3-dart`, `First 9`, `60+`, `80+`, `100+`, `120+`, `140+`, `170+`, `180`, `High fin.`, `100+ fin.`, `Best leg`, `Worst leg`, `Checkout` | [ ] do review |
| MSG-302 | Link | `Rzut po rzucie →` | [ ] do review |
| MSG-303 | Share idle | `Udostępnij mecz` | [ ] do review |
| MSG-304 | Share copied | `Skopiowano` | [ ] do review |

### Widok meczu — `app/m/[shareToken]/match-view.tsx`

| ID | Tekst | Review |
|----|-------|--------|
| MSG-310 | Nav | `Wróć do profilu` | [ ] do review |
| MSG-311 | Share idle | `Udostępnij ten mecz` | [ ] do review |
| MSG-312 | Share copied | `Skopiowano link` | [ ] do review |
| MSG-313 | Score sub | `avg {average}` | [ ] do review |
| MSG-314 | Section | `Details` | [ ] do review |
| MSG-315 | KPI labels | `First 9`, `60+`, `80+`, `100+`, `120+`, `140+`, `170+`, `180`, `High finish`, `100+ fin.`, `Best leg`, `Worst leg`, `Checkout` | [ ] do review |
| MSG-316 | Section | `Rzut po rzucie` | [ ] do review |
| MSG-317 | Leg header | `Leg {index}` | [ ] do review |
| MSG-318 | Winner | `{winnerName}` + ` · {darts} {dartWord}` | [ ] do review |
| MSG-319 | Leg avg | `avg Ja` / `avg Opp` | [ ] do review |
| MSG-320 | Table headers | `#`, `Ja`, `left`, `Opp`, `left` | [ ] do review |
| MSG-321 | Empty visit | `—` | [ ] do review |
| MSG-322 | Checkout suffix | ` ✓{darts}` | [ ] do review |
| MSG-323 | Bust suffix | ` ×` | [ ] do review |

### Odmiana lotek — `lib/stats.ts` (`dartWord`)

| ID | Tekst | Review |
|----|-------|--------|
| MSG-330 | darts=1 | `lotka` | [ ] do review |
| MSG-331 | darts 2–4 | `lotki` | [ ] do review |
| MSG-332 | inne | `lotek` | [ ] do review |

### OG image — `app/opengraph-image.tsx`

| ID | Tekst | Review |
|----|-------|--------|
| MSG-340 | Tagline | `Statystyki darta · import N01` | [ ] do review |
| MSG-341 | Title | `Dart Profile Tracker` | [ ] do review |
| MSG-342 | Subtitle | `Import N01 · forma · H2H · checkout` | [ ] do review |
| MSG-343 | Stat labels | `MECZÓW DEMO`, `START`, `IMPORT` | [ ] do review |
| MSG-344 | Domain | `dart.sylveoncompany.pl` | [ ] do review |

### API → UI — `app/api/**`

| ID | Route / status | Tekst | Review |
|----|----------------|-------|--------|
| MSG-400 | ingest 400 | `Nieprawidłowy JSON` | [ ] do review |
| MSG-401 | ingest 400 | `Podaj URL meczu z n01darts.com` | [ ] do review |
| MSG-402 | ingest 422 fallback | `Import nieudany` | [ ] do review |
| MSG-403 | ingest 422 passthrough | `{Error.message}` z backendu | [ ] do review |
| MSG-410 | matches 500 fallback | `Błąd pobierania meczów` | [ ] do review |
| MSG-411 | matches 500 passthrough | `getMyMatches: {supabase msg}` | [ ] do review |
| MSG-420 | customer 404 | `Customer not found` | [ ] do review |
| MSG-421 | customer 500 | `Unknown error` | [ ] do review |

### Błędy ingest — `lib/matches.ts` (w UI przez MSG-403)

| ID | Tekst | Review |
|----|-------|--------|
| MSG-430 | validateTmid | `URL nie zawiera prawidłowego tmid` | [ ] do review |
| MSG-431 | timeout | `N01 nie odpowiada (timeout). Spróbuj za chwilę.` | [ ] do review |
| MSG-432 | 404 | `N01 nie zna tego meczu (404).` | [ ] do review |
| MSG-433 | wrapper | `Import z N01 nieudany: {originalMessage}` | [ ] do review |
| MSG-434 | save guard | `Nie można zapisać meczu bez potwierdzonej tożsamości gracza` | [ ] do review |

### Błędy parsera — `lib/n01-parser.ts` (w UI przez MSG-433)

| ID | Tekst | Review |
|----|-------|--------|
| MSG-440 | brak tmid | `Brak parametru tmid w URL` | [ ] do review |
| MSG-441 | zły host | `URL musi pochodzić z n01darts.com` | [ ] do review |
| MSG-442 | API status | `n01 API zwróciło {status}` | [ ] do review |
| MSG-443 | backup JSON | `Backup JSON: {message}` | [ ] do review |
| MSG-444 | backup HTML | `Backup HTML: {message}` | [ ] do review |

### Komunikaty przeglądarki (poza kodem — do obejścia w 1.0.2)

| ID | Kontekst | Tekst | Review |
|----|----------|-------|--------|
| MSG-450 | HTML `type=url` + invalid | `Wprowadź adres URL` (browser PL) | [ ] do review |
| MSG-451 | Bulk client (ang.) | `invalid url` | [ ] do review |

### Notatki do review

1. **Mieszanka PL/EN** — wiele KPI po angielsku (`Win rate`, `First 9`, `Details`, `Checkout`, `avg`, `left`, `Opp`) — decyzja w **1.0.2.7**.
2. **MSG-403 / 433** — user dziś widzi surowe błędy techniczne (tmid) — priorytet fix w **1.0.2.3–4**.
3. **MSG-169** — bulk `wymaga wyboru gracza` zamiast modala — UX fix w **1.0.2.4** + **1.1.3.5**.
4. **MSG-132** — „Odrzuć" powinien być destructive (czerwony) — **1.0.2.x**.
5. Brak własnego `not-found.tsx` — Next.js default 404 (framework, nie w repo).

---

## Dziennik zmian


| Wersja     | Data       | Co zrobiono                                                                                                                                                                                                                                                                                                         |
| ---------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **roadmap** | 2026-07-17 | Plan **1.1.9**: obowiązkowy formularz po Google (imię/nazwisko prefill, nick, `known_nicknames`), gate ingest przy braku danych, edycja w profilu, placeholder CTA „Włącz wyższy bieg — konto premium”. Bez kodu — tylko roadmapa. |
| **1.1.0**  | 2026-07-15 | **Auth core wydany.** Google OAuth server-side (`/api/auth/google` + PKCE), callback z cookies sesji, sync customer, onboarding, middleware, RLS (`20260715210000_…`). Identity none/ambiguous + bulk. Dev iPhone: Site URL = LAN IP. Seed → `SEED_CUSTOMER_ID` + `OWNER_EMAIL`. Tag `v1.1.0`. |
| **1.0.1**  | 2026-07-14 | **Feedback po testach manualnych.** Pełna inwentaryzacja copy klienta (~245 MSG) w README — do review przed 1.0.2.x. Bez zmian w kodzie UI. |
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

