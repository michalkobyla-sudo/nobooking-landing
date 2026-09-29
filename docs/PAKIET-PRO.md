# Pakiet Nobooking Pro

**1 199 zł / 299 € za 2 lata.** Jednorazowo, bez prowizji od rezerwacji.
Zawiera **wszystko z pakietu Basic** (`PAKIET-BASIC.md`) plus cztery funkcje
opisane niżej.

Źródło obietnic: `src/lib/translations.ts` → `proFeatures` i tabela porównawcza
(`compSms`, `compCheckin`, `compCodes`, `compAnalytics`).
Stan wdrożenia: `WERYFIKACJA-PAKIETOW-2026-09-29.md`.

Plan zapisany jest w `sites.plan` (`'basic' | 'pro'`) i przenoszony z zamówienia
przy provisioningu. Zmiana planu po zakupie nie ma dziś ścieżki w kodzie —
odbywa się zmianą wartości w bazie.

---

## 1. Powiadomienia SMS

**Obietnica:** właściciel dostaje SMS, gdy gość złoży rezerwację albo wyśle
wiadomość.

**Co jest w kodzie:** numer telefonu zbierany w onboardingu do
`orders.ob_sms_phone`, pokazywany w panelu administracyjnym Michała. Pole
formularza pojawia się tylko dla planu Pro (`OnboardingForm.tsx`).

**Czego brakuje:** wszystkiego poza zbieraniem numeru — dostawcy, konfiguracji
i samej wysyłki. Szczegóły w dokumencie weryfikacyjnym.

**Co trzeba dobudować** (szacunek, nie plan):

- wybór dostawcy: SMSAPI (polski, tani przy krajowych numerach) albo Twilio
  (międzynarodowy, prostsze API, droższy);
- `sites.sms_phone` — dziś numer siedzi w `orders`, a wysyłką zajmuje się kod
  operujący na `sites`;
- funkcja wysyłki obok `src/lib/email.ts`, z tą samą zasadą: awaria musi być
  widoczna dla agenta zdrowia (niezmiennik 13), a nie ginąć w cichym `catch`;
- podpięcie w webhooku Stripe, w tym samym miejscu, w którym idzie
  `sendOwnerBookingNotification`;
- kontrola kosztu: SMS kosztuje za sztukę, więc limit dzienny na stronę
  i wyłącznik w ustawieniach właściciela.

## 2. Online check-in

**Obietnica:** gość wypełnia formularz przed przyjazdem — dane dokumentu,
godzina przylotu, numer lotu; właściciel dostaje komplet przed przyjazdem gościa.

**Co jest w kodzie:** pole `orders.ob_checkin_fields` (tekst, lista dodatkowych
pól, których życzy sobie właściciel), zbierane w onboardingu tylko dla Pro,
pokazywane w panelu Michała. Makieta działającego formularza istnieje
w wersji demonstracyjnej (`/admin/demo/zamowienia`).

**Czego brakuje:** formularza dla gościa, miejsca na jego odpowiedzi i
powiadomienia dla właściciela.

**Co trzeba dobudować:**

- tabela `guest_checkins` albo kolumny w `bookings` na odpowiedzi gościa;
- trasa `/sites/[slug]/guest/[bookingId]/checkin` — dostęp tym samym
  identyfikatorem co portal gościa, z tym samym sprawdzeniem przynależności
  do strony (niezmiennik 3);
- e-mail do gościa X dni przed przyjazdem z linkiem do formularza (cron,
  wzorem `review-requests`);
- prezentacja odpowiedzi w panelu właściciela przy rezerwacji;
- **uwaga RODO**: dane dokumentu tożsamości to dane wrażliwe. Wymagają
  retencji (kasowanie po pobycie) i objęcia istniejącą ścieżką anonimizacji
  `DELETE /api/admin/guests/[email]`.

## 3. Kody rabatowe

**Obietnica:** właściciel tworzy kody rabatowe dla stałych gości.

**Co działa:** realizacja kodu przy rezerwacji. `POST /api/sites/[slug]/book`
sprawdza, że kod istnieje, jest aktywny, należy do tej strony, nie stracił
ważności i nie wyczerpał limitu użyć; dopiero wtedy nakłada rabat.
`POST /api/sites/[slug]/discount` waliduje kod przed złożeniem rezerwacji, żeby
gość widział kwotę po rabacie. Obie trasy odrzucają kody dla planu innego niż Pro
i są objęte limitem żądań, bo pozwalają zgadywać kody.

Rabat nakłada się na całość razem ze sprzątaniem i jest zaokrąglany do pełnej
jednostki (`wycen` w `bookingPricing.ts`, pokryte testami).

**Czego brakuje:** sposobu utworzenia kodu i zliczania użyć. Szczegóły
w dokumencie weryfikacyjnym.

**Struktura tabeli** `discount_codes`: `site_id`, `code` (wielkimi literami),
`discount_pct`, `max_uses` (null = bez limitu), `uses_count`, `valid_until`,
`active`.

## 4. Dashboard analityczny

**Obietnica:** właściciel widzi, jak idzie wynajem.

**Co jest:** `GET /api/sites/[slug]/owner/stats` liczy rezerwacje w bieżącym
miesiącu (z pominięciem anulowanych), przychód z rezerwacji `confirmed`
i `completed`, średnią ocenę z opinii i obłożenie. Zakładka „Analityka"
w panelu właściciela jest oznaczona jako Pro i ukryta dla planu Basic.

**Zastrzeżenie:** bramka jest dziś wyłącznie w interfejsie — sam endpoint nie
sprawdza planu. Opis w dokumencie weryfikacyjnym.

---

## Różnica względem Basic — podsumowanie

| Funkcja | Basic | Pro |
|---|---|---|
| Strona, kalendarz, rezerwacje, płatności | ✔ | ✔ |
| Panel właściciela, portal gościa | ✔ | ✔ |
| Powiadomienia e-mail | ✔ | ✔ |
| Cztery języki, galeria, mapa | ✔ | ✔ |
| Powiadomienia SMS | — | ✔ |
| Online check-in | — | ✔ |
| Kody rabatowe | — | ✔ |
| Dashboard analityczny | — | ✔ |
| Cena za 2 lata | 799 zł / 199 € | 1 199 zł / 299 € |
