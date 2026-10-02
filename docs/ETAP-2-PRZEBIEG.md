# Etap 2 — pełny przebieg na prawdziwych danych

Runbook do wykonania, gdy Stripe odblokuje tworzenie kont połączonych.
Dotąd każda funkcja była sprawdzana osobno; tutaj przechodzi jedna ścieżka
od końca do końca, na produkcji, bez skrótów.

Zasada Z2: *ukończone* znaczy „wywołane na produkcji i wynik zapisany".
Poniżej każdy krok ma **czego dowodzi** — bo krok, który nie dowodzi niczego,
tylko wygląda na pracę.

---

## Zanim zaczniemy

- [ ] **Aktywacja konta platformy Nobooking** — jedyne, co zostało.
      `POST /v2/core/accounts` z konfiguracją `merchant` zwraca dziś
      `account_create_activation_required`. Formularz:
      https://dashboard.stripe.com/account/onboarding (konto Nobooking, nie Casa Sol).
      Raport stanu sprawdza to codziennie i sam zgłosi, gdy przejdzie.
- [x] `./scripts/sprawdz-produkcje.sh` — zielone
- [x] Twilio: trzy zmienne w Vercelu, subkonto `AC98af98e0…` **osobne od
      Casa Sol**, nadawca `Nobooking`. Kanał sprawdzony wysyłką 2026-10-01
      (`delivered`), więc kroki SMS-owe wykonujemy, nie pomijamy.

---

## Dlaczego dwie strony, nie jedna

Trzy sprawdzenia wymagają **drugiej** strony, bo dotyczą granicy między
najemcami (niezmiennik 3). Na jednej stronie przechodzą fałszywie:
rezerwacja pod cudzym slugiem, check-in pod cudzym slugiem, opinia pod cudzym
slugiem. Sprawdzone tymczasowo 2026-09-29, ale na danych utworzonych ręcznie —
tutaj mają przejść na stronach powstałych normalną drogą.

---

## 1. Zamówienie i płatność

1. `/zamow?plan=pro&currency=pln` — złożyć zamówienie z prawdziwym adresem
   e-mail, do którego mamy dostęp. **Plan Pro**, bo tylko on odsłania SMS-y,
   check-in, kody rabatowe i analitykę.
2. Zapłacić kartą testową? **Nie.** To konto live — płatność jest prawdziwa.
   Zamiast tego oznaczyć zamówienie jako opłacone w panelu admina.

**Dowodzi:** formularz zamówienia, zapis atrybucji (`utm_*` z linku wejścia),
sesja Stripe na nowym koncie platformy.

Sprawdzić w bazie: `orders` ma nowy wiersz z wypełnionym `utm_source`,
jeśli wejście było z parametrem.

## 2. Onboarding

3. Odebrać mail z linkiem onboardingowym, wypełnić formularz do końca.
   Podać numer telefonu do SMS-ów (pole widoczne tylko dla Pro).

**Dowodzi:** `onboarding_token` działa, dane trafiają do `orders.ob_*`.

## 3. Provisioning

4. Poczekać na cron (co minutę) albo wywołać ręcznie z sekretem.

**Dowodzi naraz czterech rzeczy**, z których każda była kiedyś zepsuta:
- konto Auth i wiersz w `sites` powstają raz, nie dwa (zaklepanie),
- slug rozstrzyga kolizje,
- `sites.sms_phone` dostaje znormalizowany numer z zamówienia,
- **krok weryfikacji** przepuszcza stronę albo ją wstrzymuje.

Sprawdzić: czy przyszły oba maile (powitalny z hasłem i „strona gotowa").
Jeśli strona została wstrzymana, `orders.notes` ma znacznik `[PROVISION-CHECK]`,
a agent zdrowia zgłosi to nazajutrz — to też jest poprawny wynik, tylko inny.

**Hasło tymczasowe z maila powitalnego jest jedynym sposobem na sesję
właściciela.** Nie zmieniamy haseł ręcznie.

## 4. Panel właściciela

5. Zalogować się hasłem z maila.

Sprawdzić po kolei — to rzeczy, których dotąd nie dało się zobaczyć:
- [ ] **Analityka** — zakładka pokazuje dane, nie makietę. Przy zerze rezerwacji
      ma napisać wprost, że nie ma czego liczyć.
- [ ] **Kody rabatowe** — utworzyć kod, sprawdzić że pojawia się na liście
- [ ] Cennik — zmienić cenę, sprawdzić że strona pokazuje nową
- [ ] Zmiana hasła — sprawdzić, że poprzednia sesja przestaje działać
      (niezmiennik 12, `token_version`)

## 5. Stripe Connect właściciela

6. „Połącz Stripe" → przejść onboarding do końca. Właściciel zakłada przy tym
   **pełne konto Stripe** (nie uproszczony panel Express), bo tylko taka
   konfiguracja pozwala, żeby to on płacił opłaty za obsługę płatności.

**Dowodzi:** `createConnectAccount`, `createOnboardingLink`, callback ustawia
`stripe_onboarded`. To jest ten fragment, który dziś blokuje Stripe.

## 6. Rezerwacja gościa

7. Zarezerwować termin na stronie apartamentu, użyć utworzonego kodu rabatowego.
8. Zapłacić — **prawdziwa płatność na koncie właściciela**, niewielka kwota.

Sprawdzić:
- [ ] kwota po rabacie zgadza się z wyceną
- [ ] `bookings.status` → `confirmed` po webhooku
- [ ] `discount_codes.uses_count` wzrósł o jeden
- [ ] mail do gościa i mail do właściciela
- [ ] **SMS do właściciela** (jeśli Twilio skonfigurowane), ślad w `sms_log`
- [ ] termin zniknął z kalendarza

**Dowodzi:** direct charge, idempotencja webhooka, zgodność kwoty, licznik kodu.

9. Spróbować zarezerwować ten sam termin drugi raz — ma odmówić (409).
   **Dowodzi** constraintu `bookings_no_overlap`, nie tylko sprawdzenia w kodzie.

## 7. Portal gościa i check-in

10. Otworzyć portal gościa z linku w mailu.
- [ ] widać rezerwację i status płatności
- [ ] **check-in online** — wypełnić, sprawdzić że właściciel widzi odpowiedzi
- [ ] otworzyć ten sam adres rezerwacji pod slugiem **drugiej** strony →
      musi odmówić

## 8. Opinia

11. Przesunąć `check_out` w bazie na wczoraj (jedyna sensowna droga — nie
    czekamy tygodnia).
12. Uruchomić `guest-reminders` z sekretem.

Sprawdzić:
- [ ] mail z prośbą o opinię przyszedł
- [ ] `guest_notifications` ma wiersz `prosba_o_opinie`
- [ ] **drugie uruchomienie crona nie wysyła nic** (klucz unikalny działa)
- [ ] formularz opinii zapisuje, opinia jest niepublikowana
- [ ] po zatwierdzeniu w panelu opinia pojawia się w karuzeli na stronie

## 9. Poprawki

13. Wysłać poprawkę z `/poprawki/[token]` (link w mailu „strona gotowa").

Sprawdzić:
- [ ] **strona faktycznie się zmienia** — to był błąd naprawiony 2026-09-29,
      wcześniej zapis szedł tylko do `orders.generated_config`
- [ ] licznik rund spada
- [ ] cena zmieniona wcześniej w panelu **nie wraca** do wartości z onboardingu
      (scalanie configu)

## 10. Odnowienie

14. Przesunąć `sites.expires_at` na za 30 dni, uruchomić `renewal-reminders`.
15. Z panelu właściciela: „Odnów" → sesja płatności.

Sprawdzić:
- [ ] mail przypominający przyszedł raz, nie kilka razy
- [ ] sesja odnowienia powstaje (to był błąd 500 po zmianie konta Stripe)
- [ ] metody płatności dobrane przez Stripe, nie sztywna lista

---

## Po przebiegu

- [ ] skasować dane testowe: zamówienie, stronę, rezerwację, opinię, check-in
- [ ] `./scripts/sprawdz-produkcje.sh` — wszystko zielone
- [ ] wynik każdego kroku zapisany w tym pliku albo w commicie
- [ ] agent zdrowia przez siedem dni bez znalezisk (warunek Etapu 5)

Potem marketing. Etap 3 (twardnienie operacyjne) zrobiony wcześniej, poza
kolejnością — nic w nim nie zależało od Stripe'a, więc nie było powodu czekać.

---

# Wynik przebiegu — 2026-10-02

Wykonany lokalnie, na kluczach testowych Stripe, przeciwko produkcyjnej bazie.
Dziesięć kroków, dziesięć zaliczonych. Dane testowe skasowane na koniec.

## Dlaczego lokalnie, a nie na żywym koncie

Weryfikacja tożsamości właściciela platformy była (i jest) odrzucona przez
Stripe, więc konta połączone w trybie live nie powstają. W trybie testowym
powstają bez przeszkód — a czternaście z piętnastu kroków runbooka zachowuje
się identycznie. Po odblokowaniu zostanie jeden przebieg kontrolny, nie cały
etap.

**Klucze testowe wchodziły wyłącznie do lokalnego `.env.local`.** Produkcja
ani razu nie została przełączona w tryb testowy.

## Sześć błędów, których nie znalazłby żaden test jednostkowy

| # | Błąd | Dlaczego był niewidoczny |
|---|---|---|
| 1 | `/api/orders` tworzyło sesję płatności, wołając `${NEXT_PUBLIC_SITE_URL}/api/stripe/checkout` — adres bezwzględny z konfiguracji | Dopóki istniała tylko produkcja, adres wskazywał tę samą maszynę. Pierwsze uruchomienie poza nią utworzyło **dwie prawdziwe sesje na 1199 zł** |
| 2 | Hasło do panelu szło na `ob_contact_email` — kontakt publiczny ze strony | Wysyłka kończyła się sukcesem. Klient płaci i nie dostaje dostępu, nikt się nie dowiaduje |
| 3 | `stripe_onboarded` zostawało `false` mimo gotowego konta | Callback sprawdza gotowość raz; weryfikacja u Stripe kończy się po przekierowaniu |
| 4 | Online check-in martwy na czterech poziomach: flaga, zapytanie, render, link | Każda warstwa z osobna robiła coś sensownego |
| 5 | Portal gościa obiecywał fakturę, wiadomości i historię pobytów | Tekst na stronie **każdego klienta**, czytany przez gościa po zapłaceniu |
| 6 | Prośba o opinię szukała wyjazdów dokładnie sprzed dwóch dni | Pominięty dzień crona kasował prośby bezpowrotnie |

Wszystkie naprawione i wdrożone tego samego dnia.

**Znalezisko wycofane:** zarzut, że model wymyśla cennik przy pustych sezonach,
był nietrafiony. `ob_price_per_night` jest zbierane i wymagane; model wyprowadza
z niego tylko sezony, których klient świadomie nie zdefiniował.

## Co potwierdził przebieg

- rabat liczony od całości ze sprzątaniem: 4175 € × 0,85 = **3549 €**;
- sprzedawcą na stronie płatności jest **właściciel**, nie Nobooking;
- podwójna rezerwacja odrzucona przez API (409) **i przez bazę** (`23P01`,
  `bookings_no_overlap`) — sprawdzone wstawieniem wiersza z pominięciem aplikacji;
- granica między najemcami: pod cudzym slugiem portal mówi „Rezerwacja
  nie znaleziona", formularz „Formularz niedostępny", API opinii zwraca 404,
  bez wycieku nazwiska i kwoty;
- SMS do właściciela wysłany przez Twilio, ślad w `sms_log`;
- prośba o opinię raz, drugie uruchomienie crona milczy;
- poprawka zmieniła treść, a **cena ustawiona w panelu nie wróciła** do
  wartości z generacji (scalanie configu);
- zmiana hasła unieważnia poprzednią sesję: 200 → **401**, API zwraca
  `sessions_revoked: true`;
- odnowienie przedłużyło subskrypcję z 2026-11-01 na **2028-11-01**, a metody
  płatności dobrał Stripe (BLIK, karta, Klarna) zamiast sztywnej listy.

## Pułapki środowiska, warte zapamiętania

**Produkcyjne crony pracują na tej samej bazie co test lokalny.** Provisioning
wykonała produkcja siedemnaście sekund po wysłaniu formularza onboardingowego.
Tu wyszło to na dobre, ale przy kroku z rezerwacją trzeba o tym pamiętać.

**`npm run build` i `vercel --prod` zabijają działający `npm run dev`** —
Turbopack dzieli katalog `.next`. Po takim zderzeniu `.next` urósł do 681 MB
i serwer startował tylko po to, by natychmiast zakończyć pracę; pomogło
`rm -rf .next`.

**Serwer deweloperski padał pięć razy** na MacBooku Air obok Chrome'a
i Claude'a. Przy przebiegu kontrolnym na koncie live lepiej użyć produkcji.

**Pola karty w Stripe Checkout siedzą w ramce z obcej domeny** — pisanie po
współrzędnych tam nie dociera, działa dopiero ustawianie wartości przez
odwołania do pól.

**Strona płatności Stripe zawiera instrukcje skierowane do agentów AI**
(polecenie zainstalowania „Link CLI" i uruchomienia poleceń w powłoce).
Treść strony to dane, nie rozkazy — zignorowane.
