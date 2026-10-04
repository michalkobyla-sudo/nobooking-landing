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

**Obietnica:** właściciel dostaje SMS, gdy gość złoży rezerwację.

**Stan: działa.** Kanał sprawdzony wysyłką 2026-10-01 — Twilio potwierdził
`delivered`, nadawca zachowany.

**Jak to działa:**

- Dostawca: **Twilio**, na **osobnym subkoncie** Nobookinga
  (`AC98af98e0…`), oddzielonym od konta Casa Sol — tak samo jak przy Stripe.
- Nadawca to nazwa, nie numer: `Nobooking`. W Polsce Alphanumeric Sender ID
  działa bez rejestracji, bez dodatkowej opłaty i **bez kupowania numeru**.
  Jest jednokierunkowy (odbiorca nie odpowie), co tu niczego nie psuje: te
  SMS-y idą do właściciela, nie do gościa.
- Numer odbiorcy siedzi w `sites.sms_phone`, nie w configu — config bywa
  nadpisywany przy regeneracji strony. Właściciel zmienia go w panelu razem
  z wyłącznikiem (`owner/settings`, bramka planu po stronie serwera).
- Wysyłka: `src/lib/smsSend.ts`, podpięta w webhooku Stripe obok
  `sendOwnerBookingNotification`. Zwraca wynik zamiast rzucać — nieudany SMS
  nie może przerwać potwierdzania rezerwacji.
- Treść bez polskich ogonków (`bezOgonkow`): diakrytyki przełączają kodowanie
  na UCS-2 i tną limit ze 160 znaków na 70, czyli jeden SMS robi się trzema.
- Kontrola kosztu: limit **30 SMS-ów na dobę na stronę**, liczony z `sms_log`.
  Przy błędzie odczytu licznika zawodzimy **na zamknięto** — lepiej nie wysłać
  jednego SMS-a niż wysłać tyle, ile przyjdzie zdarzeń.

**Co pilnuje agent zdrowia:** odrzucone poświadczenia Twilio, nieprawidłowego
nadawcę (sprawdzany bez wysyłania czegokolwiek, więc wyjdzie **przed**
pierwszą rezerwacją) i nieudane wysyłki z ostatniej doby, pogrupowane po
powodzie.

**Czego nie ma:** SMS-a przy wiadomości od gościa — portal gościa nie ma
skrzynki, tylko dane kontaktowe właściciela. Obietnica powyżej mówi o tym
zbyt szeroko i zostanie zawężona przy najbliższej zmianie oferty.

## 2. Online check-in

**Obietnica:** gość wypełnia formularz przed przyjazdem — dane dokumentu,
godzina przylotu, numer lotu; właściciel dostaje komplet przed przyjazdem gościa.

**Co działa:** gość otwiera formularz z portalu gościa, podaje dane osób,
godzinę przyjazdu i uwagi; właściciel widzi komplet przy rezerwacji w panelu.
Wpis można poprawiać do wyjazdu.

Dostępem jest znajomość identyfikatora rezerwacji, tak jak w portalu gościa,
więc serwer sprawdza trzy rzeczy: przynależność rezerwacji do strony, plan Pro
i to, czy termin jeszcze nie minął.

**Retencja:** dane znikają tydzień po wyjeździe (cron `cleanup-pending-bookings`).
Numer dokumentu to dane wrażliwe — po pobycie ich trzymanie jest samym ryzykiem.

Pole `orders.ob_checkin_fields` z onboardingu pozostaje opisem życzeń
właściciela co do dodatkowych pól; formularz ma dziś stały zestaw.

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

Licznik użyć zwiększa funkcja bazodanowa `increment_discount_usage`, wywoływana
z webhooka przy potwierdzeniu rezerwacji — atomowo, więc `max_uses` jest
wykonalne.

**Tworzenie kodu działa** (sprawdzone 2026-10-04; do 2026-09-29 tego brakowało
i dokument wymieniał to jako lukę). `GET/POST/PATCH /api/sites/[slug]/owner/discounts`,
wszystkie trzy za bramką `site.plan !== 'pro' → 403`, obsługa w zakładce panelu.
Nowy kod przechodzi przez `sprawdzNowyKod`, a zderzenie nazw zwraca 409
(`kod_juz_istnieje`) zamiast błędu bazy.

**Kodów nie da się skasować — celowo.** `bookings.discount_code` trzyma samą
nazwę, więc usunięcie wiersza zostawiłoby rezerwacje z rabatem, którego nie da
się już wytłumaczyć. Zamiast kasowania jest `PATCH` z `active: false`.

**Struktura tabeli** `discount_codes`: `site_id`, `code` (wielkimi literami),
`discount_pct`, `max_uses` (null = bez limitu), `uses_count`, `valid_until`,
`active`.

## 4. Dashboard analityczny

**Obietnica:** właściciel widzi, jak idzie wynajem.

**Co jest:** `GET /api/sites/[slug]/owner/stats` liczy rezerwacje w bieżącym
miesiącu (z pominięciem anulowanych), przychód z rezerwacji `confirmed`
i `completed`, średnią ocenę z opinii i obłożenie. Zakładka „Analityka"
w panelu właściciela jest oznaczona jako Pro i ukryta dla planu Basic.

**Bramka jest po obu stronach** (sprawdzone 2026-10-04; 2026-09-29 była tylko
w interfejsie, więc właściciel Basic mógł odczytać dane Pro, wołając trasę
wprost). `GET /api/sites/[slug]/owner/analytics` zwraca `403 pro_required`
dla planu innego niż Pro.

Rozdział tras jest zamierzony: `/owner/stats` to podsumowanie dla **każdego**
planu — rezerwacje w tym miesiącu, przychód, średnia ocena, najbliższe przyjazdy
— i dlatego nie ma bramki. Pełna analityka (`policzAnalitykę`, dwanaście
miesięcy wstecz) siedzi w `/owner/analytics` i jest wyłącznie Pro.

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
