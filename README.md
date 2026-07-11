# Cursor_DartStats

Nowa wersja **Dart Profile Tracker** — prywatny panel statystyk darta dla jednego zawodnika,
budowany od zera w Cursorze. Inspiracja: projekt `Lovable_DartStats` (osobne repo).

> **Status:** v0.1 — repozytorium, README. Jeszcze bez kodu.

---

## Spis treści

1. [Czym jest ta aplikacja](#czym-jest-ta-aplikacja)
2. [Co widać na ekranie — przegląd widoków](#co-widać-na-ekranie--przegląd-widoków)
3. [Design — Sylveon Lift](#design--sylveon-lift)
4. [Stack technologiczny](#stack-technologiczny)
5. [Kluczowe funkcje do odwzorowania](#kluczowe-funkcje-do-odwzorowania)
6. [Roadmapa — co budujemy krok po kroku](#roadmapa--co-budujemy-krok-po-kroku)
7. [Jak pracujemy](#jak-pracujemy)
8. [Dziennik zmian](#dziennik-zmian)

---

## Czym jest ta aplikacja

**Dart Profile Tracker** to prywatny panel statystyk gracza w darta.

- Zawodnik wkleja link do meczu z systemu **n01darts.com** (N01 Darts)
- Aplikacja pobiera dane z N01 i **archiwizuje je trwale** (linki N01 wygasają!)
- Wylicza pełne statystyki: 3-dart average, First 9, checkout%, rozkłady 60+…180, itd.
- Wyświetla historię meczów, wykresy formy, analizę podejść i zamknięć
- Mecz można **udostępnić linkiem** (`/m/{shareId}`) — bez logowania przez drugą osobę

Docelowy użytkownik: **Piotr „Groteł" Grotkowski** (single-user, bez rejestracji).

---

## Co widać na ekranie — przegląd widoków

### 1. Landing (`/`)
- Ciemne tło z subtelną siatką i rozbłyskiem
- Logo — ikona tarczy
- Tytuł: „Dart **Profile** Tracker" (słowo „Profile" w niebieskim gradiencie)
- Podtytuł po polsku
- Przycisk CTA „Przejdź do swojego profilu →"

### 2. Profil gracza (`/profile`)
- Nagłówek: „WITAJ, Piotr „Groteł" Grotkowski"
- **Kafel STATYSTYKI ZAWODNIKA** — filtr zakresu (30 / 90 / 180 / 365 dni / Wszystko):
  - Duże kafle: Średnia 3-DART, FIRST 9, WIN RATE (z bilansem W/L), LEGI (wygranych–zagranych)
  - Rząd pigułek bucketów: 60+ / 80+ / 100+ / 120+ / 140+ / 170+ / 180
  - Kafle dolne: HIGH FINISH, 100+ FIN., BEST LEG (dart), CHECKOUT %
- **Kafel FORMA** — wykres liniowy (Recharts): średnia 3-dart per mecz + seria First 9
- **Kafel OSTATNIE 5 MECZÓW** — lista: W/L pill + wynik legs + avg + link do meczu
- **Kafel TOP 10 NAJCZĘSTSZYCH PODEJŚĆ** — poziomy bar chart (niebieski gradient)
- **Kafel TOP 10 NAJCZĘSTSZYCH ZAMKNIĘĆ** — poziomy bar chart (fioletowy gradient)

### 3. Dodaj mecz / Import (`/profile` — sekcja formularza)
- Pojedynczy input URL (`https://n01darts.com/n01/...`) + przycisk „Pobierz dane"
- Sekcja **IMPORT HURTOWY** — textarea (jeden URL / linia) + przycisk „Importuj wszystkie"
- Pod formularzem: lista **OSTATNIE MECZE** (z liczbą)
- Każda karta meczu: data, „vs NAZWISKO", badge WIN/LOSS, statystyki obu graczy (legs, 3-dart, first9, 60+…180, high fin., best/worst leg, checkout %), przyciski (throw-by-throw, tekst, link, komentarz)

### 4. Szczegół meczu (`/m/{shareId}`)
- Link „Wróć do profilu"
- Data i godzina
- Nazwa turnieju (np. „TURNIEJ INDYWIDUALNY OPEN - PUB DARTOWNIA 10.07 Group 4")
- Kafel lewego gracza (aktywny, z nazwą, wynik legs, AVG) + prawy gracz
- Sekcja **DETAILS** — tabela: First 9, 60+, 80+, 100+, 120+, 140+, 170+, 180, High Finish, 100+ Fin., Best Leg, Worst Leg, Checkout %
- Sekcja **THROW-BY-THROW** — po legach:
  - Nagłówek lega: nr lega, nazwa zawodnika, liczba rzutów, avg Ja / avg Opp
  - Tabela: # | Ja (podświetlone 100+/140+/180) | left | Opp | left
  - Ostatni wiersz = checkout (z checkmarkiem i liczbą lotek)
- Przycisk „Udostępnij ten mecz"

---

## Design — Sylveon Lift

Ciemny motyw, paleta W2 „Sylveon Lift":

| Token | Kolor | Zastosowanie |
|---|---|---|
| `--background` | `#0a0f1e` (bardzo ciemny granat) | tło strony |
| `--card` | `#141a2e` (ciemny granat) | kafle (glass tile) |
| `--accent-from` | `#5ea0ff` (niebieski) | primary, gradient start |
| `--accent-to` | `#8b6bff` (fioletowy) | gradient end, akcent |
| `--signal` | `#6be1ff` (cyjan) | podświetlenie 180, high finish |
| `--border` | biały 14% opacity | granice kafli |
| Font | **Inter** | całość |

Kafle mają efekt `glass-tile` (blur + saturate, wewnętrzny highlight od góry).

---

## Stack technologiczny

| Warstwa | Wybór |
|---|---|
| Frontend | React 19, TypeScript (strict) |
| Routing | TanStack Start v1 (lub TanStack Router — do ustalenia po analizie repo) |
| Bundler | Vite 7 |
| Styling | Tailwind v4 (CSS-first) + shadcn/ui |
| Ikony | lucide-react |
| Wykresy | Recharts |
| Backend / DB | Supabase (Postgres + Storage) |
| Package manager | bun |

> **Uwaga:** Stack do potwierdzenia po otrzymaniu linku do starego repo. Nie zakładamy.

---

## Kluczowe funkcje do odwzorowania

### Parser N01
- POST do endpointu n01darts.com (`n01_user_t.php?cmd=match_view`) z `{ tmid }`
- Zwraca `statsData`, `legData`, `title`, `startTime`, `startScore`
- Ważne: ujemny `score` w `legData` = checkout lub bust — wymaga specjalnego dekodowania

### KPI gracza (na mecz i w agregacie)
- 3-Dart Average, First 9, Win Rate, Legs
- Buckety exclusive: 60+=[60,79], 80+=[80,99], 100+=[100,119], 120+=[120,139], 140+=[140,169], 170+=[170,179], 180
- High Finish, 100+ Finishes, Best Leg (darts), Worst Leg (darts), Checkout %
- Checkout % = wygrane legi / próby na double (approx: wizyty z `left ≤ 170`)

### Archiwizacja
- Backup JSON + HTML shell do Supabase Storage (`dart-snapshots`)
- Ścieżka: `c_00001/{ttype}/{yyyy}/{mm}/{dd}/{tmid}_{hash16}.{json|html}`

### Share-link
- `shareId = base36(sha256(owner+tmid)).slice(0,8)` — deterministyczny 8 znaków
- Trasa `/m/{shareId}` z `noindex, nofollow`

### Import hurtowy
- Textarea z wieloma URL-ami (jeden na linię)
- Sekwencyjny import, obsługa duplikatów (Nadpisz / Pomiń per-URL i „wszystkie")

---

## Roadmapa — co budujemy krok po kroku

### Faza 0 — Bootstrap (następna)
- [ ] Konfiguracja projektu (Vite + React 19 + TypeScript + Tailwind v4 + shadcn/ui)
- [ ] Design tokens (Sylveon Lift), `.glass-tile`, fonty
- [ ] Routing bazowy (TanStack Start lub Router)
- [ ] Supabase: bucket `dart-snapshots` + tabele + RLS
- [ ] Strona landing (`/`)

### Faza 1 — Ingest + Parser + Profil
- [ ] Parser N01 (`ingestN01`, negative-score encoding)
- [ ] Silnik statystyk (`computeMatchStats`, `computePlayerStats`)
- [ ] Widok `/profile` z kaflami KPI i listą meczów
- [ ] Widok szczegółu meczu (`/m/{shareId}`) z throw-by-throw

### Faza 2 — Wykresy + Analityka
- [ ] Wykres formy (Recharts — linia 3-dart avg + First 9)
- [ ] Top 10 najczęstszych podejść (bar chart niebieski)
- [ ] Top 10 najczęstszych zamknięć (bar chart fioletowy)
- [ ] Ostatnie 5 meczów (kafel z W/L)

### Faza 3 — Import hurtowy + Duplikaty
- [ ] Formularz pojedynczego importu
- [ ] Import hurtowy (textarea + sekwencyjny)
- [ ] Obsługa duplikatów (Nadpisz / Pomiń)

### Faza 4+ — do ustalenia
- Auth, multi-user, testy, export CSV, head-to-head, heatmapa

---

## Jak pracujemy

1. **README = źródło prawdy.** Aktualizacja po każdej wersji.
2. **Nie zakładamy — pytamy.** Jeśli czegoś nie wiemy, pytamy zamiast zgadywać.
3. **Kod EN, UI PL.** Nazwy funkcji/typów po angielsku, teksty dla użytkownika po polsku.
4. **GitHub + dysk lokalny.** GitHub = archiwum, praca w Cursorze.
5. **Zero halucynacji w UI.** Jeśli parser nie ma pola → kafel ukrywam, nie zmyślam.

---

## Dziennik zmian

| Wersja | Data | Co zrobiono |
|---|---|---|
| v0.1 | 2026-07-11 | Nowe repo, README z pełnym zamysłem projektu na podstawie zrzutów i README z Lovable |

---

_Stary projekt (Lovable): link do uzupełnienia po otrzymaniu od właściciela._
