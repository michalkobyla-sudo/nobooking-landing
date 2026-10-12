# Polityka prywatności — SZKIC

> **Stan: szkic do uzupełnienia i przeglądu.** Treść odzwierciedla to, co system
> faktycznie robi — inwentarz powstał 2026-10-12 z kodu i schematu bazy, nie
> z szablonu. Brakuje trzech danych identyfikujących administratora (zaznaczone
> `⟪…⟫`) oraz przeglądu przez kogoś, kto zna prawo. Nie publikować przed jednym
> i drugim.

## 1. Kto przetwarza Twoje dane

Administratorem danych jest ⟪PEŁNA NAZWA FIRMY⟫ z siedzibą w ⟪ADRES⟫,
NIP ⟪NIP⟫, prowadzący serwis **nobooking.eu**.

Kontakt we wszystkich sprawach dotyczących danych: **kontakt@nobooking.eu**.

## 2. Czyje dane i w jakiej roli

Serwis przetwarza dane **dwóch różnych grup** i w każdej występuje w innej roli.
To rozróżnienie jest istotne, bo wyznacza, do kogo kierować żądania.

**Właściciele apartamentów — nasi klienci.** Tu jesteśmy administratorem.
Przetwarzamy dane, które podajesz, zamawiając stronę i korzystając z panelu.

**Goście rezerwujący u naszych klientów.** Tu jesteśmy **podmiotem
przetwarzającym**: dane gościa należą do właściciela apartamentu, a my
przechowujemy je i udostępniamy w jego imieniu. Żądania dotyczące danych gościa
kierujemy do właściciela danej strony.

## 3. Jakie dane zbieramy

### Od właściciela apartamentu

| dane | skąd | po co |
|---|---|---|
| imię, nazwisko, e-mail, telefon | formularz zamówienia | realizacja umowy, kontakt |
| nazwa firmy, adres, NIP | formularz zamówienia, pole opcjonalne | faktura |
| opis apartamentu, adres, zdjęcia, ceny | formularz onboardingowy | wygenerowanie strony |
| numer telefonu do SMS-ów | panel, pakiet Pro | powiadomienia o rezerwacjach |
| hasło do panelu | nadane automatycznie | dostęp do panelu; przechowywane wyłącznie jako skrót `scrypt` z solą, nie da się go odczytać |
| źródło wejścia na stronę | parametry adresu (UTM), odsyłacz | sprawdzenie, która reklama działa |

### Od gościa rezerwującego

| dane | skąd | po co |
|---|---|---|
| imię i nazwisko, e-mail, telefon | formularz rezerwacji | obsługa rezerwacji |
| daty pobytu, liczba osób, kwota | formularz rezerwacji | realizacja rezerwacji |
| imiona osób i numery dokumentów | formularz check-in, pakiet Pro | obowiązek meldunkowy właściciela |
| treść opinii i ocena | formularz opinii | publikacja na stronie, po zatwierdzeniu |

**Numery dokumentów usuwamy automatycznie po 7 dniach od wyjazdu**
(`DNI_RETENCJI` w `src/lib/checkin.ts`, cron `cleanup-pending-bookings`).
To najwrażliwsza kategoria w całym systemie i nie trzymamy jej dłużej, niż
trwa powód jej zebrania.

## 4. Komu przekazujemy dane

Wyłącznie podmiotom, bez których usługa nie działa. Każdy z nich przetwarza
dane na nasze zlecenie, w zakresie wskazanym niżej.

| podmiot | co dostaje | po co |
|---|---|---|
| **Vercel** | ruch na stronie, adresy IP | hosting |
| **Supabase** | wszystkie dane z tabel | baza danych |
| **Stripe** | dane płatności, e-mail kupującego | obsługa płatności |
| **Brevo** | adres e-mail i treść wiadomości | wysyłka maili |
| **Twilio** | numer telefonu i treść SMS-a | wysyłka SMS-ów, pakiet Pro |
| **Anthropic** | opis apartamentu z formularza | wygenerowanie treści strony |
| **Google** | adres apartamentu | mapa osadzona na stronie |
| **YouTube** | — | filmy osadzone przez właściciela |

**Czego nie robimy:** nie sprzedajemy danych, nie przekazujemy ich do celów
marketingowych podmiotom trzecim i nie profilujemy użytkowników.

## 5. Ciasteczka i pamięć przeglądarki

**Nie używamy ciasteczek śledzących ani analitycznych.** Dlatego nie ma na
stronie banera zgody — nie ma na co jej zbierać.

Używamy dwóch rzeczy technicznych:

- **ciasteczko sesji panelu** — po zalogowaniu właściciela, ważne 7 dni,
  `httpOnly`, bez niego panel nie działa;
- **`localStorage`: zapis źródła wejścia** — która kampania Cię przyprowadziła.
  Zapisywany przy pierwszym wejściu, dołączany do zamówienia. Nie zawiera
  danych osobowych, nie opuszcza Twojej przeglądarki aż do złożenia zamówienia
  i możesz go skasować, czyszcząc dane strony.

Mapa Google i filmy YouTube osadzone na stronach apartamentów mogą ustawiać
własne ciasteczka — to działanie tych serwisów, podlegające ich politykom.

## 6. Jak długo trzymamy dane

| dane | okres |
|---|---|
| numery dokumentów z check-inu | 7 dni od wyjazdu, usuwane automatycznie |
| rezerwacje i opinie | przez czas działania strony właściciela |
| zamówienia i dane rozliczeniowe | przez okres wymagany przepisami podatkowymi |
| dane strony po wygaśnięciu | **nie są automatycznie usuwane** — strona przestaje być dostępna dla gości, dane zostają, żeby odnowienie przywróciło ją w całości. Usunięcie na żądanie |

## 7. Twoje prawa

Przysługuje Ci dostęp do danych, sprostowanie, usunięcie, ograniczenie
przetwarzania, przeniesienie oraz sprzeciw. Masz też prawo wniesienia skargi
do Prezesa Urzędu Ochrony Danych Osobowych.

Wszystkie żądania: **kontakt@nobooking.eu**. Odpowiadamy w ciągu 30 dni.

Jeśli jesteś gościem i rezerwowałeś pobyt przez stronę zbudowaną przez
Nobooking — Twoje dane należą do właściciela apartamentu. Napisz do niego;
jego adres znajdziesz na stronie, na której rezerwowałeś. Możesz też napisać
do nas, a my przekażemy.

## 8. Zmiany

O istotnych zmianach powiadomimy właścicieli apartamentów mailem. Data
ostatniej zmiany widnieje na dole strony.

---

## Do uzupełnienia przed publikacją

1. ⟪PEŁNA NAZWA FIRMY⟫ — jak w CEIDG albo KRS
2. ⟪ADRES⟫ — siedziba
3. ⟪NIP⟫

## Do rozstrzygnięcia z kimś, kto zna prawo

- **Umowy powierzenia z właścicielami.** Występujemy wobec gości jako podmiot
  przetwarzający, więc z każdym właścicielem powinna istnieć umowa powierzenia.
  Dziś jej nie ma. Najprościej wpleść ją w regulamin jako osobny rozdział.
- **Przekazywanie poza EOG.** Anthropic i Twilio to podmioty z USA. Opierają się
  na standardowych klauzulach umownych, ale warto to nazwać wprost.
- **Okres przechowywania zamówień** — „wymagany przepisami podatkowymi" to
  w praktyce 5 lat od końca roku; potwierdzić i wpisać liczbę.
