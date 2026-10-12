# Podatki i fakturowanie — analiza i plan integracji

> **Czym to jest i czym nie jest.** Analiza na podstawie researchu z 2026-10-12
> oraz znajomości kodu Nobookinga. **To nie jest porada podatkowa.** Stawki,
> progi i terminy weryfikuj u księgowego albo doradcy — poniżej jest napisane,
> które pytania mu zadać i dlaczego akurat te.
>
> Założenie: **JDG**, start bez klientów, przychód pierwszego roku rzędu
> 20–40 tys. zł.

---

## 1. Ryczałt: 8,5% czy 12%

### Co mówią przepisy

Stawka **12%** obejmuje przychody ze świadczenia usług **związanych
z oprogramowaniem** (PKWiU ex 62.01.1). Stawka **8,5%** jest residualna —
przysługuje działalności usługowej, której nie obejmuje żadna wyższa stawka
(art. 12 ust. 1 pkt 5 ustawy o ryczałcie).

Przedrostek „ex" zawęża: 12% stosuje się wyłącznie do tych usług z grupowania,
które faktycznie są związane z oprogramowaniem.

### Gdzie jest prawdziwe pytanie

Nie w tym, czy piszemy kod — tylko **jak klasyfikuje się to, co sprzedajemy**.

| odczyt | PKWiU | stawka |
|---|---|---|
| sprzedajemy usługę wytworzenia oprogramowania (strony) | 62.01.1 | **12%** |
| sprzedajemy usługę hostingu i przetwarzania danych | 63.11 | **8,5%** |

Za pierwszym przemawia to, że strona powstaje na zamówienie, a klient dostaje
cztery rundy poprawek — to wygląda na wytworzenie oprogramowania.

Za drugim przemawia to, że klient nie nabywa praw do kodu, nie dostaje
repozytorium ani licencji na oprogramowanie. Kupuje **dostęp do działającej
strony na dwa lata** wraz z hostingiem, domeną i pocztą — czyli usługę ciągłą,
nie dzieło. Cennik jest skonstruowany jako abonament dwuletni z odnowieniem,
a nie jako wycena projektu.

**Moja ocena: bliżej 12%, ale sprawa nie jest oczywista** i organy od 2023 roku
czytają „związek z oprogramowaniem" szeroko.

### Ile to kosztuje

Przy 30 tys. zł przychodu różnica to **około 1 050 zł rocznie**. Przy 100 tys.
— 3 500 zł.

### Co zrobić

1. **Na start przyjmij 12%.** Zaniżona stawka to zaległość z odsetkami;
   zawyżona to nadpłata, którą odzyskasz.
2. **Przy przychodzie powyżej ~50 tys. zł rocznie złóż wniosek o interpretację
   indywidualną do KIS** (opłata 40 zł, odpowiedź do 3 miesięcy). Przy tej
   skali różnica zaczyna przewyższać koszt i czas wniosku, a interpretacja
   chroni wstecz.
3. We wniosku opisz **model**, nie technologię: abonament dwuletni, brak
   przeniesienia praw do kodu, hosting i domena w cenie, odnowienie.

---

## 2. VAT OSS — czy i od kiedy

### Zasada

Sprzedaż usług elektronicznych **konsumentom** (B2C) z innych krajów UE podlega
VAT **w kraju konsumenta**. Dopóki łączna wartość takiej sprzedaży nie
przekroczy **10 000 EUR netto rocznie** (około 42 tys. zł), można rozliczać ją
jak krajową. Próg liczy się łącznie dla roku bieżącego i poprzedniego.

Po przekroczeniu — stawka kraju konsumenta, od transakcji, która próg
przekroczyła. Rejestracja do OSS: formularz **VIU-R** przez e-Urząd Skarbowy,
deklaracje **VIU-DO** kwartalnie, kwoty w euro.

### Co to znaczy dla Nobookinga

**Dziś prawdopodobnie nie dotyczy, ale dotknie szybciej, niż się wydaje.**

Model jest z założenia transgraniczny: cennik ma przełącznik **PLN/EUR**, strona
jest w czterech językach, a apartamenty leżą w Hiszpanii. Część właścicieli
będzie mieszkać za granicą.

Kluczowe rozróżnienie, które **już jest w kodzie**: formularz zamówienia ma
pole `invoice_nip` i jest **opcjonalne**.

| kto kupuje | co to znaczy dla VAT |
|---|---|
| firma z UE z numerem VAT-UE | odwrotne obciążenie (art. 28b), **nie wlicza się do progu OSS** |
| osoba prywatna z UE | usługa elektroniczna B2C, **wlicza się do progu** |
| ktokolwiek z Polski | krajowa, poza OSS |

Czyli: **to, czy klient poda NIP, decyduje o reżimie VAT.** Dziś pole jest
opcjonalne i nikt go nie weryfikuje.

### Co zrobić

1. **Nie rejestruj się do OSS na start.** Zgłoszenie jest wiążące na dwa lata,
   a przy zerowej sprzedaży zagranicznej to tylko kwartalne deklaracje do
   składania.
2. **Zacznij liczyć od pierwszej sprzedaży zagranicznej.** Potrzebny jest licznik
   sprzedaży B2C do UE narastająco — propozycja techniczna w części 4.
3. **Zarejestruj się, zanim przekroczysz 10 000 EUR**, nie po.

---

## 3. VAT dobrowolnie — czy warto

### Limit

Od 1 stycznia 2026 zwolnienie podmiotowe przysługuje do **240 000 zł**
(wcześniej 200 000). Przy działalności zaczętej w trakcie roku limit liczy się
proporcjonalnie.

### Rachunek dla Nobookinga

**Przeciw wejściu w VAT:**

- Klientem jest **właściciel apartamentu na wynajem krótkoterminowy**. Wielu
  z nich rozlicza najem ryczałtem i **sami nie są vatowcami** — dla nich VAT na
  fakturze to czysty koszt. 799 zł netto + VAT to dla takiego klienta 983 zł.
- Przy zwolnieniu wystawiasz 799 zł i tyle kosztuje. Twoja marża bez zmian,
  cena dla klienta niższa o 23%.

**Za wejściem w VAT:**

- Odliczasz VAT od kosztów: Vercel, Supabase, Anthropic, Twilio, Brevo, domeny.
  Przy obecnej skali to rzędu kilkudziesięciu–kilkuset złotych miesięcznie.
- Klienci będący firmami i vatowcami nie odczuwają różnicy.

**Wniosek: przy obecnej skali zwolnienie wygrywa.** Odliczenia nie pokryją
utraconej przewagi cenowej wobec klientów niebędących vatowcami.

### Kiedy to się odwróci

- przychód zbliża się do 240 tys. zł — wtedy VAT i tak nadejdzie, lepiej wejść
  planowo niż w połowie transakcji, która przekroczy limit;
- okaże się, że większość klientów to firmy na VAT;
- pojawią się duże zakupy inwestycyjne.

> **Uwaga o KSeF.** Obowiązek wystawiania faktur w KSeF obejmuje podatników VAT:
> od 1 lutego 2026 największych, od 1 kwietnia 2026 pozostałych, a od
> **1 stycznia 2027** wszystkich, niezależnie od obrotu. Przy zwolnieniu
> podmiotowym obowiązek jest odroczony, ale integracja i tak powinna być na to
> gotowa — i jest, bo wybrany program obsługuje wysyłkę do KSeF.

---

## 4. Program księgowy i plan integracji

### Wybór: **ifirma**

| kryterium | dlaczego ifirma |
|---|---|
| faktura bez VAT | osobny typ „faktura krajowa (nievatowiec)" |
| **faktura w walucie obcej dla nievatowca** | osobny typ — krytyczne, bo sprzedajemy w EUR |
| OSS / IOSS | typy dokumentów gotowe, gdy przekroczymy próg |
| B2B UE (art. 28b) | typ „świadczenie usług dla podatników VAT-UE" |
| KSeF | endpoint wysyłki, gotowy przed 2027 |
| wysyłka faktury mailem | endpoint — nie musimy robić tego sami |
| limity API | 15 000/dobę, 100/min — przy naszej skali bez znaczenia |

Alternatywy odrzucone: **Fakturownia** ma prostsze API, ale słabsze wsparcie
polskich reżimów VAT; **wFirma** i **inFakt** są porównywalne, ale ifirma ma
najlepiej opisane przypadki nievatowca w walucie obcej, czyli dokładnie nasz.

### Uwierzytelnianie

Nagłówek `Authentication` w postaci `IAPIS user=<login>, hmac-sha1=<hash>`.
Podpisywany ciąg to **URL + login + nazwa klucza + treść żądania**, sklejone
w tej kolejności, hashowane HMAC-SHA1 kluczem z panelu. Przy parametrach
w adresie podpisuje się URL **bez** parametrów.

Klucz ma nazwę określającą zakres: `faktura` wystarczy do wystawiania.

### Gdzie wpiąć w kod

Naturalny punkt to **webhook Stripe**, w miejscu, gdzie zamówienie dostaje
`stripe_paid`. Tam jest już wszystko potrzebne:

```
src/app/api/stripe/webhook/route.ts
  checkout.session.completed
    → oznaczenie zamówienia jako opłacone
    → maile                                  (istnieje)
    → SMS do właściciela                      (istnieje)
    → ZAŁOŻENIE: wystawienie faktury          (do dodania)
```

Dane kontrahenta są już w `orders`: `first_name`, `last_name`, `email`,
`invoice_company`, `invoice_nip`, `invoice_address`. Kwota i waluta
w `PRICES[plan][currency]`.

### Zasady, których trzeba trzymać

Wynikają z niezmienników projektu, nie z widzimisię:

1. **Nie przerywa potwierdzenia płatności.** Tak jak SMS: funkcja zwraca wynik,
   nie rzuca. Klient zapłacił — faktura nie może tego cofnąć (niezmiennik 13).
2. **Idempotencja.** Kolumna `orders.invoice_id`; gdy niepusta, nie wystawiamy
   drugi raz. Webhook Stripe potrafi przyjść dwa razy, a drugiej faktury się
   nie cofa.
3. **Każda porażka widoczna.** Wpis do logu z powodem plus pozycja w raporcie
   zdrowia: *zamówienia opłacone bez faktury*. Cicha porażka fakturowania to
   zaległość podatkowa, nie usterka.
4. **Typ dokumentu wybierany z danych, nie na sztywno.** Decyduje kraj nabywcy
   i obecność NIP-u — patrz tabela w części 2.

### Etapy

**Etap 1 — przed pierwszą sprzedażą** *(dzień pracy)*
- konto ifirma, klucz API o nazwie `faktura`
- migracja: `orders.invoice_id`, `orders.invoice_error`, `orders.invoice_at`
- `src/lib/faktury.ts` — czysta logika: wybór typu dokumentu, budowa ciała,
  podpis HMAC. Testy bez sieci, tak jak `smsSend.test.ts`
- wpięcie w webhook, za `stripe_paid`
- raport zdrowia: *opłacone bez faktury*

**Etap 2 — przy pierwszej sprzedaży zagranicznej** *(pół dnia)*
- rozpoznanie kraju nabywcy — dziś `orders` go **nie zapisuje**; dodać pole
  i pobierać ze Stripe (`customer_details.address.country` z sesji)
- walidacja NIP-u UE przez VIES, gdy podany
- licznik sprzedaży B2C do UE narastająco + ostrzeżenie w raporcie zdrowia
  przy 80% progu 10 000 EUR

**Etap 3 — przy rejestracji do OSS albo VAT** *(dzień)*
- przełączenie typu dokumentu na OSS
- stawki VAT kraju konsumenta
- przy wejściu w VAT: KSeF przez endpoint ifirma

### Czego w kodzie dziś brakuje

Znalezione przy pisaniu tego planu, warte odnotowania niezależnie od fakturowania:

- **`orders` nie zapisuje kraju nabywcy.** Bez niego nie da się rozstrzygnąć
  reżimu VAT ani liczyć progu OSS. Stripe go zna — `customer_details.address`
  w sesji Checkout. Do dodania w etapie 1, nie 2.
- **Pole NIP przyjmuje wyłącznie polski format** — `OrderForm.tsx:87` wymaga
  dokładnie dziesięciu cyfr. Hiszpańska firma nie wpisze tam `ESB12345678`,
  bo formularz odrzuci wartość z komunikatem „NIP musi zawierać 10 cyfr".
  **Ścieżka odwrotnego obciążenia jest więc dziś niedostępna**: klient
  z firmy w UE nie ma jak podać numeru VAT-UE, a bez niego jego zakup trafia
  do puli B2C i wlicza się do progu OSS. Walidacja nie jest zepsuta — jest
  napisana pod jeden kraj, a produkt sprzedaje się w czterech językach.
- **Formularz nie zbiera zgody na rozpoczęcie usługi przed upływem 14 dni**
  na odstąpienie — osobna sprawa, opisana w szkicu regulaminu, ale dotyka tego
  samego formularza.

---

## Co zrobić w jakiej kolejności

| kiedy | co |
|---|---|
| teraz | rejestracja JDG, ryczałt **12%**, bez VAT, bez OSS |
| przed pierwszą sprzedażą | konto ifirma + Etap 1 integracji |
| przy pierwszej sprzedaży zagranicznej | Etap 2 — kraj nabywcy, VIES, licznik progu |
| przychód ~50 tys. zł | wniosek o interpretację co do stawki ryczałtu |
| sprzedaż B2C do UE blisko 10 000 EUR | rejestracja VIU-R do OSS |
| przychód blisko 240 tys. zł | planowe wejście w VAT + KSeF |

## Pytania do księgowego

Zadaj te trzy, z konkretami, nie „co lepiej":

1. Sprzedaję dostęp do strony rezerwacyjnej na 2 lata — hosting, domena, panel,
   bez przeniesienia praw do kodu. **PKWiU 62.01.1 czy 63.11, i jaka stawka
   ryczałtu?**
2. Sprzedaję w PLN i EUR osobom prywatnym oraz firmom z UE. **Od kiedy liczyć
   próg 10 000 EUR i jak udokumentować status nabywcy?**
3. Przy przychodzie 20–40 tys. zł rocznie — **zwolnienie podmiotowe czy VAT
   dobrowolnie**, biorąc pod uwagę, że większość klientów to osoby fizyczne
   rozliczające najem ryczałtem?

---

## Źródła

Research 2026-10-12. Serwisy branżowe, nie teksty ustaw — przed decyzją
potwierdź w Dzienniku Ustaw albo u doradcy.

- [Ryczałt w IT 2026 — 12% czy 8,5%](https://plumm.pl/wiedza/ryczalt-it)
- [Stawka 8,5% dla usług informatycznych](https://poradnikprzedsiebiorcy.pl/-zastosowanie-stawki-8-5-dla-uslug-informatycznych)
- [Jaki ryczałt dla programisty (ifirma)](https://www.ifirma.pl/blog/jaki-ryczalt-dla-programisty-85-czy-12-stawka-ryczaltu-dla-informatykow/)
- [Interpretacja KIS 0113-KDIPT2-1.4011.54.2025.2.AP](https://www.inforlex.pl/dok/tresc,FOB0000000000006902422,Wlasciwa-stawka-ryczaltu-dla-uslug-informatycznych-zgodnie-z-PKWiU-62-01-12-0-i-powiazaniem-z-oprogramowaniem-Interpretacja-indywidualna-z-dnia-26-marca-2025-r-Dyrektor-Krajowej-Informacji-Skarbowej.html)
- [VAT OSS 2026 — sprzedaż do UE](https://plumm.pl/wiedza/vat-oss)
- [VAT OSS — procedura One Stop Shop 2026](https://biuroadler.pl/publikacje/vat-oss-jak-rozliczyc-sprzedaz-do-klientow-z-ue-procedura-one-stop-shop-2026/)
- [Nowy limit zwolnienia z VAT od 2026 — 240 tys. zł](https://ksiegowosc.infor.pl/wiadomosci/6852348,nowy-limit-zwolnienia-z-vat-od-2026-roku-240-tys-zl-sejm-uchwalil-nowelizacje-ustawy-o-podatku-od-towarow-i-uslug.html)
- [Limit zwolnienia podmiotowego w VAT 2026](https://poradnikprzedsiebiorcy.pl/-limit-zwolnienia-podmiotowego-w-vat)
- [Harmonogram KSeF 2026–2027](https://jpk.info.pl/faktury/e-faktura-ustrukturyzowana-ksef/harmonogram/)
- [KSeF obowiązkowy od 2026 — ustawa podpisana](https://www.crowe.com/pl/insights/ksef-obowiazkowy-od-2026-r-prezydent-podpisal-ustawe)
- [ifirma API — dokumentacja](https://api.ifirma.pl/)
- [ifirma API — nagłówek autoryzacji](https://api.ifirma.pl/naglowek-autoryzacji/)
