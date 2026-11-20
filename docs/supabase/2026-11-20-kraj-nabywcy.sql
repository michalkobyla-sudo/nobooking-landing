-- Kraj nabywcy — dowody do rozstrzygnięcia VAT i progu OSS.
-- Projekt: cgsfhvgddtwppmqvdecz (nobooking-prod). SPRAWDŹ REF PRZED URUCHOMIENIEM.
--
-- Powód: usługę elektroniczną dla konsumenta z UE opodatkowuje się w jego kraju
-- po przekroczeniu 10 000 EUR rocznie, a kraj ustala się z dowodów (art. 24f
-- rozporządzenia 282/2011) — powyżej progu dwóch niesprzecznych. Do dziś
-- `orders` nie zapisywało żadnego. Szczegóły: src/lib/krajNabywcy.ts,
-- docs/PODATKI-I-FAKTUROWANIE.md (część 2 i etap 2).
--
-- Bezpieczna do wielokrotnego uruchomienia, nie dotyka istniejących wierszy.
-- Kod zapisuje te kolumny osobnym, nieblokującym update'em, więc kolejność
-- migracja/wdrożenie nie psuje zamówień — ale bez migracji kraj przepada,
-- a raport zdrowia zgłasza brak kolumn.

alter table public.orders
  add column if not exists kraj_ip            text,
  add column if not exists kraj_rozliczeniowy text,
  add column if not exists kraj_karty         text;

comment on column public.orders.kraj_ip is
  'Kraj adresu IP przy składaniu zamówienia (x-vercel-ip-country), ISO 3166-1 alpha-2.';
comment on column public.orders.kraj_rozliczeniowy is
  'Kraj z adresu rozliczeniowego w Stripe Checkout (customer_details.address.country).';
comment on column public.orders.kraj_karty is
  'Kraj wydawcy karty (payment_method.card.country); pusty przy BLIK i innych metodach bez karty.';

-- Sprawdzenie po uruchomieniu — powinno zwrócić 3 wiersze:
-- select column_name from information_schema.columns
--  where table_name = 'orders' and column_name like 'kraj_%';
