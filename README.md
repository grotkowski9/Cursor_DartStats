# Cursor_DartStats

Nowa wersja **Dart Profile Tracker** — prywatny panel statystyk darta dla jednego zawodnika,
budowany od zera w Cursorze. Docelowo pod `dart.sylveoncompany.pl`.

> **Status:** v0.2 — planowanie. Brak kodu. Czekam na pełne repo z Lovable + prompty.
> Następny krok: test-fetch endpointu N01 (po otrzymaniu repo).

---

## Spis treści

1. [Cel projektu](#cel-projektu)
2. [Założenia biznesowe](#założenia-biznesowe)
3. [Stack technologiczny](#stack-technologiczny)
4. [Architektura plików (planowana)](#architektura-plików-planowana)
5. [Parser N01 — kontrakt](#parser-n01--kontrakt)
6. [KPI — kontrakt](#kpi--kontrakt)
7. [Identity, Storage, Sharing](#identity-storage-sharing)
8. [Design System — Sylveon Lift (W2)](#design-system--sylveon-lift-w2)
9. [Konwencje pracy](#konwencje-pracy)
10. [Status / Roadmapa](#status--roadmapa)
11. [ADR — kluczowe decyzje](#adr--kluczowe-decyzje)
12. [Znane problemy i bugi do naprawienia](#znane-problemy-i-bugi-do-naprawienia)
13. [Uruchomienie lokalne](#uruchomienie-lokalne)
14. [Dziennik zmian](#dziennik-zmian)

---

## Cel projektu

Kompletna historia zawodnika z lokalnych turniejów darta w jednym miejscu:
każdy mecz pobrany z N01 na stałe (raw JSON + backup), własny widok throw-by-throw
niezależny od dostępności n01darts.com, komplet statystyk, wykresy formy i analityka.

Aplikacja jest prywatna, mobile-first, z ciemnym motywem i glassmorphism.

---

## Założenia biznesowe

- **MVP = single user.** Bez logowania. Stały `OWNER_ID = "c_00001"`.
- **Multi-user-ready od dnia 0.** Schemat DB z `customer_id` wszędzie, RLS — dodanie
  auth nie wymaga przebudowy.
- **Zero halucynacji.** Jeśli pole nie ma w danych N01 → kafel ukrywam, nie zmyślam.
- **Profile i share-linki: `noindex, nofollow`.** Landing `/` — indeksowalny.
- **Docelowo freemium SaaS:**
  - Free: max 3 mecze, podstawowe statystyki
  - Premium: pełne statystyki, import hurtowy, wykresy, eksport
  - Bramka płatności: **polska** (PayNow/mBank lub PayU — nie Stripe)
  - Role: user → premium → admin → superadmin
- **Hosting:** jeden serwer/usługa, minimalne koszty, custom domain `dart.sylveoncompany.pl`.

---

## Stack technologiczny

| Warstwa | Wybór | Powód |
|---|---|---|
| Framework | Next.js 15 (App Router) | API routes (server-side fetch N01, brak CORS), SSR, łatwy deploy |
| Język | TypeScript (strict) | Bezpieczeństwo typów |
| Styling | Tailwind v4 (CSS-first) + shadcn/ui | Szybki development, tokeny, glass effect |
| Ikony | lucide-react | Lekkie, ładne |
| Wykresy | Recharts | Responsywne, sprawdzone |
| DB + Storage + Auth | Supabase (free → Pro $25/mies. przy wzroście) | Postgres + Storage + Auth + RLS |
| Hosting | Vercel (free tier) | Deploy z GitHub, custom domain, zero konfiguracji |
| Płatności (przyszłość) | PayNow (mBank) lub PayU | Polska bramka, PLN |
| Package manager | pnpm | Szybki, oszczędny na dysku |

---

## Architektura plików (planowana)

```
src/
├── app/
│   ├── layout.tsx          # HTML shell, fonty, providers
│   ├── page.tsx            # / — landing
│   ├── profile/
│   │   └── page.tsx        # /profile — panel zawodnika
│   ├── m/[shareId]/
│   │   └── page.tsx        # /m/{shareId} — publiczny widok meczu
│   └── api/
│       ├── ingest/route.ts # POST — fetch z N01 + zapis
│       └── matches/route.ts# GET — lista meczów
├── components/             # UI components
├── lib/
│   ├── n01-parser.ts       # Parser danych N01
│   ├── stats.ts            # Silnik statystyk
│   ├── supabase.ts         # Klient Supabase
│   └── constants.ts        # OWNER_ID, config
├── types/                  # TypeScript types
└── styles/
    └── globals.css         # Design tokens Sylveon Lift + @utility glass-tile
```

---

## Parser N01 — kontrakt

Endpoint (z Lovable, DO ZWERYFIKOWANIA):
`POST https://tk2-228-23746.vs.sakura.ne.jp/n01/tournament/n01_user_t.php?cmd=match_view`
z ciałem `{ tmid }`.

Zwraca JSON z `statsData`, `legData`, `title`, `startTime`, `startScore`.

### Kodowanie `playerData[legIdx][visitIdx]`

| `score` | `left` | Znaczenie | `actualScore` | `darts` |
|---|---|---|---|---|
| 0 | 501 | Setup (index 0, pomijany) | 0 | 0 |
| ≥ 0 | > 0 | Normalna wizyta (3 lotki) | = `score` | 3 |
| = 0 | > 0, bez zmiany | Miss/bust bez punktów | 0 | 3 |
| < 0 | = 0 | **CHECKOUT.** `|score|` = lotki użyte | = poprzedni `left` | `|score|` |
| < 0 | > 0 | Bust wysokim wynikiem | 0 | `|score|` |

**Status:** Do zweryfikowania test-fetchem. Nie zakładam, że endpoint działa bez sprawdzenia.

---

## KPI — kontrakt

Statystyki per-mecz i w agregacie zawodnika:

| Nazwa | Definicja |
|---|---|
| Legs | `player.winLegs` |
| 3-Darts Average | `allScore / allDarts * 3` |
| First 9 | Średnia 3-dartowa z 3 pierwszych wizyt każdego lega |
| 60+ / 80+ / 100+ / 120+ / 140+ / 170+ / 180 | Tiered exclusive: 60+=[60,79], 80+=[80,99]… |
| High Finish | Największy `actualScore` w wizycie kończącej wygrany leg |
| 100+ Finishes | Checkouty z `actualScore ≥ 100` |
| Best Leg (darts) | Najkrótszy wygrany leg |
| Worst Leg (darts) | Najdłuższy wygrany leg |
| Checkout % | `wygrane_legi / próby_na_double` (approx: `leftBefore ≤ 170`) |

---

## Identity, Storage, Sharing

- `OWNER_ID = "c_00001"` — stała. Przyszłość: `auth.uid()` → `customer_id`.
- **Storage:** bucket `dart-snapshots`, ścieżka `{c_XXXXX}/{ttype}/{yyyy}/{mm}/{dd}/{tmid}_{hash}.json`.
- **Share-link:** `shareId = base36(sha256(owner+tmid)).slice(0,8)` — deterministyczny.
- **Route:** `/m/{shareId}` — `noindex, nofollow`.

---

## Design System — Sylveon Lift (W2)

Inspiracja: [sylveoncompany.pl](https://sylveoncompany.pl)

| Token | Kolor | Zastosowanie |
|---|---|---|
| `--background` | `#0a0f1e` | tło strony |
| `--card` | `#141a2e` | kafle (glass tile) |
| `--accent-from` | `#5ea0ff` | primary, gradient start |
| `--accent-to` | `#8b6bff` | gradient end, fioletowy akcent |
| `--signal` | `#6be1ff` | highlight 180, high finish |
| `--border` | biały 14% opacity | granice kafli |
| Font | **Inter** | całość |

Efekty: glass-tile (blur + saturate), subtelne animacje, gradient CTA.

---

## Konwencje pracy

- **Kod EN, UI PL.** Funkcje/typy po angielsku, teksty użytkownika po polsku.
- **README = źródło prawdy.** Aktualizacja po każdej zmianie.
- **Nie zakładamy — pytamy.** Zero halucynacji.
- **Iteracyjnie.** Po każdym etapie raport: Co zrobiłem / Co proponuję / Ryzyka / Pytania / Update README.
- **Nie przechodzimy dalej bez akceptacji.**
- **`OWNER_ID` jako stała** — nigdy inline w wielu miejscach.

---

## Status / Roadmapa

Numeracja i struktura faz zachowana z projektu Lovable (źródło historii).

### Faza 0 — Bootstrap
- [ ] 0.1 Scaffold projektu (Next.js 15 + TypeScript + Tailwind v4 + shadcn/ui + pnpm)
- [ ] 0.2 Design tokens (Sylveon Lift), `.glass-tile`, fonty Inter
- [ ] 0.3 Routing bazowy (landing `/`, profil `/profile`, mecz `/m/[shareId]`)
- [ ] 0.4 Supabase: projekt + bucket `dart-snapshots` + schemat DB + RLS
- [ ] 0.5 Landing page (`/`)
- [ ] 0.6 **Test-fetch endpointu N01** ← NASTĘPNY KROK

### Faza 1 — Ingest N01 + Parser + Profil
- [ ] 1.1 `ingestN01(url)` — server-side fetch + backup do Storage
- [ ] 1.2 Parser `statsData` + `legData` → typy TS
- [ ] 1.3 Detekcja „ja" — **DO PRZEPROJEKTOWANIA** (stary sposób po nicku jest buggy)
- [ ] 1.4 Silnik statystyk `computeMatchStats` + `computePlayerStats`
- [ ] 1.5 Widok `/profile` — kafle stats + lista meczów + filtr zakresu
- [ ] 1.6 Widok szczegółu meczu `/m/[shareId]` (throw-by-throw)
- [ ] 1.7 Seed testowy (kilka meczów)

### Faza 2 — Rozbudowa profilu + persystencja DB
- [ ] 2.1 Formularz „Dodaj mecz" (input URL + „Pobierz dane")
- [ ] 2.2 Schemat bazy (migracja Postgres, RLS deny-by-default)
- [ ] 2.3 Server functions: `saveMatch`, `getMyMatches`, `getMatchByShareId`
- [ ] 2.4 Wykres formy (Recharts: 3-dart avg + First 9 per mecz)
- [ ] 2.5 Ostatnie 5 meczów (kafel W/L)
- [ ] 2.6 Top 10 najczęstszych podejść
- [ ] 2.7 Top 10 najczęstszych zamknięć

### Faza 3 — Import hurtowy + Duplikaty
- [ ] 3.1 Formularz z textarea (wiele URL naraz)
- [ ] 3.2 Sekwencyjny import + obsługa duplikatów (Nadpisz / Pomiń)
- [ ] 3.3 Walidacja tmid + komunikaty błędów PL

### Faza 4 — Signed URL + Audit-log + Share
- [ ] 4.1 Signed URL do snapshotów (TTL 5 min)
- [ ] 4.2 Przycisk „Udostępnij mecz"
- [ ] 4.3 Audit-log dostępu

### Faza 5 — Zaawansowana analityka
- [ ] 5.1 Średnia krocząca (5-mecz rolling) + trend
- [ ] 5.2 Heatmapa dni/godzin
- [ ] 5.3 Head-to-head vs konkretny przeciwnik
- [ ] 5.4 Rozkład finishingów
- [ ] 5.5 Export CSV/XLSX

### Faza 6 — Auth + Multi-user
- [ ] 6.1 Supabase Auth (Google login)
- [ ] 6.2 Tabela `customers` — sync `auth.uid()` → `customer_id`
- [ ] 6.3 Onboarding: „który zawodnik to Ty?" przy pierwszym ingest
- [ ] 6.4 Usunięcie stałej `OWNER_ID`
- [ ] 6.5 Landing z CTA „Zaloguj się"

### Faza 7 — Premium + Płatności
- [ ] 7.1 Model freemium (free: 3 mecze, basic stats; premium: pełne)
- [ ] 7.2 Bramka płatności (PayNow/PayU)
- [ ] 7.3 Role: user / premium / admin / superadmin
- [ ] 7.4 Panel admina

### Faza 8 — Testy + Hardening
- [ ] 8.1 Vitest (parser + stats golden samples)
- [ ] 8.2 Playwright (happy-path: ingest → profil → share)
- [ ] 8.3 CI na PR (`typecheck && test`)

---

## ADR — kluczowe decyzje

1. **Next.js zamiast TanStack Start.** Stabilniejszy, łatwiejszy deploy, lepszy ekosystem.
2. **Supabase zamiast self-hosted.** Mniej pracy ops, free tier na MVP, Pro na wzrost.
3. **Polska bramka (PayNow/PayU) zamiast Stripe.** Lokalny rynek, PLN.
4. **Parser: negative-score encoding.** N01 koduje ujemny `score` jako liczbę lotek
   na checkout/bust. Bez dekodowania statystyki są błędne.
5. **Share-link zamiast surowego path.** `/m/{shareId}` (8 znaków) — krótszy, bezpieczniejszy.
6. **`c_XXXXX` jako customer_id.** Multi-tenant-ready od dnia 0.
7. **Noindex na profilach/share.** Prywatne dane — bez Google.
8. **Vercel jako hosting.** Zero config, free tier, custom domain, auto-deploy z GitHub.

---

## Znane problemy i bugi do naprawienia

| # | Problem | Status |
|---|---|---|
| BUG-1 | Detekcja „ja" po nicku (Piotr/Grotkowski/Grotel) jest błędna — nie każdy Piotr to Piotr Grotkowski. Trzeba przeprojektować: np. user wybiera siebie przy pierwszym imporcie. | Do naprawienia w Fazie 1.3 |
| RISK-1 | Endpoint N01 niezweryfikowany — może nie działać lub zwracać inaczej. | Test-fetch zaplanowany (Faza 0.6) |

---

## Uruchomienie lokalne

_Jeszcze brak kodu. Po scaffoldingu:_

```bash
pnpm install
pnpm dev
```

Podgląd: `http://localhost:3000/`

---

## Dziennik zmian

| Wersja | Data | Co zrobiono |
|---|---|---|
| v0.2 | 2026-07-11 | Pełny zamysł projektu: zrzuty + README Lovable → nowy README. Stack, roadmapa, design, bugi, ADR. |
| v0.1 | 2026-07-11 | Nowe repo na GitHub |

---

## Źródła

- **Stary projekt (Lovable):** _link do uzupełnienia po otrzymaniu_
- **Inspiracja designu:** [sylveoncompany.pl](https://sylveoncompany.pl)
- **System meczów:** [n01darts.com](https://n01darts.com)
