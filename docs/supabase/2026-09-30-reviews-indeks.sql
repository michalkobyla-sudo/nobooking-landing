-- Poprawka indeksu unikalnego na `reviews` (blad z 2026-09-29).
-- Projekt: cgsfhvgddtwppmqvdecz (nobooking-prod). SPRAWDZ REF PRZED URUCHOMIENIEM.
--
-- Wczorajsza migracja utworzyla indeks CZESCIOWY:
--   create unique index reviews_booking_id_uniq on reviews (booking_id)
--     where booking_id is not null;
--
-- Indeks dziala i pilnuje unikalnosci (drugi insert dostaje 23505), ale
-- `ON CONFLICT (booking_id)` — czyli to, czego uzywa upsert w trasie opinii —
-- NIE POTRAFI go dopasowac. Postgres wnioskuje indeks po kolumnach, a przy
-- indeksie czesciowym wymaga powtorzenia tego samego predykatu w zapytaniu.
-- Efekt: zapis opinii zwracal 42P10 „there is no unique or exclusion
-- constraint matching the ON CONFLICT specification".
--
-- Predykat niczego zreszta nie kupowal: w zwyklym indeksie unikalnym i tak
-- mozna miec wiele wartosci NULL, wiec opinie bez rezerwacji (przeniesione
-- recznie z innych serwisow) nadal beda sie zapisywac.
--
-- Bezpieczna do uruchomienia wielokrotnie.

drop index if exists public.reviews_booking_id_uniq;

create unique index if not exists reviews_booking_id_uniq
  on public.reviews (booking_id);

-- Sprawdzenie po uruchomieniu — powinno przejsc bez bledu i zostawic 1 wiersz:
--   insert into reviews (site_id, booking_id, guest_name, score, text)
--   select site_id, id, 'test', 5, 'test' from bookings limit 1
--   on conflict (booking_id) do update set score = excluded.score;
