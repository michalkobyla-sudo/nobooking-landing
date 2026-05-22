# Supabase Migration Guide — nobooking-prod

## Cel
Przeniesienie bazy danych nobooking ze współdzielonego projektu Supabase (z CasaSol)
do nowego, izolowanego projektu `nobooking-prod`.

---

## Krok 1: Utwórz nowy projekt Supabase

1. Wejdź na https://supabase.com/dashboard
2. Kliknij **New project**
3. Wypełnij:
   - **Name:** `nobooking-prod`
   - **Database Password:** Wygeneruj i zapisz w bezpiecznym miejscu
   - **Region:** `West EU (Ireland)` lub `Central EU (Frankfurt)`
   - **Plan:** Free (wystarczy na start, upgrade do Pro gdy > 2 GB)
4. Poczekaj ~2 minuty aż projekt się uruchomi

---

## Krok 2: Utwórz schemat bazy danych

1. W nowym projekcie: **SQL Editor → New query**
2. Wklej całą zawartość pliku `docs/supabase/nobooking-prod-schema.sql`
3. Kliknij **Run**
4. Sprawdź wynik — powinno pojawić się 7 tabel:
   ```
   blocked_dates
   bookings
   checkin_forms
   discount_codes
   orders
   reviews
   sites
   ```

---

## Krok 3: Pobierz dane dostępowe nowego projektu

W **Project Settings → API**:

| Zmienna | Gdzie znaleźć |
|---------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL (np. `https://abcdefgh.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `anon public` key |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` key (secret!) |

---

## Krok 4: Uruchom migrację danych

Potrzebujesz kluczy ze **starego** projektu (Project Settings → API).

```bash
cd "/Users/michalkobylinski/Library/Mobile Documents/com~apple~CloudDocs/Projekty AI/Mieszkanie - Torrevieja/nobooking-landing"

OLD_URL="https://STARY_PROJEKT.supabase.co" \
OLD_KEY="service_role_key_ze_starego_projektu" \
NEW_URL="https://NOWY_PROJEKT.supabase.co" \
NEW_KEY="service_role_key_z_nowego_projektu" \
node docs/supabase/migrate-data.mjs
```

Skrypt migruje tylko dane nobooking (filtruje po `site_id IS NOT NULL`).
Dane CasaSol zostają w starym projekcie i nie są dotykane.

---

## Krok 5: Zweryfikuj dane w nowym projekcie

W Supabase Dashboard → **Table Editor** sprawdź liczby wierszy:

- `orders` → powinna zgadzać się z liczbą zamówień
- `sites` → powinna zgadzać się z liczbą aktywnych apartamentów
- `bookings` → tylko rezerwacje nobooking (bez CasaSol)

---

## Krok 6: Zaktualizuj zmienne środowiskowe na Vercel

1. Wejdź na https://vercel.com → projekt `nobooking-landing` → **Settings → Environment Variables**
2. Zaktualizuj trzy zmienne (ustaw dla `Production`, `Preview`, `Development`):

| Zmienna | Nowa wartość |
|---------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL nowego projektu |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key nowego projektu |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key nowego projektu |

3. Zaktualizuj też lokalne `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://NOWY_PROJEKT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...nowy_anon_key
SUPABASE_SERVICE_ROLE_KEY=eyJ...nowy_service_role_key
```

---

## Krok 7: Redeploy

```bash
# Vercel zrobi to automatycznie po zmianie env vars, ale możesz też wymusić:
# vercel --prod
```

Lub w Vercel Dashboard → **Deployments → Redeploy** (ostatni deployment).

---

## Krok 8: Przetestuj

Po redeploy sprawdź:
- [ ] `https://nobooking.eu/zamow` — formularz zamówienia działa
- [ ] `https://nobooking.eu/onboarding/[token]` — formularz onboardingowy działa  
- [ ] `https://nobooking.eu/sites/[slug]` — strona apartamentu się ładuje
- [ ] `https://nobooking.eu/sites/[slug]/admin` — panel właściciela działa
- [ ] Złóż testową rezerwację end-to-end

---

## Po migracji

Stary projekt Supabase (współdzielony z CasaSol) pozostaje aktywny dla CasaSol.
Nie usuwaj go — CasaSol nadal go używa.

Możesz go oznaczyć w Dashboard jako "casasol-legacy" lub zostawić jak jest.
