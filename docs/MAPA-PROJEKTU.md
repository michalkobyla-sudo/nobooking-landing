# Mapa projektu — od tego zacznij

Krótki punkt wejścia: co gdzie leży, jak płyną dane, na co uważać. Szczegóły są
w `TECHNICZNA-DOKUMENTACJA.md` (numery sekcji podane niżej). Stan: 2026-11-20.
**Zmieniasz przepływ, konto albo adres — popraw tę mapę w tym samym commicie.**

## Czym jest Nobooking

SaaS: właściciel apartamentu kupuje pakiet (Basic/Pro, 2 lata), wypełnia formularz,
a system generuje mu stronę rezerwacyjną `slug.nobooking.eu` z panelem właściciela.
Goście płacą bezpośrednio właścicielowi (Stripe Connect, direct charges). Start
sprzedaży: styczeń 2027. Ceny: `src/lib/prices.ts`.

Stack: Next.js 16 (App Router, `src/proxy.ts` zamiast middleware — czytaj
`node_modules/next/dist/docs/` przed pisaniem kodu Next), React 19, TypeScript,
Supabase (REST, klucz serwisowy po stronie serwera), Stripe, Brevo (maile), Twilio
(SMS, Pro), Anthropic (generowanie treści strony, bot), Vercel (hosting, crony).

## Przepływ 1 — zakup pakietu (sprawdzony na żywo 2026-11-20)

1. `/zamow` → `OrderForm.tsx` → `POST /api/orders` (walidacja, akceptacja regulaminu,
   NIP/VAT UE `lib/numerPodatkowy.ts`, źródło wejścia, kraj z IP) → sesja Checkout
   `lib/checkoutZamowienia.ts` (metadane: `order_id`, `regulamin`, `wczesny_start`).
2. Stripe → `POST /api/stripe/webhook` (`checkout.session.completed` /
   `async_payment_succeeded`) → `orders.stripe_paid` → mail onboardingowy z potwierdzeniem
   umowy i pełnym regulaminem (`lib/email.ts` `sendOnboardingEmail`, `lib/potwierdzenieUmowy.ts`).
3. Klient wypełnia `/onboarding/[token]` → `POST /api/onboarding/[token]`.
4. Cron `provision-sites` (co minutę) → `lib/generate-site.ts` (Claude) → `lib/provision-site.ts`:
   wiersz `sites`, konto Connect właściciela (Accounts v2), subdomena w Vercelu
   (`lib/vercelSubdomena.ts`), hasło do panelu → kontrola `lib/provisionCheck.ts` → **jeden**
   mail „strona gotowa” (`sendOwnerWelcomeEmail`: adres, panel, Stripe, poprawki).
   Status zamówienia: `onboarding_sent` → `building` (cron bierze) → `completed` (mail wysłany);
   strona wstrzymana do przeglądu zostaje `building` z `provisioning_error`.
5. Poprawki: `/poprawki/[token]` → `api/revisions/[token]` (4 rundy).

## Przepływ 2 — rezerwacja gościa

Strona `sites/[slug]` (`components/apartment/ApartmentPage.tsx`) → `POST /api/sites/[slug]/book`
(wycena na serwerze `lib/bookingPricing.ts`, constraint `bookings_no_overlap`, status `pending`)
→ Checkout na koncie właściciela (`createBookingCheckout` w `lib/stripe-connect.ts`: ważność
60 min, bez metod z opóźnieniem) → webhook (zdarzenie musi przyjść z konta tej strony, kwota
musi się zgadzać) → `confirmed`, maile, SMS (Pro). Niezapłacone `pending` anuluje cron po 120 min.
Panel gościa: `sites/[slug]/guest/[bookingId]`, check-in (Pro), opinie.

## Kto się jak loguje

| kto | jak | gdzie |
|---|---|---|
| administrator (Michał) | Supabase Auth + **lista identyfikatorów** `lib/czyAdmin.ts` (`ADMIN_USER_IDS`) | `/admin`, `/api/admin/*`, ochrona w `proxy.ts` i `requireAdmin` |
| właściciel | własne hasło (`sites.admin_password_hash`) + podpisane ciasteczko `lib/ownerAuth.ts` | `/sites/[slug]/admin`, `/api/sites/[slug]/owner/*` |
| gość | UUID rezerwacji w linku | `/sites/[slug]/guest/[id]` |
| crony | `CRON_SECRET` (`lib/cronAuth.ts`) | `/api/cron/*` |

Właściciele **nie mają** kont Supabase Auth (od 2026-11-20). Publiczna rejestracja w Supabase wyłączona.

## Crony (`vercel.json`)

`provision-sites` co min · `sync-calendars` co 15 min (iCal z Booking/Airbnb, `lib/ical.ts`) ·
`cleanup-pending-bookings` co 30 min (+ retencja check-inów, odświeżanie Connect) ·
`backup-bookings` 02:00 · `health` 06:00 · `guest-reminders` 08:00 · `renewal-reminders` 09:00 ·
`review-requests` 10:00. Każdy zostawia ślad w `cron_runs` (`lib/cronHeartbeat.ts`).

## Raport zdrowia — pierwsze miejsce przy każdym „czy działa?”

`/api/cron/health` (logika `lib/health.ts`): maile, model, Twilio, Connect, kopie, schemat bazy
(`lib/schematWymagany.ts`), milczące crony, kalendarze, token Vercel, bot, **niedostarczone
webhooki Stripe**. Mail tylko przy problemach. Ręcznie:
`curl -H "Authorization: Bearer $CRON_SECRET" https://nobooking.eu/api/cron/health`.

## Kopia zapasowa

Cron `backup-bookings` → `app-data/backups/` w Supabase Storage, pełne tabele z listy
`lib/kopiaZapasowa.ts`. Odtworzenie: `node scripts/odtworz-kopie.mjs plik.json > sql`.
Supabase jest na planie **Free** — własnych kopii Supabase nie ma, to jedyna kopia
(i w tym samym projekcie). Szczegóły: TECHNICZNA §16.

## Konta i identyfikatory

| co | wartość |
|---|---|
| domena | `nobooking.eu` (DNS: Porkbun, gwiazdka). `www` **przekierowuje 308** na adres bez www |
| Vercel | projekt `prj_VyX0b86rAXDiucLH5B3yKBOvcmOG`, zespół `team_T3ET04nCtZDBadEbLlCgdhqW`; push na `main` = wdrożenie |
| Supabase | projekt `cgsfhvgddtwppmqvdecz` (nobooking-prod, Free) |
| Stripe platforma | konto **Nobooking** `acct_1UKa8vBYbNUONJ2O`; klucz ograniczony `rk_live_…POdW` |
| Stripe webhooki | `we_1UKaVfBYbNUONJ2OETPYLB06` (konto) i `we_1UKcadBYbNUONJ2O4tuo8ZF9` (Connect) → `https://nobooking.eu/api/stripe/webhook` |
| Stripe — nie ruszać | **Casa Sol** `acct_1TCfH5C4nRKn3H7A` — prywatne płatności właściciela projektu |
| admin (Supabase Auth) | `74a4858d-e785-463c-9669-9c23c144e8d3` |
| Meta | strona Nobooking.eu `1147158221808266`, aplikacja bota `2058975995021314` (tryb dev) |
| maile | Brevo, nadawca `noreply@nobooking.eu`; kontakt `kontakt@nobooking.eu` |

Zmienne środowiskowe: TECHNICZNA §7 + `grep -o "process.env.[A-Z_]*" -rh src | sort -u`.
Lokalny `.env.local` ma **testowy** klucz Stripe (`sk_test_`) i produkcyjną bazę.

## Pułapki, które już kosztowały czas

- **Adresy zewnętrzne zawsze bez www.** Webhooki Stripe na `www` nie dochodziły przez tygodnie (308).
- **Adres serwisu tylko przez `lib/adresSerwisu.ts`** (`adresSerwisu()`, `domenaGlowna()`) — produkcyjne
  `NEXT_PUBLIC_SITE_URL` ma końcowy znak nowej linii. **Adres strony klienta** w mailach:
  `adresStronyKlienta(slug)` z `lib/email.ts` → `slug.nobooking.eu` (strona, panel gościa, opinie, check-in);
  panel właściciela i odnowienie zostają pod `nobooking.eu/sites/<slug>/admin`. Raport zdrowia sprawdza,
  że subdomena każdej aktywnej strony odpowiada.
- **Wysyłka po odpowiedzi tylko przez `after()`** z `next/server` — promise bez `await` Vercel ucina.
- **Linki wewnętrzne jako `<Link>`**, nie `<a>` — źródło wejścia z reklamy żyje tylko w pamięci karty
  (`lib/zrodloWPamieci.ts`), przeładowanie je gubi.
- **Nowa tabela** wymaga decyzji w `lib/schematWymagany.ts` i `lib/kopiaZapasowa.ts` — testy wywrócą CI.
- **Nowa kolumna = migracja SQL w `docs/supabase/`** do uruchomienia w edytorze Supabase; kod pisze
  nowe kolumny osobnym, nieblokującym `update`, a raport zdrowia zgłasza brak.
- **Obietnice w treściach** (landing, FAQ, regulamin, maile) sprawdzaj w kodzie i w panelach (np.
  metody płatności w Stripe), zanim je napiszesz.
- Testów nie da się robić zapisem na produkcyjnej bazie — klasyfikator blokuje i słusznie.
  Ścieżkę end-to-end sprawdza się zakupem testowym (jak 2026-11-20).

## Polecenia

`npm test` (vitest) · `npm run typecheck` · `npm run dev` (podgląd: `.claude/launch.json`, nazwa
`nobooking`) · `npx vercel ls nobooking-landing` (stan wdrożeń) ·
`npx vercel logs --environment production --since 30m --no-branch -x` (logi) ·
`./scripts/sprawdz-produkcje.sh` (kontrola po wdrożeniu).

## Gdzie szukać szczegółów

| temat | plik |
|---|---|
| architektura, tabele, panel, Stripe, crony | `TECHNICZNA-DOKUMENTACJA.md` |
| plan i etapy do startu | `PLAN-DO-STARTU.md` |
| co jest w pakietach | `PAKIET-BASIC.md`, `PAKIET-PRO.md` |
| regulamin, polityka, przegląd prawny | `PRAWNE-*.md` |
| VAT, OSS, faktury | `PODATKI-I-FAKTUROWANIE.md` |
| nazewnictwo kampanii | `ATRYBUCJA-NAZEWNICTWO.md` |
| migracje SQL | `docs/supabase/` |
| wygląd (styl iOS) | `src/app/ios.css` (klocki `n-*`, landing `l-*`, strona apartamentu `a-*` w kolorze właściciela — kontrast `lib/koloryMarki.ts`), płytki ikon `components/ui/Kafelek.tsx` + `ui/ikony.ts` (Phosphor), maile `lib/mailUi.ts` + PNG z `scripts/ikony-maili.mjs` |
