# Wdrożenie poprawek — krok po kroku

Stan na 2026-09-05. Dotyczy gałęzi `fix/p0-security-2026-09` (9 commitów).

**Kolejność ma znaczenie.** Etap C musi poprzedzić E, a D musi być gotowe zanim
E trafi na produkcję — inaczej rezerwacje przestaną się potwierdzać.

Czas łącznie: ok. 45 minut.

---

## ETAP A — Zatrzymaj bieżące ryzyko (5 min) ✅ ZROBIONE 2026-09-18

> `.env.local` wskazuje teraz `cgsfhvgddtwppmqvdecz` — wszystkie trzy wartości
> (URL, anon, service_role) zweryfikowane jako należące do tego samego projektu.

Dziś `nobooking-landing/.env.local` wskazuje projekt Supabase, na którym stoi
**działająca strona Casa Sol**. Każde `npm run dev` w nobookingu operuje na
prawdziwych rezerwacjach gości.

1. Wejdź na **vercel.com** → projekt **`nobooking-landing`** → **Settings** →
   **Environment Variables**
2. Znajdź `NEXT_PUBLIC_SUPABASE_URL` (środowisko **Production**) i skopiuj wartość
3. Znajdź `SUPABASE_SERVICE_ROLE_KEY` (Production) — kliknij oczko / **Reveal**,
   skopiuj
4. Otwórz `nobooking-landing/.env.local` i podmień **obie** wartości
5. Sprawdź, czy podmiana zadziałała:

```bash
cd "nobooking-landing" && grep NEXT_PUBLIC_SUPABASE_URL .env.local
```

Adres **nie powinien** zaczynać się od `https://ejteazvuaufaltmhcrwi` — to projekt
Casa Sol. Jeśli nadal taki jest, znaczy że Vercel ma tę samą wartość i wtedy
zatrzymaj się tutaj i daj znać, bo cała reszta planu wymaga przemyślenia.

> Klucz `service_role` omija całe RLS. Trzymaj go tylko w `.env.local`
> (jest w `.gitignore`, sprawdzone) i nie wklejaj do rozmowy.

---

## ETAP B — Potwierdzenie (2 min) ✅ ZROBIONE 2026-09-18

> Produkcja Nobookinga = projekt **`cgsfhvgddtwppmqvdecz`**. Potwierdzone:
> kalendarz Casa Sol liczony z tej bazy daje 111 dat do 2026-10-25, dokładnie
> tyle co `nobooking.eu`.

Podeślij mi **sam adres** projektu z kroku A2 — `https://xxxxx.supabase.co`.
To nie jest sekret (siedzi w zmiennej `NEXT_PUBLIC_`), a pozwoli mi zamienić
w dokumentacji „najpewniej nobooking-prod" na fakt.

**Klucza `service_role` nie wysyłaj.**

---

## ETAP C — Migracja bazy (15 min)

Wykonać na **nobooking-prod** (tym z etapu A), **nie** na projekcie Casa Sol.

1. Supabase Dashboard → wybierz właściwy projekt → sprawdź w **Settings → API**,
   czy Project URL zgadza się z tym z etapu A
2. **SQL Editor → New query**
3. Wklej **sekcję 1a** z `docs/supabase/2026-09-05-p0-fixes.sql` (zapytanie
   o nakładające się rezerwacje) → **Run**
   - **pusty wynik** → dalej
   - **są wiersze** → zatrzymaj się, daj znać. Constraint się nie doda, dopóki
     nakładające się rezerwacje istnieją
4. Wklej **sekcję 1a-bis** (daty NULL / odwrócone) → **Run** → też ma być pusto
5. Dopiero teraz wklej **resztę pliku** (od `CREATE EXTENSION`) → **Run**
6. Uruchom sekcję **WERYFIKACJA** z końca pliku. Powinny wyjść trzy wyniki:
   constraint `bookings_no_overlap`, tabela `stripe_webhook_events`, kolumna
   `orders.provisioning_started_at`

Opcjonalnie: `docs/supabase/2026-09-05-p1-fixes.sql` (unieważnianie sesji po
zmianie hasła). Kod działa bez niej, więc można później.

---

## ETAP D — Stripe: endpoint dla kont połączonych (10 min)

Po zmianie na direct charges płatność gościa powstaje na koncie właściciela,
więc jej zdarzenie **nie trafia** do dotychczasowego endpointu. Bez tego kroku
rezerwacje nie będą się potwierdzać mimo pobranych pieniędzy.

1. Stripe Dashboard → **Developers → Webhooks**
2. **Add endpoint**
3. URL: `https://www.nobooking.eu/api/stripe/webhook` (ten sam co obecny)
4. W sekcji wyboru zaznacz, że nasłuchujesz zdarzeń **z kont połączonych**
   (*Listen to events on Connected accounts* / typ **Connect**)
5. Zdarzenie: `checkout.session.completed`
6. Po utworzeniu skopiuj **Signing secret** (`whsec_...`)
7. Vercel → `nobooking-landing` → Settings → Environment Variables →
   dodaj/zaktualizuj `STRIPE_WEBHOOK_SECRET`

> Istniejący endpoint typu *Account* **zostaw** — obsługuje zamówienia stron
> i odnowienia subskrypcji. Potrzebne są oba.

---

## ETAP E — Wdrożenie kodu (10 min)

Dopiero po C i D.

> **⚠️ WARUNEK: `CRON_SECRET` musi być ustawiony w Vercelu (Production).**
>
> Po tym wdrożeniu wszystkie pięć cronów odrzuca wywołania bez poprawnego
> sekretu. Dziś tylko `cleanup-pending-bookings` tak robi — i objawy wskazują,
> że od maja każde jego wywołanie kończy się 401 (rezerwacja `pending`
> z 2026-05-22 nigdy nie została anulowana, choć cron uruchamia się co 30 min
> i jego zapytanie ją znajduje). Pozostałe crony działają dziś tylko dlatego,
> że przy braku sekretu przepuszczają każde żądanie.
>
> Jeśli wdrożysz bez `CRON_SECRET`, przestaną działać provisioning nowych
> klientów, backup i przypomnienia o odnowieniu.
>
> 1. Vercel → `nobooking-landing` → Settings → Environment Variables → szukaj `CRON_SECRET`
> 2. Jeśli go nie ma: **Add** → nazwa `CRON_SECRET`, wartość: długi losowy ciąg, np. wynik
>    `openssl rand -hex 32` → środowisko Production → oznacz jako Sensitive
> 3. Vercel sam dołącza go do wywołań cronów — nic więcej nie trzeba konfigurować

```bash
cd "nobooking-landing"
git checkout main
git merge fix/p0-security-2026-09
git push
```

Jeśli deploy nie startuje sam — `vercel --prod` (najpierw `vercel login`,
token wygasł).

Po wdrożeniu sprawdź trzy rzeczy:

```bash
# 1. cron provisioningu ma być zamknięty — oczekiwane 401, dziś zwraca 200
curl -s -o /dev/null -w "%{http_code}\n" https://nobooking.eu/api/cron/provision-sites

# 2. strona apartamentu ma się otwierać
curl -s -o /dev/null -w "%{http_code}\n" https://nobooking.eu/sites/apart-sunny

# 3. kalendarz ma zwracać daty
curl -s https://nobooking.eu/api/sites/apart-sunny/availability
```

Potem **rezerwacja testowa na żywo** — to jedyny sposób sprawdzenia direct
charges i nowego webhooka. Załóż rezerwację na `apart-sunny`, zapłać, sprawdź:
- czy w panelu właściciela status zmienił się na `confirmed`
- czy w Stripe płatność wylądowała **na koncie połączonym**, nie na platformie
- czy przyszły maile potwierdzające

---

## ETAP F — Ożyw backup Nobookinga (5 min)

Backup nie działa od 2026-05-22: zwraca `Bucket not found`, bo `nobooking-prod`
nie ma bucketu `app-data`.

1. Supabase (**nobooking-prod**) → **Storage** → **New bucket**
2. Nazwa: `app-data`, **Private** (nie publiczny)
3. Sprawdź, czy `CRON_SECRET` jest ustawiony w Vercelu dla `nobooking-landing`
4. Poczekaj na nocny przebieg (02:00) albo wywołaj ręcznie:

```bash
curl -s -H "Authorization: Bearer <CRON_SECRET>" \
  https://nobooking.eu/api/cron/backup-bookings
```

5. **Otwórz powstały plik** w Storage → `backups/` i sprawdź, czy liczby
   wierszy się zgadzają. Nie polegaj na tym, że endpoint zwrócił `ok`
6. **Sprawdź pozostałe crony.** Vercel → `nobooking-landing` → Settings →
   Cron Jobs → przy każdym zadaniu zakładka logów. Jest dowód, że
   `cleanup-pending-bookings` nie działa: w bazie wisi rezerwacja `pending`
   z 2026-05-22 (Jan K., 15–26 paź), a cron powinien ją anulować po 2 godzinach.
   Możliwa przyczyna: plan Vercel Hobby dopuszcza tylko crony raz dziennie,
   a tu są zadania co minutę i co 30 minut

---

## ETAP G — Casa Sol: zacommituj backup (5 min)

Backup Casa Sol **działa** (codziennie 03:00, 130 kopii od maja), ale jego kod
jest nieśledzony przez gita, a wpis crona niezacommitowany. Przy następnym
`git clone` albo czystym deployu zniknie.

Masz tam 49 niezacommitowanych plików — przejrzyj je i zdecyduj, co z nimi.
Backup poprawiłem, nie commitując: obejmuje teraz wszystkie 8 tabel zamiast
samych rezerwacji, nie kasuje dobrej kopii przy pustym odczycie i zapisuje
kopię dzienną przed `latest`.

```bash
cd "casa-sol"
git status                      # przejrzyj co jest w toku
git add src/app/api/cron/backup-bookings vercel.json docs/
git commit -m "backup: pełna kopia wszystkich tabel + zabezpieczenie przed nadpisaniem pustą"
```

---

## ETAP H — Dokończenie odcięcia (później, bez pośpiechu)

`nobooking-prod` zawiera **kopię danych Casa Sol** — site `casasol-almadelmar`
z rezerwacjami gości, w wersji nowszej niż w bazie Casa Sol. Do pełnej
niezależności trzeba je stamtąd usunąć.

Nie rób tego teraz. Najpierw etapy A–G, potem daj znać — przygotuję SQL
z zapytaniem kontrolnym i skryptem weryfikującym, że po zmianie nie został
tam ani jeden wiersz Casa Sol.

Zostaje też do rozważenia: `nobooking-landing` leży w iCloud, w ścieżce ze
spacjami, przez co iCloud tworzy duplikaty plików psujące `tsc`. Przeniesienie
repo poza iCloud usunie klasę problemów, która wraca w każdej sesji.

---

## Gdyby coś poszło nie tak

| Objaw | Przyczyna | Co zrobić |
|---|---|---|
| Rezerwacje nie potwierdzają się po wdrożeniu | Brak endpointu Connect (etap D) albo zły `STRIPE_WEBHOOK_SECRET` | Stripe → Webhooks → zakładka zdarzeń, sprawdź odpowiedzi na `checkout.session.completed` |
| Webhook zwraca 500 przy każdym zdarzeniu | Etap C nie wykonany — brak tabeli `stripe_webhook_events` | Uruchom migrację, Stripe sam ponowi dostarczenia |
| `/api/cron/provision-sites` nadal 200 bez autoryzacji | Deploy nie doszedł albo brak `CRON_SECRET` | Sprawdź deployment w Vercelu i zmienne |
| Cokolwiek dziwnego z danymi Casa Sol | — | `casa-sol/docs/DIAGNOSTYKA-kalendarz.sql` (tylko odczyt) i kopia z `backups/casasol_bookings_latest.json` |
