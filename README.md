# Cursor_DartStats

**Sylveon Dart Profile** — prywatny panel statystyk darta, budowany w Next.js 16.
Docelowo pod `dart.sylveoncompany.pl`.

> **Status:** **v1.4.0** na `main` · dev **`cursor/v1.4.x`** (ta sama linia, kolejne commity).  
> Backup milestone: `backup/v1.3.0`, tag `v1.3.2`. Bieżący release: tag **`v1.4.0`**. Wcześniej: `backup/v1.2.0`, tag `v1.2.0-backup`.  
> **Backlog otwarty** (rosnąco po ID): patrz [Backlog otwarty](#backlog-otwarty--rosnąco-po-id). Przed implementacją — potwierdź zakres.

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
10. [Status / Roadmapa](#status--roadmapa) (w tym [Backlog otwarty](#backlog-otwarty--rosnąco-po-id))
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
- **Docelowo freemium SaaS** (limity jako **konfiguracja**, nie na sztywno w kodzie — patrz **2.0.x**; **startujemy bez premium / płatności**):
  - Free: domyślnie N meczów (start: 3), **wybrane** statystyki widoczne
  - Premium: pełny limit meczów, **wszystkie** wykresy i sekcje
  - Płatność: PayNow/PayU (polska bramka, PLN) — dopiero w **2.0.x** (po audycie **1.0.1.x**)
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
  nickname        text,                          -- pseudonim główny: "Groteł"
  known_nicknames text[],                        -- ["Grotkowski", "Groteł"] — auto-detect N01
  role            text DEFAULT 'user',           -- 'user' | 'premium' | 'admin' | 'superadmin'
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
)
```

**Wyświetlanie:** UI skleja `first_name` + `nickname` + `last_name` przez `formatCustomerDisplayName()` w `lib/customer.ts`. **Bez kolumny `display_name` w DB** (usunięta — migracja `20260721210000_drop_customer_display_name.sql`).

**Detekcja N01:** `autoDetectPatterns()` w `lib/customer.ts` — **zawsze** `lastName` + `nickname` (+ opcjonalne `known_nicknames`). Pseudonimy N01 **nie** są wymagane do zamknięcia gate’u 1.1.9.

**Share token:** nowe mecze → 16 hex (~64 bit) z `computeShareToken()`; starsze w DB mogą mieć krótsze tokeny (8 znaków).

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
  share_token     text UNIQUE,                   -- nowe: 16 hex; legacy: 8 znaków
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

**STRICT MODE** (wzorce z `autoDetectPatterns`: nazwisko + nick główny + `known_nicknames`, np. `Grotkowski`, `Groteł`, `Grotel`):

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

| Prefiks     | Znaczenie                                      | Status |
| ----------- | ---------------------------------------------- | ------ |
| **0.x.x**   | Prace historyczne (bootstrap → demo)           | ✅ zamknięte w **1.0.0** |
| **1.0.0**   | Release milestone — backup na GitHub           | ✅ `backup/v1.0.0`, tag `v1.0.0-backup` |
| **1.0.1**   | Feedback — inwentaryzacja copy                 | ✅ **wydany** |
| **1.0.1.x** | Prod, audyt, deploy, dokumenty prawne          | ⏳ |
| **1.0.2.x** | Copy / teksty UI (fix po Twojej akceptacji)   | ⏳ |
| **1.1.x**   | Auth + multi-user + admin + profil tożsamości  | ✅ **v1.1.0** auth · ✅ **v1.1.1** (1.1.9 + 1.1.10) · ✅ **1.1.7** · ✅ **1.1.3.8** · otwarte **1.1.8**, **1.1.11–12** |
| **1.2.x**   | Milestone snapshot (profil UX + audyt + delete) | ✅ **v1.2.0** — `backup/v1.2.0`, tag `v1.2.0-backup` |
| **1.3.x**   | Testy + hardening + perf                       | ✅ **v1.3.2** — `backup/v1.3.0`, tag `v1.3.2` |
| **1.4.x**   | Prod polish + deploy track                   | ✅ **v1.4.0** na `main` — favicon Sylveon, landing kafelki, docs OAuth |
| **2.0.x**   | Premium + płatności                            | ⏸️ odłożone — start bez tego |
| **5.x**     | Pełne wydanie produktu (odłożone)              | ⏸️ po 1.x / 2.x — m.in. **Apple login** |

Subtaski: czwarty poziom, np. **1.1.9.1**.

**Zasada list:** w roadmapie i backlogu pozycje zawsze **rosnąco po ID**. Nie mieszamy numerów (np. **1.1.9 ≠ dokumenty prawne** — to profil tożsamości; prawo = **1.0.1.6**).

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

**Anulowane (analityka turniejowa — bez potrzeby):**

- [x] **0.3.14** ❌ **Porównanie sesji / turniejów** — anulowane
- [x] **0.3.15** ❌ **Grupowanie meczów po turnieju** — anulowane
- [x] **0.3.16** ❌ **Trendy per turniej** — anulowane
- [x] **0.3.17** ❌ **Filtr sezon** — anulowane
- [ ] **0.3.18** → przeniesione do **1.3.6** (batch loading, limit 1000 Supabase)

> ~~Priorytet niższy niż Auth i prod.~~ **2026-07-21:** wykreślone z roadmapy — brak potrzeby.

- [x] **0.3.19** Wykres formy: tooltip po indeksie, data+godzina, opp, W/L
- [x] **0.3.20** Aktywność dni/godziny — układ poziomy, fix mobile
- [x] **0.3.21** Kolory bucketów w kartach + Details
- [x] **0.3.22** `BEST LEG AVG` — kafel w statystykach głównych

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

### 1.0.0 — Release ✅ WYDANY (2026-07-14)

Pełny stan projektu zamrożony poza `main`:

- Branch: `[backup/v1.0.0](https://github.com/grotkowski9/Cursor_DartStats/tree/backup/v1.0.0)`
- Tag: `v1.0.0-backup`
- Zawiera: profil prywatny (51 meczów), pełna analityka, demo publiczne + snapshot, landing, SEO

---

### 1.0.1 — Feedback po testach manualnych ✅ WYDANY (2026-07-14)

> Checkpoint po **1.0.0** i ręcznych testach UI. **Bez zmian w kodzie copy** — tylko pełna lista komunikatów frontowych do Twojego review.

- [x] **1.0.1.0** Inwentaryzacja copy — ~245 pozycji MSG (patrz [Inwentaryzacja copy klienta](#inwentaryzacja-copy-klienta))
- [x] **1.0.1.0** Znane problemy copy/UX — tabela w **1.0.2.x** (tmid w UI, bulk identity, przycisk Odrzuć)
- [ ] **1.0.1.0** Twoja akceptacja tekstów — checkbox `[ ] do review` przy każdym MSG

**Workflow dalej:** przechodzisz MSG-y w README → podajesz docelowe copy → **1.0.2.x** implementacja.

---

### 1.0.1.x — Po release: audyt, bezpieczeństwo, prod, prawo ⏳

> Domknięcie na produkcji + checklist pod RODO i przyszłą bramkę płatności.

- [x] **1.0.1.1** **Audyt prod — robots & indeksacja** *(kod 2026-07-26; sitemap rozszerzony 2026-08-08)*
  - [x] `/profile`, `/m/*`, `/api/*`, `/auth/` — noindex (meta + `X-Robots-Tag` na wszystkich odpowiedziach middleware)
  - [x] `/demo/*`, `/`, `/login`, `/privacy` — indexowalne; demo bez PII Piotra
  - [x] `sitemap.xml` — publiczne URL-e: `/`, `/login`, `/privacy`, `/demo/profile`, `/demo/m/demo001–010` (`lib/sitemap-paths.ts`)
  - [ ] Search Console: property + submit `https://dart.sylveoncompany.pl/sitemap.xml` *(ops — po deployu)*
- [x] **1.0.1.2** **Audyt prod — wyciek danych** *(kod 2026-07-26)*
  - [x] Demo ≠ dane Piotra Grotkowskiego (osobny customer, snapshot)
  - [x] Share linki prywatne — brak listowania tokenów; nowe tokeny 16 hex (~64 bit)
  - [x] `.env` / klucze service_role tylko na serwerze
  - [x] Supabase Storage private; ścieżki snapshotów **nie** wychodzą do klienta (`toClientMatch`)
  - [x] `.dev/backup-*.json` z PII — wyjęte z gita + `.gitignore`
- [x] **1.0.1.3** **Audyt prod — API i ataki** *(kod 2026-07-26)*
  - [x] Rate limit na `/api/ingest` (per user + IP) oraz lookup `/m/*` (per IP)
  - [x] Brak SQL injection (parametryzowane zapytania — audit OK)
  - [x] CSP / security headers (middleware)
  - [x] Logi dostępu do share (`snapshot_access_log` na hit/miss)
  - [x] `dev-upsert` zablokowany w production
- [ ] **1.0.1.4** Deploy Vercel + env (`NEXT_PUBLIC_SITE_URL`, Supabase)
- [ ] **1.0.1.5** Custom domain (np. `dart.sylveoncompany.pl` — zmienna env, nie hardcode)
- [ ] **1.0.1.6** **Dokumenty prawne / RODO (publiczne)** — **przed płatnościami (2.0.3)**
  - [x] **1.0.1.6.1** **Polityka prywatności — strona `/privacy`** (treść wspólna z Sylveon Company; alias `/polityka-prywatnosci`; link w stopce) — **Google OAuth Branding:** Homepage `https://dart.sylveoncompany.pl` · Privacy Policy `https://dart.sylveoncompany.pl/privacy` (ta sama domena, bez redirectu na sylveoncompany.pl)
  - [ ] **1.0.1.6.2** Regulamin serwisu — strona `/terms`
  - [ ] **1.0.1.6.3** Cookies / informacja o plikach (sesja Auth) — strona lub sekcja; banner tylko jeśli faktycznie potrzebny
  - [ ] **1.0.1.6.4** Linki w stopce / login / onboarding — **częściowo ✅:** `/privacy` w `SiteFooter` (wszystkie strony z stopką); landing: widoczna linia opisu appki nad stopką (wymóg Google Branding)
  - [ ] **1.0.1.6.5** (wewnętrzne, nie w app) DPA Supabase + Vercel, rejestr czynności

**Checklist przed bramką płatności (2.0.x):** Auth + RLS (**1.1.x**), audyt (**1.0.1.1–5**), dokumenty prawne (**1.0.1.6**), usuwanie meczów (**1.1.7** ✅), usuwanie konta (**1.1.11**), audyt pentest light.

---

### 1.0.2.x — Copy i komunikaty klienta ⏳ (plan — **bez kodu na razie**)

> **Workflow:** przed wdrożeniem każdej podsekcji — **pytam Cię o docelowe copy** (lista komunikatów → Ty podajesz teksty PL → dopiero wtedy commit). Żadnych technicznych `throw Error(...)` w UI bez mapowania na ludzki język.

- [x] **1.0.2.0** **Inwentaryzacja copy** — ✅ w **1.0.1** ([pełna lista MSG](#inwentaryzacja-copy-klienta)). Ty zatwierdzasz słownik.
- [ ] **1.0.2.1** Landing `/` — nagłówki, CTA, tone of voice (dart-first)
- [ ] **1.0.2.2** Profil demo + banner — spójne komunikaty „to jest podgląd"
- [ ] **1.0.2.3** Formularz importu (single) — helper, sukces, błędy po polsku
- [ ] **1.0.2.4** Import hurtowy — te same reguły co single; **bez** suchego „wymaga wyboru gracza" w tabeli
- [x] **1.0.2.5** Empty states, loadery, 404 — **404/500 screens ✅** (`not-found` / `error` / `global-error` + auto-redirect `/`); empty states / loadery nadal ⏳
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

### 1.1.x — Auth + Multi-user + Admin + profil tożsamości

> **v1.1.0 (2026-07-15):** wydany core auth **1.1.1–1.1.6**.  
> **v1.1.1 (2026-07-21):** **1.1.9.1–4 ✅** + premium→**2.0.x** + **1.1.10** zakres zatwierdzony (docs). Otwarte: **1.1.8**, **1.1.11**. ✅ **1.1.7** (2026-07-26). Backup: `backup/v1.1.1`, tag `v1.1.1-backup`.  
> **v1.2.0 (2026-07-26):** snapshot — delete match, audyt, polish profilu. Backup: `backup/v1.2.0`, tag `v1.2.0-backup`.

- [x] **1.1.1** Supabase Auth (**Google** login) — `/login`, `/api/auth/google`, `/auth/callback`, `/auth/signout`, `@supabase/ssr`
  - OAuth start po stronie serwera (PKCE cookies); callback zapisuje sesję na redirect
  - Dev z telefonu: Site URL w Supabase = `http://<IP-Maca>:3000` (nie `localhost` na iPhonie)
  - ⏸️ **Apple Sign In** → **5.0.1**
- [x] **1.1.2** Sync `auth.uid()` → `customer_id` — `ensureCustomerForUser()`; `OWNER_EMAIL` → `SEED_CUSTOMER_ID`
- [x] **1.1.3** Onboarding + detekcja gracza przy imporcie
  - [x] **1.1.3.1** Ekran `/onboarding` — imię, nazwisko, nick, `known_nicknames` *(bazowy UI; hardening = **1.1.9**)*
  - [ ] **1.1.3.2** Testy scenariuszy auto-detect → Vitest **1.3.2**
  - [x] **1.1.3.3** UI `ambiguous` — wybór slotu N01 (podświetlenie „Ty?")
  - [x] **1.1.3.4** UI `none` — 2 kroki: potwierdź → wybierz gracza / odrzuć
  - [x] **1.1.3.5** Bulk import: modal przy `none`/`ambiguous`
  - [x] **1.1.3.6** Duplikat — import pojedynczy: Nadpisz / Zobacz / Pomiń
  - [x] **1.1.3.7** Duplikat — bulk: Pomiń wszystkie / Nadpisz wszystkie
  - [x] **1.1.3.8** **Samouczek** — opcjonalny tour
    - [x] Na `/demo/profile` (`?tour=1` / przycisk „Pokaż samouczek”; gość: `localStorage`)
    - [x] Po nowym koncie: po Kroku 2 (zapisz/pomiń) → `/demo/profile?tour=1` (raz); CTA → `/profile`
    - [x] Flaga `tour_completed_at` na `customers`; zawsze można **Pomiń** (nie jest gate’em)
- [x] **1.1.4** Usunięcie runtime `DEFAULT_CUSTOMER_ID` — API wymaga sesji; seed → `SEED_CUSTOMER_ID`
- [x] **1.1.5** Middleware — `/profile`, `/onboarding`, `/api/*` tylko zalogowany (+ noindex); `/?code=` → `/auth/callback`
- [x] **1.1.6** RLS per user — migracja `20260715210000_auth_rls_per_user.sql` (zastosowana na Supabase)
- [x] **1.1.7** Usuwanie meczu przez usera
  - [x] **1.1.7.1** Przycisk / akcja „Usuń mecz" na karcie meczu w profilu
  - [x] **1.1.7.2** Triple-check: potwierdź → podsumowanie → wpisz `usuwam`
  - [x] **1.1.7.3** API `DELETE /api/matches/[id]` + cascade + RLS (ownership w API; DB cascade legs/visits/share_links; Storage + ingest_snapshots)
  - [ ] **1.1.7.4** Undo toast (nice-to-have — pominięte)
  - Usuwanie **konta** ≠ ten task → **1.1.11**
- [ ] **1.1.8** Panel admina superadmin (`/admin`)
  - [ ] **1.1.8.1** Lista userów (customers)
  - [ ] **1.1.8.2** Podgląd / usuwanie meczów dowolnego usera
  - [ ] **1.1.8.3** Ręczny backup DB (export JSON)
  - [ ] **1.1.8.4** Podgląd ingest / snapshot access log
  - [ ] **1.1.8.5** Ochrona route — tylko `role = superadmin`
- [x] **1.1.9** **Profil tożsamości** (domknięcie danych po Google — **nie** dokumenty prawne)
  - [x] **1.1.9.1** Obowiązkowy formularz po Google: imię, nazwisko (prefill), **pseudonim główny** (wymagany); Pseudonimy N01 **opcjonalne** (potwierdzenie przy pustym polu)
  - [x] **1.1.9.2** Prefill z Google przy tworzeniu customer (`ensureCustomerForUser` — `given_name`/`family_name`/`full_name`); **nie** prefilluj N01 nickami w pola imię/nazwisko (`isPlaceholderName` / `formNameFields`)
  - [x] **1.1.9.3** Gate na ingest: bez danych → `403 needs_onboarding` + redirect `/onboarding`
  - [x] **1.1.9.4** Edycja tych pól później w profilu (`ProfileIdentityEdit` + wspólny `IdentityForm`)
- [x] **1.1.10** **Opcjonalne pola profilu dartera** (po 1.1.9 — **nie** blokują importu) — **kod ✅** (2026-07-21…26); polish UX w **v1.2.0**

> Panel **1.1.8** = operacyjny (Ty). Premium / CTA upgrade / płatności = **2.0.x** (odłożone).

#### Gate vs soft CTA (agent — czytaj zanim ruszysz profil)

| Funkcja | Plik | Znaczenie |
| ------- | ---- | --------- |
| `needsOnboarding` | `lib/customer.ts` | Gate 1.1.9: **brak nicka** LUB **placeholder** imię/nazwisko → `/onboarding`. **Nie** wymaga `known_nicknames`. |
| `needsAboutOnboarding` | `lib/customer.ts` | Po 1.1.9, bez `about_completed_at` → Krok 2 `/onboarding/about` (można **Pomiń**). |
| `needsAboutSoftCta` | `lib/customer.ts` | Soft CTA na `/profile`: **OR** — brakuje **któregokolwiek** z: city, dartBrand, dartWeightBucket, throwingHand, favoritePlayerId. **Wyłączone z checka:** `dartModel`, `knownNicknames`. |
| `autoDetectPatterns` | `lib/customer.ts` | lastName + nickname + knownNicknames (dedupe, lowercase). |

#### 1.1.10 — zatwierdzony zakres (2026-07-21) · wdrożony

> **Gate obowiązkowy = tylko 1.1.9** (`needsOnboarding` — nick + realne imię/nazwisko).  
> **Flow:** Login → Krok 1 (1.1.9) → **Krok 2 „O Tobie”** (zielony box zachęty + **Pomiń**) → samouczek **1.1.3.8** → `/profile`.  
> **Legacy (np. Groteł):** już po 1.1.9 → **nie gate**; soft CTA (`needsAboutSoftCta`) na `/profile` — klik → otwiera accordion + **scroll** do formularza.  
> **DB:** kolumny w **`customers`** (bez nowej tabeli).

##### UX

- [x] **1.1.10.0** ✅ Ekran **Krok 2 — O Tobie** po zapisie 1.1.9: zachęta + **Pomiń**; edycja na `/profile`; soft CTA (`needsAboutSoftCta` — OR po polach, nie tylko `about_completed_at`)

##### A. Kontekst lokalny

- [x] **1.1.10.1** ✅ Miasto — **autocomplete** z whitelisty PL po ≥3 literach (`data/pl-cities.json`); bez free-text random
- [x] **1.1.10.2** ❌ Klub / pub / venue — odrzucone
- [x] **1.1.10.3** ❌ Federacja / liga — odrzucone

##### B. Sprzęt

- [x] **1.1.10.4** ✅ Marka lotek (select + **Inne…** → `dart_brand_other`; słownik w `data/dart-brands.json`)
- [x] **1.1.10.5** ✅ Model lotek (text)
- [x] **1.1.10.6** ✅ Waga lotek (select: `≤14`, `15`…`27`, `≥28`)
- [x] **1.1.10.7** ❌ Tip softip/steel — odrzucone
- [x] **1.1.10.8** ❌ Shaft / flight — odrzucone
- [x] **1.1.10.9** ❌ Board w domu — odrzucone

**Marki (1.1.10.4) — lista + uzasadnienie:** Target, Winmau, Mission, Red Dragon, Unicorn, Shot Darts, One80, Cosmo Darts, Dynasty, Bull's, Harrows, Designa, Bottelsen, CUESOUL, Trinidad, Loxley, **Inne…**.  
~16 marek pokrywa ~95% tego, co widać na ligach PL / PDC; dłużej = scroll hell. Bez live scrape sklepów. „Inne” łapie resztę.

##### C. Styl gry

- [x] **1.1.10.10** ✅ Ręka (L / P)
- [x] **1.1.10.11** ❌ Stance — odrzucone
- [x] **1.1.10.12** ❌ Ulubiony checkout (pytanie) — odrzucone (ew. z meczów)
- [x] **1.1.10.13** ❌ Cel treningowy — odrzucone

##### D. Fandom

- [x] **1.1.10.14** ✅ Ulubiony zawodnik — searchable select, **~50 popularnych** (nie czysty OoM); UI sort **A–Z**; JSON `data/favorite-players.json` z `tier`: `current` | `icon` | `rising_pl`
- [x] **1.1.10.15** ❌ Ulubiony turniej oglądany — odrzucone
- [x] **1.1.10.16** ❌ Bohater PL (osobne pole) — odrzucone *(PL w liście .14)*

**Lista ~50 (szkic na wdrożenie .14):** Humphries, Littler, van Gerwen, Cross, Price, M. Smith, Heta, Clayton, Aspinall, Van den Bergh, Noppert, Rock, Bunting, Dobey, Searle, R. Smith, G. Anderson, Wade, Cullen, van Duijvenbode, Schindler, van Veen, De Decker, Joyce, Edhouse, Menzies, Gurney, Ratajski, **Wright**, **Chisnall**, **Bialecki**, van Barneveld, Taylor, A. Lewis, + dopięcie do 50 przy implementacji. Must-have poza top OoM: Wright, Chisnall, Bialecki.

##### E. Doświadczenie

- [x] **1.1.10.17** ❌ Od kiedy grasz — odrzucone
- [x] **1.1.10.18** ❌ Poziom self-report — odrzucone
- [x] **1.1.10.19** ❌ Częstotliwość gry — odrzucone

##### F. Społeczność / zgody

- [x] **1.1.10.20** ❌ Discord / IG — odrzucone
- [x] **1.1.10.21** ✅ Widoczność danych do porównań społeczności: **zawsze włączone** w UI (brak toggle „wyłącz”). Nota wewnętrzna: kiedyś `role=premium` odblokuje wyłączenie — **zero copy o premium na stronie teraz**. Kolumna `profile_stats_visible boolean DEFAULT true`.
- [x] **1.1.10.22** ✅ Newsletter / tipy — opt-in (domyślnie off) + zachęta w stylu: „Czasem konkret — np. wynik Twojego ulubionego zawodnika. Bez spamu.” Kolumna `newsletter_opt_in boolean DEFAULT false`.

##### G. Ciekawostki (nie formularz)

- [x] **1.1.10.23** ✅ Epic ciekawostek z danych (bez pytań w formularzu)
  - [x] **1.1.10.23.1** ✅ Top passa wygranych (W) — **w siatce stats** (`ProfileStatsBlock`, label **Best winning streak**, sub **Lifetime**; niezależne od filtra 30/90/180/365/all). `data-tour="insight-streak"`. Fetch: `/api/customer/insights` w `ProfileClient`.
  - [x] **1.1.10.23.2** ✅ Avg przy Twojej wadze lotek vs inni z tym samym bucketem — osobna sekcja `ProfileInsights` (tylko cohort); **ukryte** do `min_cohort_size` (start: **5**)

**Nie zbieramy:** PESEL, telefon, dokładny adres, data urodzenia; live scrape sklepów / PDC przy formularzu.

##### Kolumny `customers` (migracja przy 1.1.10)

```text
city                   text          -- 1.1.10.1 (whitelist)
dart_brand             text          -- 1.1.10.4 (id słownika lub 'other')
dart_brand_other       text          -- gdy Inne
dart_model             text          -- 1.1.10.5 (NIE w needsAboutSoftCta)
dart_weight_bucket     text          -- 1.1.10.6 ('14-' … '28+')
throwing_hand          text          -- 1.1.10.10 ('L' | 'R')
favorite_player_id     text          -- 1.1.10.14
profile_stats_visible  boolean NOT NULL DEFAULT true   -- 1.1.10.21
newsletter_opt_in      boolean NOT NULL DEFAULT false  -- 1.1.10.22
about_completed_at     timestamptz   -- Krok 2 zapis/Pomiń; soft CTA = needsAboutSoftCta (pola), nie tylko ta kolumna
tour_completed_at      timestamptz   -- 1.1.3.8 — auto-tour tylko raz
```

Ref JSON: `data/pl-cities.json`, `data/dart-brands.json`, `data/favorite-players.json`.

- [ ] **1.1.11** **Usuwanie konta** (RODO / po **1.0.1.6** — **≠** 1.1.7)
  - [ ] Na **samym dole** `/profile` (pod listą meczów) tekst/link: **„nieodwracalnie usuń konto i wszystkie powiązane z nim dane”**
  - [ ] Potwierdzenie destrukcyjne → kasacja customer + mecze/snapshoty + `auth.users` → wylogowanie
  - Status: ⏳ docs — implementacja później

- [ ] **1.1.12** **Punkty gracza** (motywacja — **stawki TBD**, osobna decyzja)
  - Cel: zbieranie punktów za aktywność i uzupełnianie profilu
  - Szkielet: saldo + ledger zdarzeń; silnik przy akcjach (import meczu, Krok 1, pola „O Tobie”, …); UI salda na profilu; ranking/nagrody później
  - **Stawki: nieustalone** (placeholder w docs — nie hardcodować finalnych wartości bez decyzji)
  - Na Kroku 2 copy może **zapowiadać** punkty („wkrótce”) bez przyznawania
  - Status: ⏳ docs only — implementacja później

- [x] **1.1.13** **Edycja meczu** ✅ (2026-07-26, po v1.2.0)
  - [x] **1.1.13.1** Przycisk „Edytuj mecz” na karcie (żółty/amber; mniejszy; w jednym rzędzie z Rzut/Share/Usuń)
  - [x] **1.1.13.2** Dialog 3 kroki (`match-edit-dialog.tsx`):
    1. Na pewno edytować?
    2. Co zmienić? — checkboxy **Zmiana stron** i/lub **Zmiana nazwy przeciwnika** (+ formularze)
    3. Potwierdź diff (było → będzie) → Zapisz
  - [x] **1.1.13.3** API `PATCH /api/matches/[id]` + `updateMatchEdit()` — **zapis do DB** (`player_index`, `players` JSON, `opponent_name`, denorm KPI). **Bez** przepisywania legs/visits (sloty 0/1 w wizytach zostają).
  - [x] **1.1.13.4** Po sukcesie: odpowiedź `{ match }` → `ProfileClient` podmienia wpis w state (bez full reload). Persist = tak; „lokalnie” = tylko UI state.
  - Poza zakresem: bulk rename przeciwnika we wszystkich meczach; zmiana wyniku/wizyt/daty; edit w demo

**Akcje na karcie meczu (kolejność / kolory):**
- **Rzut po rzucie** — niebieski (`accent-from`, jak 100+), ikona strzałki z przodu
- **Udostępnij mecz** — fiolet (`accent-to`, jak 140+)
- **Edytuj mecz** — yellow/amber, mniejszy
- **Usuń mecz** — czerwony, mniejszy

---

### 1.2.0 — Milestone ✅ WYDANY (2026-07-26)

> Snapshot po **1.1.7**, audycie **1.0.1.1–3** i polishu profilu / onboarding copy.  
> Premium + płatności nadal w **[2.0.x](#20x--premium--płatności--)**.

- Branch: `[backup/v1.2.0](https://github.com/grotkowski9/Cursor_DartStats/tree/backup/v1.2.0)`
- Tag: `v1.2.0-backup`
- Commit bazowy: `9b23402` (feature branch `cursor/delete-match-1.1.7`)

#### Co weszło w v1.2.0 (dla agenta)

**1.1.7 — Usuwanie meczu**
- `DELETE /api/matches/[id]` — auth + ownership; cascade DB + Storage + ingest_snapshots
- UI: `match-delete-dialog.tsx` (triple-check: potwierdź → summary → wpisz `usuwam`)
- `ProfileMatchCard` + optimistic remove w `profile-client.tsx`
- `matchId` na `N01Match`; `deleteMatch()` w `lib/matches.ts`
- Undo toast (**1.1.7.4**) — **pominięte**

**1.0.1.1–3 — Audyt (kod)**
- `lib/rate-limit.ts` — ingest (user+IP), `/m/*` (IP)
- `lib/security-headers.ts` + middleware / `next.config.ts`
- `lib/match-client.ts` — `toClientMatch` / `toClientMatches` strip `snapshotPath`, `htmlSnapshotPath`, `rawPayload`
- Share: nowe tokeny 16 hex; `snapshot_access_log` na `/m/[shareToken]`
- `dev-upsert` zablokowany w production
- `.dev/backup-*.json` **wyjęte z gita** (PII) + `.gitignore` `.dev/*.json`

**Profil — layout UX**
- `ProfileShell` — wspólny stan accordion edycji + soft CTA
- Soft CTA u góry (`ProfileSoftCta`): klik → `setEditOpen(true)` + **smooth scroll** do `ProfileIdentityEdit`
- Panel edycji: najpierw **AboutForm** (zielony box zachęty jak na Kroku 2) + „Zapisz profil”; identity pod **„Zmień dane identyfikacyjne”** (domyślnie zwinięte); submit identity: **„Zapisz dane identyfikacyjne”**
- Usunięty kompaktowy `profile-recent-matches.tsx` — lista **5** kart `ProfileMatchCard` tuż pod wykresem formy + „Więcej spotkań” (paginacja)
- Best winning streak w dolnej siatce stats (obok Checkout); sub **Lifetime**; weight cohort zostaje w `ProfileInsights`

**Tożsamość / About — logika i copy**
- `needsOnboarding` = nick + nie-placeholder imię/nazwisko (nie pusty `knownNicknames`)
- `needsAboutSoftCta` = OR po city/brand/weight/hand/favorite (bez modelu i N01 nicków)
- `autoDetectPatterns` zawsze lastName + nickname + knownNicknames
- Identity: placeholdery bez prefillu N01; Pseudonimy N01 opcjonalne z confirmation przy pustym
- About: copy newsletter/helperów; submit edit = „Zapisz profil”

#### Layout `/profile` (kolejność sekcji)

```text
nav → ProfileHeader → Soft CTA (opcjonalnie)
→ ProfileClient:
    Add match → Stats (+ streak Lifetime) → Insights cohort (opcjonalnie)
    → Form chart → Ostatnie mecze (5 kart + więcej)
    → Top lists → H2H → Activity → Hours → Checkout dist
→ ProfileIdentityEdit (accordion na dole)
```

#### Otwarte po v1.2.0

- **1.0.1.4–6** deploy / domena / prawo
- **1.0.2.x** copy review
- **1.1.8** admin · **1.1.11** usuwanie konta · **1.1.12** punkty
- **1.3.x** testy · **2.0.x** premium (⏸️)

#### Po v1.2.0 na main (ten sam dzień) — **1.1.13**

> Kod na `main` = **v1.4.0**. Backup tag `v1.2.0-backup` **nie** zawiera edycji meczu — edycja = od v1.1.13 na `main`.

Zob. checklistę **1.1.13** wyżej (swap + rename, PATCH, UI).

---

### 1.3.x — Testy + Hardening + Perf ✅ (v1.3.2)

- [x] **1.3.1** Vitest — golden samples parsera N01 (`tests/n01-parser.test.ts`)
- [x] **1.3.2** Vitest — stats + bulk assemble (`tests/stats.test.ts`, `tests/matches-assemble.test.ts`)
- [ ] **1.3.3** Playwright w CI (`tests/e2e/smoke.spec.ts` lokalnie; nie w workflow)
- [x] **1.3.4** CI na PR (`typecheck`, `lint`, `test`, secret scan — `.github/workflows/ci.yml`)
- [ ] **1.3.5** Backup DB — procedura + harmonogram
- [x] **1.3.6** Perf: bulk `getMyMatches` + paginacja Supabase (fix limit 1000) · `GET /api/profile/bootstrap` (~37× vs N+1)
- [ ] **1.3.7** **Hardening pola importu meczów** (single + bulk):
  - [x] Demo: walidacja client (`lib/n01-url.ts`) — URL vs N01, komunikaty UX
  - [ ] Server-side whitelist + rate limit (prod)

**Wydane w 1.3.x** (tag `v1.3.2`, backup `backup/v1.3.0`): rebrand **Sylveon Dart Profile** · `/login` Google-only · `/logintest` ukryty (email dev, noindex) · landing refresh · demo pełne insights (streak + kohorta) · footer warunkowy · `SiteFooter` na `/profile`.

---

### 1.4.x — v1.4.0 na `main` ✅

> Branch: **`cursor/v1.4.x`** = dev · **`main`** = produkcja · `package.json` **1.4.0** · tag **`v1.4.0`**.

**Wydane w v1.4.0:** favicon set Sylveon (`sylveoncompany.pl`) · landing „Co dostajesz” — 3 kafelki w kolumnie · README: `/privacy` + Google OAuth Branding · prod: **`https://dart.sylveoncompany.pl`**

**Po v1.4.0 (1.4.x na `main`):** sitemap — `/privacy` + centralna lista publicznych URL (`lib/sitemap-paths.ts`) · landing — wyrównanie hero z sekcjami (`max-w-4xl`) · `<title>` / `og:title` — `Sylveon Dart Profile | Twoje statystyki darta` (Google OAuth Branding)

- Otwarte z backlogu: **1.0.1.4–6** (deploy env, domena ✅ prod, prawo — **1.0.1.6.1** ✅, **1.0.1.6.4** częściowo) · **1.0.2.x** (copy review) · **1.1.8**, **1.1.11–12** · domknięcie **1.3.3** (Playwright CI), **1.3.5**, **1.3.7**
- Nowe featury 1.4 — doprecyzuj w czacie przed implementacją

---

### 2.0.x — Premium + Płatności ⏸️

> **Odłożone.** Startujemy bez premium / płatności / CTA upgrade. Limity **konfigurowalne** — jeden plik/plan w DB, bez magic numbers w kodzie. *(Było: **1.2.x** + CTA **1.1.9.5**.)*

- [ ] **2.0.1** Model freemium — `lib/plan-limits.ts` (lub tabela `plan_tiers`):
  - `freeMaxMatches` — domyślnie 3, **zmienialne bez deployu**
  - `freeVisibleStats[]` / `premiumVisibleStats[]` — które kafle/wykresy widać
  - `freeFeatures[]` — np. bulk import tylko premium
- [ ] **2.0.2** UI limitów — soft block + CTA upgrade gdy przekroczony limit
- [ ] **2.0.3** Bramka płatności (PayNow lub PayU)
- [ ] **2.0.4** Role: user / premium / admin / superadmin
- [ ] **2.0.5** Panel admina — subskrypcje premium
- [ ] **2.0.6** Placeholder CTA w profilu: „Włącz wyższy bieg — konto premium” *(było **1.1.9.5**)*

---

### 5.x — Pełne wydanie produktu ⏸️ (odłożone — po zamknięciu 1.x / 2.x)

> **Nie teraz.** Dopiero gdy 1.x (auth, prod, copy, testy) i ewentualnie **2.0.x** (premium) będą domknięte. Numer **5.0** = milestone „pełna wersja”, nie kolejny krok po 1.3.

- [ ] **5.0.0** Milestone — pełne wydanie (kryteria doprecyzujemy przy 1.3)
- [ ] **5.0.1** **Logowanie Apple** — „Zaloguj przez Apple” obok Google (`Sign in with Apple` w Supabase + przycisk na `/login`)
  - Wymaga: konto Apple Developer, konfiguracja domeny, uwaga na ukryte e-maile Apple (relay)
- [ ] **5.x** Inne providery auth (opcjonalnie) — tylko jeśli biznesowo potrzebne

**Na dziś:** wystarczy **Google** (1.1.1). Apple nie jest w scope aż do **5.x**.

---

### Backlog otwarty — rosnąco po ID

> Jedyna tabela „co jest do zrobienia”. Sort **po numerze ID** (mały → duży). Przed startem implementacji — potwierdź zakres w czacie.

| ID | Status | Zadanie |
| -- | ------ | ------- |
| **0.3.14–17** | ❌ | Analityka turniejowa — **anulowane** (2026-07-21) |
| **1.0.1.1** | ✅ | Audyt prod — robots & indeksacja (kod; Search Console = ops) |
| **1.0.1.2** | ✅ | Audyt prod — wyciek danych (kod) |
| **1.0.1.3** | ✅ | Audyt prod — API i ataki (rate limit, CSP, access log) |
| **1.0.1.4** | ⏳ | Deploy Vercel + env |
| **1.0.1.5** | ⏳ | Custom domain |
| **1.0.1.6** | ⏳ | Dokumenty prawne: regulamin, cookies, DPA — **`/privacy` ✅ (1.0.1.6.1)** |
| **1.0.1.6.1** | ✅ | Polityka prywatności `/privacy` (+ alias `/polityka-prywatnosci`) — GCP Branding: homepage + privacy na `dart.sylveoncompany.pl` |
| **1.0.1.6.4** | ⏳ | Linki prawne — `/privacy` w stopce ✅; landing: linia opisu appki nad stopką (Google Branding) ✅ |
| **1.0.2.1–7** | ⏳ | Copy klienta (Twoje teksty → fix) |
| **1.1.3.2** | ⏳ | Testy auto-detect → Vitest (**1.3.2**) |
| **1.1.3.8** | ✅ | Samouczek: `/demo/profile` + auto po nowym koncie (skip ok) |
| **1.1.7** | ✅ | Usuwanie meczu (UI + API + triple-check; bez undo) |
| **1.1.8** | ⏳ | Panel admina superadmin |
| **1.1.9.1** | ✅ | Formularz obowiązkowy po Google (imię, nazwisko, nick, pseudonimy N01) |
| **1.1.9.2** | ✅ | Prefill z Google przy tworzeniu customer |
| **1.1.9.3** | ✅ | Gate na ingest bez danych → błąd + formularz |
| **1.1.9.4** | ✅ | Edycja pól tożsamości w profilu |
| **1.1.10.0** | ✅ | Krok 2 „O Tobie” + Pomiń + edycja `/profile` + soft CTA (`needsAboutSoftCta`) |
| **1.1.10.1** | ✅ | Miasto — autocomplete PL (≥3 litery) |
| **1.1.10.2–3** | ❌ | Klub, federacja — odrzucone |
| **1.1.10.4** | ✅ | Marka lotek (+ Inne) |
| **1.1.10.5** | ✅ | Model lotek |
| **1.1.10.6** | ✅ | Waga lotek |
| **1.1.10.7–9** | ❌ | tip / shaft / board — odrzucone |
| **1.1.10.10** | ✅ | Ręka L/P |
| **1.1.10.11–13** | ❌ | stance / checkout-pytanie / cel — odrzucone |
| **1.1.10.14** | ✅ | Ulubiony zawodnik (~50 popularnych) |
| **1.1.10.15–20** | ❌ | turniej / bohater / od kiedy / poziom / częst. / Discord — odrzucone |
| **1.1.10.21** | ✅ | Widoczność społeczności (zawsze on w UI; premium toggle później, bez copy) |
| **1.1.10.22** | ✅ | Newsletter opt-in (zachęta, zero spamu) |
| **1.1.10.23.1** | ✅ | Best winning streak w siatce stats (Lifetime; nie zależy od zakresu czasu) |
| **1.1.10.23.2** | ✅ | Ciekawostka: avg vs cohort wagi (ukryte do min N=5) |
| **v1.2.0** | ✅ | Milestone backup — delete + audit + polish profilu (`backup/v1.2.0`) |
| **1.1.11** | ⏳ | Usuwanie konta (copy na dole profilu; RODO) |
| **1.1.12** | ⏳ | Punkty gracza (szkielet; stawki TBD) |
| **1.1.13** | ✅ | Edycja meczu (swap + rename; PATCH do DB; 3 kroki) |
| **1.3.1** | ✅ | Vitest parser N01 |
| **1.3.2** | ✅ | Vitest stats + `matches-assemble` (bulk vs sequential) |
| **1.3.3** | ⏳ | Playwright smoke lokalnie; nie w CI |
| **1.3.4** | ✅ | CI: typecheck, lint, test, secret scan |
| **1.3.5** | ⏳ | Backup DB — procedura + harmonogram |
| **1.3.6** | ✅ | Perf bulk load + `/api/profile/bootstrap` + paginacja visits |
| **1.3.7** | ⏳ | Hardening importu server-side (client demo ✅) |
| **v1.3.2** | ✅ | Release `main` — landing, demo insights, footer, login split, rebrand |
| **v1.4.0** | ✅ | Release `main` — favicon Sylveon, landing kafelki pionowo, docs Google OAuth/`/privacy` |
| **1.4.x** | ⏳ | Kolejne commity na `cursor/v1.4.x` → merge `main` |
| **2.0.1–6** | ⏸️ | Freemium + płatności + role premium + CTA upgrade *(było 1.2.x + 1.1.9.5)* |
| **5.0.0** | ⏸️ | Milestone pełnego wydania |
| **5.0.1** | ⏸️ | Logowanie Apple |

**Uwaga numeracji:** **1.1.9** = profil tożsamości (gate). **1.1.10** = opcjonalne „O Tobie”. **1.0.1.6** = dokumenty prawne. **2.0.x** = premium / płatności (odłożone).

---

## Audyt bezpieczeństwa i prywatności (RODO)

> **Cel docelowy:** aplikacja na tyle solidna, żeby prawnik RODO w UE nie kręcił nosem, a integrator płatności (PayNow/PayU) nie odrzucił ze względu na oczywiste dziury. **Stan v1.2.0:** audyt kodu **1.0.1.1–3 ✅**; deploy/domena/prawo **1.0.1.4–6 ⏳**; auth+RLS **1.1.x ✅**.

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
| `/demo/*`, `/`, `/login`, `/privacy` | **index** (marketing / prawo) | brak noindex |
| Demo | Brak PII | snapshot + `DEMO_CUSTOMER_ID` |

**Weryfikacja prod:** curl/Google Search Console — upewnić się, że Google **nie** indeksuje profilu Piotra.

### Tytuł karty przeglądarki (`<title>`) — jeden wszędzie

**Reguła (od main po 1.0.0):** każda podstrona ma identyczny tytuł:

```text
Sylveon Dart Profile | Twoje statystyki darta
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
   - **Site URL (prod):** `https://dart.sylveoncompany.pl`
   - **Site URL (dev Mac):** `http://localhost:3000`
   - **Site URL (test iPhone w LAN):** `http://<IP-Maca>:3000` — inaczej Safari wraca na `localhost` (= telefon) i „brak odpowiedzi"
   - **Redirect URLs:**  
     `https://dart.sylveoncompany.pl/auth/callback`  
     `http://localhost:3000/auth/callback`  
     `http://<IP-Maca>:3000/auth/callback`
4. **`.env.local` / Vercel Production:** `NEXT_PUBLIC_SITE_URL=https://dart.sylveoncompany.pl` (prod) lub `http://localhost:3000` (dev); `OWNER_EMAIL=` Twój Gmail → seed 51 meczów
5. **Google Cloud → Auth Platform → Branding** (OAuth consent screen): nazwa aplikacji **`Sylveon Dart Profile`**, logo, **strona główna** (`https://dart.sylveoncompany.pl`), **polityka prywatności** (`https://dart.sylveoncompany.pl/privacy`) — ta sama domena, bez redirectu na sylveoncompany.pl. Na homepage musi być widoczna **nazwa appki + opis celu** (linia nad stopką). Odbiorcy: **Zewnętrzni**, stan **W produkcji**. Redirect URI w GCP = tylko `https://<ref>.supabase.co/auth/v1/callback` (nie `/auth/callback` na Dart).

Flow w app: `/login` → `GET /api/auth/google` → Google → `/auth/callback` (exchange + cookies sesji) → `/profile` lub `/onboarding`.

### Warstwa 3 — RODO / prawo (plan **1.0.1.6**, przed **2.0.3** płatności)

- **Minimalizacja:** nie zbieramy więcej niż potrzeba do statystyk darta
- **Cel przetwarzania:** usługa statystyk dla zawodnika (nie marketing do obcych bez zgody)
- **Prawo dostępu / usunięcia meczów:** **1.1.7**; usuwanie konta: **1.1.11**
- **DPA:** umowy powierzenia z Supabase i hostem (Vercel) — **1.0.1.6.5**
- **Polityka prywatności + regulamin + cookies:** strony publiczne — **1.0.1.6.1–4**
- **Rejestr czynności:** dokument wewnętrzny (administrator = Ty) — **1.0.1.6.5**
- **Demo:** wyłącznie zanonimizowane dane — nigdy profil usera

### Warstwa 4 — Input i API (stan po **1.0.1.3** / v1.2.0)

- Pole „Dodaj mecz" **nie jest** polem dowolnym — tylko URL N01
- Rate limit: `lib/rate-limit.ts` na `/api/ingest` (user + IP) i lookup `/m/*` (IP)
- Security headers: `lib/security-headers.ts` (middleware + `next.config.ts`)
- Client JSON meczów: zawsze przez `toClientMatch` — **bez** ścieżek Storage i `rawPayload`
- Share access: zapis do `snapshot_access_log` (hit/miss)
- `dev-upsert` — **403** w production
- Brak `eval`, brak zapisu surowego HTML usera do DB bez parsowania
- Dalszy hardening whitelist URL: **1.3.7**

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
- [x] Audyt prod kod (**1.0.1.1–3** ✅ v1.2.0) · deploy/domena (**1.0.1.4–5** ⏳)
- [ ] Dokumenty prawne (**1.0.1.6** — polityka, regulamin, cookies, DPA)
- [x] Usuwanie meczów (**1.1.7**); usuwanie konta (**1.1.11** ⏳)
- [x] Profil tożsamości domknięty (**1.1.9**) + About (**1.1.10**)
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
10. **Detekcja gracza STRICT** — `autoDetectPatterns()` = lastName + nickname + knownNicknames; reszta → pytaj lub odrzuć.
11. **Customer name split** — `first_name`, `last_name`, `nickname` w DB; wyświetlanie w TS (`formatCustomerDisplayName`). Kolumna `display_name` usunięta.

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

**Uwaga:** pierwsze ładowanie profilu po optymalizacji **1.3.6** — jeden fetch bootstrap (~sub-sekunda dla typowego konta; wcześniej dual N+1 ~30 s przy dużej liczbie visitów). Spinner „Ładuję mecze…" znika po `GET /api/profile/bootstrap`.

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

### Migracja: drop `display_name` (jednorazowo)

```bash
# Supabase Dashboard → SQL Editor → wklej:
# supabase/migrations/20260721210000_drop_customer_display_name.sql
```

### Migracja: pola „O Tobie” + tour (1.1.10 / 1.1.3.8)

```bash
# Supabase Dashboard → SQL Editor → wklej:
# supabase/migrations/20260721220000_customer_about_fields.sql
```

### Migracja customer name fields (historyczna)

Jeśli baza ma jeszcze starą kolumnę `display_name` (tekstowa, przed split), najpierw historyczna:

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

### v1.4.0 na `main` · dev `cursor/v1.4.x` ✅ | backlog otwarty (rosnąco po ID)


| Element         | Status                                                      |
| --------------- | ----------------------------------------------------------- |
| **1.0.0**       | ✅ WYDANY — branch `backup/v1.0.0`, tag `v1.0.0-backup`      |
| **1.0.1**       | ✅ WYDANY — inwentaryzacja copy (~245 MSG)                   |
| **1.0.1.1–6**   | częściowo ✅ **1.0.1.1–3** kod · **1.0.1.4–6** deploy/prawo ⏳ |
| **1.0.2.x**     | ⏳ Copy (Twoje teksty)                                       |
| **v1.1.0**      | ✅ WYDANY — Auth 1.1.1–1.1.6 · tag `v1.1.0` |
| **v1.1.1**      | ✅ WYDANY — **1.1.9** + docs **1.1.10** · `backup/v1.1.1` |
| **1.1.3.8**     | ✅ Samouczek (demo + auto po koncie) |
| **1.1.7**       | ✅ Usuwanie meczu (bez undo)                                  |
| **1.1.8**       | ⏳ Panel admina                                              |
| **1.1.9**       | ✅ Profil tożsamości (gate = nick + real name) |
| **1.1.10**      | ✅ Kod wdrożony (+ polish w v1.2.0) |
| **1.1.11–12**   | ⏳ Usuwanie konta · punkty gracza |
| **1.1.13**      | ✅ Edycja meczu (po v1.2.0 na main) |
| **v1.2.0**      | ✅ WYDANY — `backup/v1.2.0`, tag `v1.2.0-backup` |
| **v1.3.0**      | ✅ Testy Vitest + CI + security hardening · tag `v1.3.0` |
| **v1.3.2**      | ✅ WYDANY na `main` — perf bootstrap, rebrand, login split, landing, demo insights, footer · `backup/v1.3.0`, tag `v1.3.2` |
| **v1.4.0**      | ✅ WYDANY na `main` — favicon Sylveon, landing kafelki pionowo, docs OAuth/`/privacy` · tag `v1.4.0` |
| **1.4.x**       | ⏳ Kolejne featury — `cursor/v1.4.x` → merge `main` |
| **2.0.x**       | ⏸️ Premium + płatności (odłożone) |
| Backup DB lokalny | `.dev/*.json` **gitignore** (PII) — nie commitować |


### Gałęzie i tagi (2026-08-02)


| Cel | Wskaźnik |
| --- | -------- |
| Produkcja / release | `main` @ **v1.4.0** (tag `v1.4.0`) |
| Dev bieżący | `cursor/v1.4.x` (sync z `main` po release) |
| Linia 1.3 zamknięta | `cursor/v1.3.x` @ `0d1bbdf` |
| Rollback 1.4 | tag `v1.4.0` lub `git checkout` poprzedni commit na `main` |
| Rollback 1.3 | `git checkout backup/v1.3.0` lub tag `v1.3.2` |
| Rollback przed perf | tag `v1.3.0-pre-perf` (przed bulk bootstrap) |


### Co wchodzi w 1.0.0


| Obszar          | Zakres (ID)                                |
| --------------- | ------------------------------------------ |
| Profil prywatny | 0.0.x–0.3.x — 51 meczów, pełna analityka   |
| Demo publiczne  | 0.4.x — snapshot, stałe daty, landing, SEO |
| Git backup      | `backup/v1.0.0` + tag `v1.0.0-backup`      |


### Plan otwartych — punkt po punkcie (rosnąco po ID)

1. **1.0.1.4** — deploy Vercel
2. **1.0.1.5** — custom domain
3. **1.0.1.6** — polityka prywatności `/privacy` ✅ (**1.0.1.6.1**); dalej regulamin, cookies, linki, DPA
4. **1.0.2.1–7** — copy UI (po Twoich tekstach)
5. **1.1.3.2** — testy detekcji (część w Vitest; pełny golden → 1.4)
6. **1.1.8** — panel admina
7. **1.1.11** — usuwanie konta
8. **1.1.12** — punkty gracza (stawki TBD)
9. **1.3.3**, **1.3.5**, **1.3.7** — Playwright CI, backup DB, hardening importu server
10. **1.4.x** — nowe featury na `cursor/v1.4.x`
11. **2.0.x** — freemium + płatności + CTA premium *(⏸️ odłożone)*
12. **5.0.x** — pełne wydanie + Apple (⏸️)

Pełna tabela: [Backlog otwarty](#backlog-otwarty--rosnąco-po-id).

### Mapa wersji


| Wersja      | Nazwa                        | Status        |
| ----------- | ---------------------------- | ------------- |
| **0.x**     | Bootstrap → demo             | ✅ w 1.0.0     |
| **1.0.0**   | Release milestone            | ✅ WYDANY      |
| **1.0.1**   | Feedback + copy inventory    | ✅ WYDANY      |
| **1.0.1.x** | Prod + prawo (**1.0.1.6**)   | ⏳ (1–3 ✅)    |
| **1.0.2**   | Copy UI                      | ⏳             |
| **1.1.0**   | Auth core (Google + RLS)     | ✅ WYDANY      |
| **1.1.1**   | Tożsamość + roadmap 1.1.10   | ✅ WYDANY · `backup/v1.1.1` |
| **1.1.3.8** | Samouczek                    | ✅             |
| **1.1.7**   | Usuwanie meczu               | ✅             |
| **1.1.8**   | Admin                        | ⏳             |
| **1.1.9**   | Profil tożsamości (1.1.9.1–4) | ✅             |
| **1.1.10**  | Opcjonalne pola dartera      | ✅             |
| **1.1.13**  | Edycja meczu (swap+rename)   | ✅ (po v1.2.0)  |
| **1.2.0**   | Milestone (audit + UX)       | ✅ WYDANY · `backup/v1.2.0` |
| **1.3**     | Testy + perf + polish        | ✅ WYDANY · `backup/v1.3.0`, tag `v1.3.2` |
| **1.4**     | Prod polish + deploy track   | ✅ WYDANY · tag `v1.4.0` |
| **2.0**     | Premium + płatności          | ⏸️ odłożone   |
| **5.x**     | Pełne wydanie + Apple login  | ⏸️ odłożone   |


### Pliki kluczowe (Auth + tożsamość + About)

```
lib/auth.ts                                   ← ensureCustomerForUser, requireAuth*
lib/customer.ts                               ← needsOnboarding / needsAboutOnboarding / needsAboutSoftCta / autoDetectPatterns
lib/identity-suggest.ts                       ← formNameFields, isPlaceholderName
components/identity-form.tsx                  ← Krok 1 + „Zmień dane identyfikacyjne”
components/about-form.tsx                     ← Krok 2 + About w profilu (showEncouragement)
app/onboarding/page.tsx                       ← obowiązkowy formularz po Google
app/onboarding/about/page.tsx                 ← Krok 2 O Tobie
app/profile/page.tsx                          ← ProfileShell + needsAboutSoftCta
app/profile/profile-shell.tsx                 ← soft CTA + scroll do edycji
app/profile/profile-soft-cta.tsx
app/profile/profile-identity-edit.tsx         ← About na górze; identity zwinięte
app/api/ingest/route.ts                       ← gate 403 needs_onboarding + toClientMatch
app/api/customer/route.ts                     ← PATCH profilu
app/api/customer/insights/route.ts            ← maxWinStreak + weightCohort
```

### Pliki kluczowe (v1.2.0 — delete / audit / lista meczów)

```
app/api/matches/[id]/route.ts                 ← DELETE + PATCH match (ownership)
app/profile/match-delete-dialog.tsx           ← triple-check usuwania
app/profile/match-edit-dialog.tsx             ← 3 kroki: intent → strony/nazwa opp → potwierdź
app/profile/profile-match-card.tsx            ← edit + delete + share + expand
app/profile/profile-client.tsx                ← 5 kart, insights fetch, delete/update
app/profile/profile-stats-block.tsx           ← Best winning streak (Lifetime)
app/profile/profile-insights.tsx              ← tylko weight cohort
lib/matches.ts                                ← deleteMatch + updateMatchEdit
lib/match-client.ts                           ← strip snapshot paths / rawPayload
lib/rate-limit.ts
lib/security-headers.ts
middleware.ts / next.config.ts                ← headers + robots
```

### Pliki kluczowe (Auth v1.1.0 — OAuth)

```
lib/request-origin.ts / lib/app-origin.ts     ← origin LAN vs localhost
lib/auth-redirect-*.ts                        ← cookies origin/next po OAuth
lib/supabase/server.ts / middleware.ts        ← SSR cookies + gate
app/api/auth/google/route.ts                  ← server-side OAuth start (PKCE)
app/auth/callback/route.ts                    ← exchange code → session cookies
app/auth/signout/route.ts
app/login/*                                   ← przycisk Google
supabase/migrations/20260715210000_auth_rls_per_user.sql
```

### Pliki kluczowe (1.0.0 demo)

```
demo/demo-persona.ts                          ← postać demo (podmiana osoby)
demo/demo-profile-snapshot.json               ← statyczne KPI + mecze (commit)
demo/demo-insights.ts                         ← kohorta demo (fallback snapshot)
lib/demo.ts / lib/demo-snapshot.ts            ← loader + refresh dat + insights
lib/demo-dates.ts / lib/demo-import.ts        ← offsety dat + anonimizacja
lib/page-metadata.ts                          ← jeden tytuł: Twoje statystyki darta | SDP
lib/n01-url.ts                                ← walidacja URL N01 (demo + przyszły server)
lib/share-url.ts                              ← link do udostępnienia meczu
lib/matches.ts                                ← bulk getMyMatches + paginacja
app/api/profile/bootstrap/route.ts            ← jeden fetch profilu (mecze + insights)
scripts/seed-demo-matches.ts                  ← npm run seed:demo / repolish:demo
scripts/snapshot-demo.ts                      ← npm run snapshot:demo (+ maxWinStreak, kohorta)
supabase/migrations/20260713220000_demo_customer.sql
app/demo/profile/page.tsx                     ← profil publiczny index (+ showInsights)
app/demo/m/[shareToken]/page.tsx              ← mecze demo index
app/page.tsx / app/login/page.tsx             ← landing + auth Google-only
app/logintest/page.tsx                        ← email/password dev (noindex, nie w sitemap)
app/robots.ts / app/sitemap.ts                ← SEO (+ disallow /logintest)
lib/sitemap-paths.ts                          ← publiczne URL-e do sitemap (bez aliasów rewrite)
components/demo-banner.tsx
components/site-footer.tsx                    ← nav warunkowy (sesja)
```

### Pliki kluczowe (profil prywatny — stats)

```
lib/stats.ts                                ← bestLegAvg, computeHourStats, normalizeName, streaks
app/profile/profile-form-chart.tsx
app/profile/profile-activity.tsx
app/profile/profile-activity-hours.tsx
app/profile/profile-stats-block.tsx         ← BEST LEG AVG, streak Lifetime
app/m/[shareToken]/match-view.tsx
app/m/[shareToken]/page.tsx                 ← snapshot_access_log + toClientMatch
```

### Prompt na nowy czat

```
Projekt: Sylveon Dart Profile (Cursor_DartStats)
README = źródło prawdy — „Backlog otwarty" + „Stan na koniec czatu + handoff".

Stan: **v1.4.0** na `main` · dev **`cursor/v1.4.x`** (kolejne commity).
Backup: `backup/v1.3.0`, tag `v1.3.2` · release tag **`v1.4.0`**.
Backlog rosnąco po ID — nie zgaduj kolejności; pytaj przed startem.

Profil: jeden fetch `GET /api/profile/bootstrap` (bulk mecze + insights).
Login public: `/login` Google-only. Dev email: `/logintest` (noindex).
Demo: pełne statystyki (streak + kohorta) ze snapshotu; `npm run snapshot:demo`.
Footer: nav warunkowy (gość vs zalogowany); `SiteFooter` też na `/profile`.

Gate: needsOnboarding = nick + real name (nie knownNicknames).
Soft CTA: needsAboutSoftCta = OR city/brand/weight/hand/favorite (bez model / N01 nicks).
Streak = Lifetime w siatce stats; lista meczów = 5× ProfileMatchCard.
Edycja meczu: PATCH zapisuje DB; UI podmienia state z odpowiedzi. Nie przepisywać legs/visits.
Karty: Rzut (niebieski) · Share (fiolet) · Edytuj (żółty mały) · Usuń (czerwony mały).
Nie commitować `.dev/*.json` (PII).
1.0.1.6 = dokumenty prawne. 2.0.x = premium — odłożone.
Auth działa na Mac + iPhone (LAN).
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

> **Wersja:** 1.4.0 (sync docs) · **Data:** 2026-08-02 · **~245 pozycji MSG**  
> **Cel:** każdy komunikat widoczny dla usera — do przejrzenia i zatwierdzenia przed **1.0.2.x**.  
> **Legenda:** `[ ] do review` → Ty podajesz docelowy tekst (lub ✓ zostawiamy).  
> **Uwaga:** nazwy graczy, tytuły meczów, daty i liczby to dane dynamiczne — nie są tu wymienione.

### Global / tytuł / branding

| ID | Plik / kontekst | Kiedy | Tekst | Review |
|----|-----------------|-------|-------|--------|
| MSG-001 | `lib/page-metadata.ts` — `<title>` | Każda strona | `Twoje statystyki darta \| Sylveon Dart Profile` | [ ] do review |
| MSG-002 | `lib/site-config.ts` | Footer, OG, JSON-LD | `Sylveon Dart Profile` | [ ] do review |
| MSG-003 | `lib/site-config.ts` — OG alt | Share preview | `Sylveon Dart Profile — statystyki darta z N01` | [ ] do review |

### Landing — `app/page.tsx`

| ID | Kontekst | Tekst | Review |
|----|----------|-------|--------|
| MSG-010 | Hero H1 | `Sylveon` + `Dart Profile` (gradienty) | [ ] do review |
| MSG-011 | Hero lead | `Twój dart. W liczbach.` + akapity (import N01, średnie, H2H, turnieje) | [ ] do review |
| MSG-012 | CTA primary | `Zaloguj się / Zarejestruj` → `/login` | [ ] do review |
| MSG-013 | CTA secondary | `Zobacz profil demo` | [ ] do review |
| MSG-014 | ~~Hero tiles~~ | wyłączone w UI (kod zakomentowany) | n/a |
| MSG-015–018 | ~~Hero tiles~~ | wyłączone | n/a |
| MSG-019 | Features heading | `Co dostajesz` | [ ] do review |
| MSG-020 | Features sub | `Od linku N01 do profilu gracza` | [ ] do review |
| MSG-021 | Feature | `Koniec z Excelem` | [ ] do review |
| MSG-022 | Feature body | `Żadnego Excela, żadnego N01 po każdym turnieju…` | [ ] do review |
| MSG-023 | Feature | `Analityka na serio` | [ ] do review |
| MSG-024 | Feature body | `Średnie, H2H, wykresy formy, podejść i zamknięć…` | [ ] do review |
| MSG-025 | Feature | `Head-to-head` | [ ] do review |
| MSG-026 | Feature body | `Różne turnieje, ale ten sam przeciwnik?…` | [ ] do review |
| MSG-027–028 | ~~Share meczu~~ | usunięte z landing (4. kafelek) | n/a |
| MSG-029 | Demo block H2 | `Zobacz jak wygląda` + `przykładowy` + `profil` | [ ] do review |
| MSG-030 | Demo block body | `Nadal nie chcesz założyć konta? Sprawdź profil demo…` | [ ] do review |
| MSG-031 | Demo CTA | `Otwórz profil demo` | [ ] do review |
| MSG-032 | Demo link | `Przykładowy mecz` | [ ] do review |
| MSG-033 | ~~Footer note~~ | usunięte (`Masz już dostęp? /profile`) | n/a |

### Login — `app/login/page.tsx` *(Google-only od v1.3.2)*

| ID | Kontekst | Tekst | Review |
|----|----------|-------|--------|
| MSG-040 | Nav | `Strona główna` | [ ] do review |
| MSG-041 | H1 | `Wejdź do świata` + `Sylveon` + `Dart` | [ ] do review |
| MSG-042 | Intro | `Zaloguj się przez Google…` + link `Otwórz profil demo` | [ ] do review |
| MSG-043 | ~~CTA demo button~~ | usunięty (link w paragrafie) | n/a |
| MSG-044 | CTA Google | `Zaloguj się przez Google` | [ ] do review |
| MSG-045 | Błąd auth | `Logowanie nieudane. Zamknij kartę…` | [ ] do review |
| MSG-046 | ~~Zarejestruj~~ | rejestracja = ten sam `/login` (Google) | n/a |
| MSG-047 | ~~dev footer~~ | usunięte | n/a |

### Login dev — `app/logintest/page.tsx` *(noindex, nie w prod flow)*

| ID | Kontekst | Tekst | Review |
|----|----------|-------|--------|
| MSG-048 | Nagłówek | `Logowanie testowe` / email+password | [ ] do review |

### Footer — `components/site-footer.tsx` *(warunkowy od v1.3.2)*

| ID | Kontekst | Tekst | Review |
|----|----------|-------|--------|
| MSG-050 | Link → `/` | `Sylveon Dart Profile` | [ ] do review |
| MSG-051a | Gość | `Strona główna` | [ ] do review |
| MSG-051b | Gość | `Profil demo` | [ ] do review |
| MSG-051c | Gość | `Rejestracja` → `/login` | [ ] do review |
| MSG-051d | Gość | `Logowanie` → `/login` | [ ] do review |
| MSG-052a | Zalogowany | `Strona główna` | [ ] do review |
| MSG-052b | Zalogowany | `Mój profil` | [ ] do review |
| MSG-052c | Zalogowany | `Wyloguj` (POST `/auth/signout`) | [ ] do review |
| MSG-054 | Copyright | `© {year}` + `Sylveon Company` | [ ] do review |

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
| MSG-072 | Tagline (`demo-persona.ts`) | `Twój Sylveon Dart Profile — Wszystkie Twoje statystyki z turniejów lokalnych w jednym miejscu.` | [ ] do review |

### Demo match — `app/demo/m/[shareToken]/page.tsx`

| ID | Tekst | Review |
|----|-------|--------|
| MSG-080 | `← Wróć do profilu demo` | [ ] do review |
| MSG-081 | `Załóż własne konto` | [ ] do review |

### Private profile — `app/profile/page.tsx`

| ID | Tekst | Review |
|----|-------|--------|
| MSG-090 | Nav | `Strona główna` | [ ] do review |
| MSG-091 | Nav | `Wyloguj` | [ ] do review |
| MSG-092 | Footer | `SiteFooter` (nav warunkowy jak landing) | n/a |
| MSG-093 | Greeting | `Witaj,` (`profile-header`) | [ ] do review |

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
| MSG-229 | `Best winning streak` + sub `Lifetime` | [x] v1.2.0 |

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

### Ostatnie mecze (karty) — `app/profile/profile-client.tsx` + `profile-match-card.tsx`

> **v1.2.0:** usunięto `profile-recent-matches.tsx` (kompaktowa lista W/L). Domyślnie **5** kart + „Więcej spotkań”.

| ID | Tekst | Review |
|----|-------|--------|
| MSG-240 | Header | `Ostatnie mecze` | [x] v1.2.0 |
| MSG-241 | Empty | `Brak meczów w tym zakresie` | [ ] do review |
| MSG-242 | CTA | `Więcej spotkań ({n})` | [ ] do review |
| MSG-243 | ~~`Ostatnie 5 meczów`~~ | usunięte z UI | [x] obsolete |

### Soft CTA / edycja profilu — `profile-soft-cta.tsx` + `profile-identity-edit.tsx`

| ID | Tekst | Review |
|----|-------|--------|
| MSG-244 | Soft CTA body | `Zdobądź dodatkowe punkty i dostęp do dodatkowych statystyk i porównań.` | [x] v1.2.0 |
| MSG-245 | Soft CTA button | `Uzupełnij swój profil →` | [x] v1.2.0 |
| MSG-246 | Accordion | `Edytuj dane profilu` | [x] v1.2.0 |
| MSG-247 | Nested | `Zmień dane identyfikacyjne` | [x] v1.2.0 |
| MSG-248 | Identity submit | `Zapisz dane identyfikacyjne` | [x] v1.2.0 |
| MSG-249 | About submit (edit) | `Zapisz profil` | [x] v1.2.0 |

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
| MSG-305 | Delete | `Usuń mecz` + dialog triple-check (`usuwam`) | [x] v1.2.0 / 1.1.7 |
| MSG-306 | Edit btn | `Edytuj mecz` (amber, mały) | [x] 1.1.13 |
| MSG-307 | Throws btn | `Rzut po rzucie` (accent-from) | [x] 1.1.13 |
| MSG-308 | Share btn | `Udostępnij mecz` / `Skopiowano` (accent-to) | [x] 1.1.13 |

### Edycja meczu — `app/profile/match-edit-dialog.tsx`

| ID | Tekst | Review |
|----|-------|--------|
| MSG-309 | Krok 1 title | `Na pewno edytować ten mecz?` | [x] 1.1.13 |
| MSG-310a | Krok 1 body | `Możesz poprawić błędne przypisanie strony albo nazwę przeciwnika.` | [x] 1.1.13 |
| MSG-311a | Krok 2 title | `Co chcesz zmienić?` | [x] 1.1.13 |
| MSG-312a | Opt sides | `Zmiana stron` + opis z `-` | [x] 1.1.13 |
| MSG-313a | Opt rename | `Zmiana nazwy przeciwnika` + zdanie o H2H | [x] 1.1.13 |
| MSG-314a | Krok 3 title | `Potwierdź wprowadzone zmiany` | [x] 1.1.13 |
| MSG-315a | Submit | `Zapisz zmiany` | [x] 1.1.13 |

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
| MSG-341 | Title | `Sylveon Dart Profile` | [ ] do review |
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
5. Własne `not-found.tsx` / `error.tsx` / `global-error.tsx` — humor + auto-redirect na `/` (v1.2.0+).

---

## Dziennik zmian


| Wersja     | Data       | Co zrobiono                                                                                                                                                                                                                                                                                                         |
| ---------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1.4.x**  | 2026-08-08 | Sitemap: `/privacy` + `lib/sitemap-paths.ts` (14 publicznych URL). `robots.txt` allow `/privacy`. Landing: wyrównanie hero z sekcjami poniżej. `<title>`/`og:title`: `Sylveon Dart Profile | Twoje statystyki darta`. |
| **1.4.x**  | 2026-08-07 | **`/privacy`** na prod (`dart.sylveoncompany.pl`); link w stopce; linia opisu appki nad stopką (Google OAuth Branding). Supabase Site URL + redirect prod. Vercel Analytics + Speed Insights w `layout`. README: GCP Branding checklist. |
| **v1.4.0** | 2026-08-02 | **Release na `main`.** Favicon set Sylveon (z `sylveoncompany.pl`). Landing: sekcja „Co dostajesz” — 3 kafelki w kolumnie. README: `/privacy` konieczne dla Google OAuth Branding; prod na `sylveon-dart-profile.vercel.app`. Tag `v1.4.0`. |
| **1.4.0**  | 2026-08-02 | *(wcześniej)* Start linii — bump `package.json` 1.4.0, branch `cursor/v1.4.x` po v1.3.2. |
| **v1.3.2** | 2026-08-02 | **Release na `main`.** Perf: bulk `getMyMatches` + `GET /api/profile/bootstrap`, paginacja visits (fix limit 1000). Rebrand Sylveon Dart Profile. `/login` Google-only; `/logintest` dev email (noindex). Landing refresh (3 kafelki, hero). Demo: pełne statystyki (streak + kohorta ze snapshotu). Footer auth-aware + `SiteFooter` na `/profile`. Tagi `backup/v1.3.0`, `v1.3.2`. |
| **v1.3.0** | 2026-08-02 | **Testy + CI + security.** Vitest (parser, stats, security, player-detect), GitHub Actions CI, pre-prod hardening. Tag `v1.3.0`. Tag rollback perf: `v1.3.0-pre-perf`.                                                                                                                                            |
| **1.1.13** | 2026-07-26 | **Edycja meczu.** Dialog 3 kroki (strony / nazwa opp). `PATCH /api/matches/[id]` + `updateMatchEdit` (DB persist; bez rewrite legs). Przyciski karty: Rzut niebieski, Share fiolet, Edytuj amber mały, Usuń czerwony mały. Docs agent: „lokalnie” = UI state po odpowiedzi API, nie pomijanie DB. |
| **v1.2.0** | 2026-07-26 | **Milestone backup.** **1.1.7** delete match (API+UI+triple-check). Audyt **1.0.1.1–3** (rate limit, CSP, `toClientMatch`, share 16 hex, access log, dev-upsert prod block, `.dev/*.json` out of git). Profil UX: soft CTA scroll, About-first edit + identity accordion, streak Lifetime w stats, 5× match cards (kill recent-matches). Gate/soft CTA: `needsOnboarding` / `needsAboutSoftCta` OR. Branch `backup/v1.2.0`, tag `v1.2.0-backup`. |
| **1.1.10** | 2026-07-21 | **Krok 2 „O Tobie”** + pola .1/.4–.6/.10/.14/.21/.22 + insighty .23.1–.23.2 (cohort N=5). Samouczek **1.1.3.8** (demo + po koncie). Docs: **1.1.11** usuwanie konta, **1.1.12** punkty (stawki TBD). Migracja `20260721220000_customer_about_fields.sql`. |
| **docs**   | 2026-07-21 | **Drop `customers.display_name`.** Wyświetlanie tylko z `first_name` / `nickname` / `last_name` + `formatCustomerDisplayName()`. Migracja `20260721210000_drop_customer_display_name.sql`. |
| **1.1.1**   | 2026-07-21 | **Release v1.1.1.** Profil tożsamości **1.1.9.1–4**, premium→**2.0.x**, **1.1.10** zakres zatwierdzony (docs). Branch `backup/v1.1.1`, tag `v1.1.1-backup`. Package `1.1.1`. |
| **docs**   | 2026-07-21 | **1.1.10 decyzje.** Zatwierdzony zakres: .0 .1 .4 .5 .6 .10 .14 .21 .22 .23.1 .23.2. Odrzucone: .2–3 .7–9 .11–13 .15–20. Marki (~16+Inne), ~50 graczy (Wright/Chisnall/Bialecki must-have), kolumny `customers`, Krok 2 + soft CTA legacy. Bez kodu — kolejność wdrożeń w backlogu. |
| **docs**   | 2026-07-21 | **1.1.10 katalog.** Opcjonalne pola profilu dartera ponumerowane (1.1.10.0–23). UX: Krok 2 „O Tobie” + Pomiń + edycja w profilu. Gate zostaje 1.1.9. Kolumny w `customers` dopiero po wyborze ID. Propozycja Fazy 1: .1 .4 .6 .10 .17. |
| **docs**   | 2026-07-21 | **1.1.9.1–4 ✅** Profil tożsamości: wspólny `IdentityForm`, prefill Google (`given_name`/`family_name`), gate ingest `403 needs_onboarding`, edycja w profilu. **0.3.14–17 ❌** anulowane. Usunięty mock `/demo/tournaments-preview`. |
| **docs**   | 2026-07-20 | **Premium → 2.0.x.** **1.1.9.5** CTA + cały blok freemium/płatności (**było 1.2.x**) przeniesione do **2.0.1–6**. Start bez premium. **1.1.9** = tylko 1.1.9.1–4 (profil tożsamości). |
| **docs**   | 2026-07-20 | **README cleanup.** Roadmapa rosnąco po ID. **1.1.9** = profil tożsamości. **1.0.1.6** = dokumenty prawne. Backlog otwarty + plan punkt po punkcie. |
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

