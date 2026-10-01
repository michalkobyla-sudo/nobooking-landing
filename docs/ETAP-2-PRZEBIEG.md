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
