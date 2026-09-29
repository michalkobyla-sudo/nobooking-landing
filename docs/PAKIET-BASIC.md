# Pakiet Nobooking Basic

**799 zł / 199 € za 2 lata.** Jednorazowo, bez prowizji od rezerwacji.
Po 2 latach pakiet odnowieniowy (cena zamrożona w chwili zakupu,
`sites.renewal_price_pln` / `renewal_price_eur`).

Źródło obietnic: `src/lib/translations.ts` → `basicFeatures` i `features`.
To jest dokument referencyjny: opisuje, **co klient kupuje** i **gdzie to żyje
w kodzie**. Stan wdrożenia każdej pozycji: `WERYFIKACJA-PAKIETOW-2026-09-29.md`.

---

## 1. Serwer, domena i poczta na 2 lata

Strona stoi na Vercelu w projekcie `nobooking-landing`, pod adresem
`nobooking.eu/sites/<slug>`. Slug nadaje provisioning i rozstrzyga kolizje nazw
(`nazwa`, `nazwa-2`, …) — patrz `insertSiteWithFreeSlug`.

Własna domena klienta jest zbierana w onboardingu (`orders.ob_domain`) i podpinana
**ręcznie** w ustawieniach projektu Vercel. To usługa, nie automat — w kodzie nie
ma nic, co tworzyłoby domenę samo.

Poczta wychodzi przez Brevo z adresu `noreply@nobooking.eu` (`src/lib/email.ts`).

Ważność liczy `sites.expires_at`, ustawiane na 2 lata przy provisioningu.
Cron `renewal-reminders` przypomina D-90/30/14/7/1 i wyłącza stronę po 14 dniach
karencji.

## 2. Kalendarz i rezerwacje online

- **Dostępność**: `GET /api/sites/[slug]/availability` zwraca zajęte dni —
  sumę rezerwacji o statusie `confirmed` i `pending` oraz ręcznych blokad
  z `blocked_dates`. Dzień wyjazdu nie jest zajęty.
- **Rezerwacja**: `POST /api/sites/[slug]/book` sprawdza daty, pojemność,
  minimalną liczbę nocy, kolizje, wycenia pobyt i tworzy sesję płatności.
- **Ochrona przed podwójną rezerwacją**: constraint `bookings_no_overlap`
  w bazie (btree_gist). Sprawdzenie w kodzie ma okno wyścigu i nie wystarcza —
  o rozstrzygnięciu decyduje baza, która zwraca `23P01`, a trasa zamienia to
  na 409 `dates_unavailable`.
- **Sprzątanie**: cron `cleanup-pending-bookings` co 30 minut anuluje rezerwacje
  `pending` starsze niż 2 h, żeby nie blokowały terminów.

## 3. Płatności Stripe

Model: **direct charges na koncie właściciela** (`stripeAccount`).
Właściciel jest merchant of record, płaci prowizję Stripe, jego firma widnieje
na wyciągu gościa. Nobooking nie bierze prowizji od rezerwacji.

**Metody płatności ustala konto właściciela, nie Nobooking.** Kod świadomie nie
podaje `payment_method_types` — sztywna lista wywraca całą sesję, gdy choć jednej
metody brakuje na koncie albo nie pasuje do waluty (niezmiennik 16). Obietnica
„karta, BLIK, P24" jest więc prawdziwa dla właściciela z polskim kontem Stripe,
który ma te metody włączone; dla konta zagranicznego lista będzie inna.

Płatności działają dopiero po ukończeniu onboardingu Connect przez właściciela.
Do tego czasu `/book` zwraca 402, a strona pokazuje dane kontaktowe zamiast
przycisku płatności.

## 4. Panel administracyjny właściciela

`/sites/[slug]/admin` — logowanie własnym hasłem (HMAC, nie Supabase Auth,
bo panel jest per-strona, nie per-użytkownik).

Zakładki: pulpit, rezerwacje, goście, cennik, kalendarz, opinie, ustawienia,
subskrypcja. Analityka i kody rabatowe są oznaczone jako Pro.

Bezpieczeństwo: zmiana hasła unieważnia pozostałe sesje przez `sites.token_version`;
logowanie i zmiana hasła są objęte limitem żądań (`src/proxy.ts`).

## 5. Portal gościa

`/sites/[slug]/guest/[bookingId]` — gość widzi swoją rezerwację, status płatności
i dane kontaktowe właściciela. Dostępem jest znajomość identyfikatora rezerwacji.

Rezerwacja musi należeć do strony z adresu (niezmiennik 3) — bez tego ten sam
link otwierał się pod slugiem dowolnego innego klienta.

## 6. System opinii

Zamierzony przepływ: e-mail po pobycie → formularz gościa → moderacja
w panelu właściciela → karuzela na stronie apartamentu.

Cały obieg działa od 2026-09-29. Opinia trafia do bazy niepublikowana —
treść jest publiczna i firmowana marką właściciela, więc pojawia się dopiero
po jego zatwierdzeniu. Jedna opinia na rezerwację; gość może ją poprawić.

Karuzela bierze opinie z tabeli, a teksty z configu zostają treścią zastępczą
dla stron, które jeszcze żadnej nie zebrały.

## 7. Powiadomienia e-mail

Wysyłane przez Brevo:

| Kiedy | Do kogo | Funkcja |
|---|---|---|
| Nowe zamówienie strony | Michał | `sendNewOrderNotification` |
| Po opłaceniu strony | klient | `sendOnboardingEmail` |
| Onboarding wypełniony | Michał | `sendOnboardingSubmittedNotification` |
| Strona gotowa | klient | `sendOwnerWelcomeEmail`, `sendSiteReadyEmail` |
| Poprawki wyczerpane | klient | `sendRevisionCompleteEmail` |
| Rezerwacja potwierdzona | gość | `sendBookingConfirmation` |
| Rezerwacja potwierdzona | właściciel | `sendOwnerBookingNotification` |
| Raport stanu systemu | Michał | `sendHealthReport` |

## 8. Cztery języki

Strona apartamentu renderuje się w `pl`, `en`, `es`, `de`. Teksty własne
apartamentu (opis, hasło, udogodnienia, opinie, okolica) są w configu jako
obiekty czterojęzyczne; interfejs strony ma własne tłumaczenia w
`ApartmentPage.tsx`. Przełącznik języka zapamiętuje wybór.

## 9. Galeria zdjęć i wideo

`config.photos[]` — każdy wpis ma `url`, `alt` i opcjonalny `videoUrl`
(osadzenie YouTube). Zdjęcie z wideo otwiera modal z odtwarzaczem.

## 10. Kalkulator ceny z sezonami

`src/lib/bookingPricing.ts` — czysta logika, pokryta testami.

- Trzy sezony: **wysoki** (VII–IX), **średni** (V, VI, X), **niski** (pozostałe).
- O sezonie decyduje **miesiąc przyjazdu**; pobyt na przełomie liczy się
  w całości po stawce sezonu, w którym się zaczyna. To decyzja produktowa, nie błąd.
- Każdy sezon ma własną cenę za noc i minimalną liczbę nocy.
- Do kwoty dochodzi jednorazowa opłata za sprzątanie.
- Rabat procentowy nakłada się na całość razem ze sprzątaniem, zaokrąglany
  do pełnej jednostki.
- Kwota przeliczana na grosze przez `Math.round`, bo Stripe przyjmuje najmniejszą
  jednostkę waluty — błąd tutaj oznacza pobranie stukrotnie za dużo albo za mało.
- Maksymalna długość pobytu: 365 nocy, sprawdzana **przed** rozwinięciem zakresu dat.

## 11. Mapa i okolica

`config.map.embedUrl` — osadzona mapa Google. `config.map.nearby[]` — lista
atrakcji z ikoną, nazwą (czterojęzyczną) i odległością.

---

## Czego pakiet Basic nie obejmuje

Powiadomienia SMS, online check-in, kody rabatowe i dashboard analityczny —
to pakiet Pro (`PAKIET-PRO.md`).
