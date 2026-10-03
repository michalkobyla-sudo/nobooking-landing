# Nazewnictwo kampanii — konwencja UTM

Etap 4a planu wskazuje to jako rzecz do ustalenia **przed pierwszą kampanią**,
i słusznie: atrybucja zapisuje dokładnie to, co wpiszesz w link. Jeśli ta sama
kampania raz nazywa się `start`, raz `Start`, a raz `start-pazdziernik`, to
w raporcie są trzy kampanie i żadnej nie da się porównać z żadną. Wstecz się
tego nie naprawi — wartości siedzą w `orders` przy zamówieniach, które już
powstały.

## Co w ogóle zapisujemy

`ZapiszZrodlo` zapisuje **pierwsze dotknięcie** przy wejściu na stronę
i trzyma je w `localStorage` do momentu złożenia zamówienia. Pierwsze, nie
ostatnie: klient, który przyszedł z reklamy, przemyślał tydzień i wrócił
wpisując adres z pamięci, nadal liczy się jako przyprowadzony przez reklamę.

Do `orders` trafia osiem pól: `utm_source`, `utm_medium`, `utm_campaign`,
`utm_content`, `utm_term`, `click_id` (`fbclid` albo `gclid`), `referrer`
i `landing_path`. Każda wartość przycinana do 200 znaków.

## Zasady

**Tylko małe litery, cyfry i myślnik.** Bez spacji, bez polskich znaków, bez
podkreśleń. `utm_campaign=remont-sezon` — nie `Remont Sezon` ani
`remont_sezon`. Powód jest prozaiczny: wielkość liter przechodzi przez adres
bez zmian, więc `Start` i `start` to dla bazy dwie różne kampanie.

**Nigdy nie zmieniaj nazwy działającej kampanii.** Zmiana w połowie rozbija
wyniki na dwa wiersze i nie da się ich już połączyć inaczej niż ręcznie.

**Nie wkładaj dat w `utm_campaign`**, chyba że kampania naprawdę dotyczy
jednego okresu. Datę zamówienia i tak masz w `created_at`; data w nazwie
sprawia, że „ta sama" kampania co miesiąc jest inną kampanią.

## Pola po kolei

### `utm_source` — skąd przyszedł

Nazwa serwisu, nie nazwa kampanii. Zamknięta lista, żeby nie rozjechała się
na warianty:

| wartość | kiedy |
|---|---|
| `facebook` | posty i reklamy na Facebooku |
| `instagram` | Instagram |
| `google` | wyszukiwarka i reklamy Google |
| `newsletter` | mailing własny |
| `olx`, `nieruchomosci-online` | portale ogłoszeniowe |
| `polecenie` | linki od partnerów i poleceń |

Nie wpisuj tu `fb`, `ig`, `facebook-ads` — to ten sam serwis pod trzema
nazwami. Kanał reklamowy opisuje `utm_medium`, nie `utm_source`.

### `utm_medium` — jakim sposobem

| wartość | kiedy |
|---|---|
| `cpc` | płatna reklama rozliczana za kliknięcie |
| `social` | post organiczny, bez budżetu |
| `email` | mailing |
| `referral` | link od kogoś, bez opłaty |
| `profil` | link w bio albo w opisie profilu |

Rozdzielenie `cpc` od `social` jest najważniejszym podziałem w całym zestawie:
to jedyny sposób, żeby odróżnić zamówienia, za które zapłaciłeś, od tych,
które przyszły same.

### `utm_campaign` — po co

Jedna kampania to jeden zamiar, nie jedna grafika. Nazwa rzeczownikowa,
dwa–trzy człony:

- `bez-prowizji` — przekaz o oszczędności na prowizjach,
- `wlasna-strona` — przekaz o niezależności od portali,
- `sezon-zimowy` — kampania sezonowa,
- `powrot-koszyk` — do osób, które zaczęły zamówienie i nie dokończyły.

### `utm_content` — która wersja

Tu rozróżniasz **warianty tej samej kampanii**, żeby wiedzieć, która kreacja
zadziałała. To pole, nie `utm_campaign`, obsługuje testy A/B:

- `wideo-30s`, `karuzela-3`, `statyczna-kalkulator`,
- `naglowek-a`, `naglowek-b`.

### `utm_term` — zwykle puste

Zostaw dla słów kluczowych w reklamie w wyszukiwarce. Przy reklamie na
Facebooku nie ma czego tam wpisywać.

## Przykłady gotowych linków

Reklama płatna na Facebooku, przekaz o prowizjach, wariant z wideo:

```
https://www.nobooking.eu/?utm_source=facebook&utm_medium=cpc&utm_campaign=bez-prowizji&utm_content=wideo-30s
```

Post organiczny na Instagramie:

```
https://www.nobooking.eu/?utm_source=instagram&utm_medium=social&utm_campaign=wlasna-strona&utm_content=karuzela-3
```

Link w bio:

```
https://www.nobooking.eu/?utm_source=instagram&utm_medium=profil&utm_campaign=bio
```

## Jak czytać wyniki

Opis źródła dla pojedynczego zamówienia składa `opisZrodla`
(`src/lib/attribution.ts`) — to on pojawia się w mailu o nowym zamówieniu
i w panelu administracyjnym.

Zbiorczo, wprost z bazy:

```sql
select utm_source, utm_medium, utm_campaign, utm_content,
       count(*) as zamowien,
       count(*) filter (where stripe_paid) as oplaconych
from orders
where created_at > now() - interval '30 days'
group by 1, 2, 3, 4
order by zamowien desc;
```

Kolumna `oplaconych` jest ważniejsza od `zamowien`. Kampania, która
przyprowadza dużo rozpoczętych i mało opłaconych zamówień, przyciąga
niewłaściwe osoby — a to kosztuje tyle samo co przyciąganie właściwych.

## Czego ta atrybucja nie powie

**Nie mierzymy odwiedzin ani konwersji na stronie** — świadomie, bo
wymagałoby to zbierania ruchu, czyli osobnego podsystemu i zgód cookie.
Wiemy więc, z czego przyszło **zamówienie**, ale nie ile osób kliknęło
reklamę i nie zamówiło. Koszt kliknięcia odczytasz w panelu Meta, a liczbę
zamówień tutaj — dopiero połączenie obu daje koszt pozyskania klienta.

**Pierwsze dotknięcie wygrywa i zapisuje się w przeglądarce.** Klient, który
wejdzie z reklamy na jednym urządzeniu, a zamówi na innym, będzie liczony
jako wejście bezpośrednie. Przy tej skali to szum, nie problem — ale warto
wiedzieć, zanim ktoś zacznie dociekać, czemu sumy się nie zgadzają.
