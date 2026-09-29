-- Atrybucja zamówień — skąd przyszedł klient.
-- Projekt: cgsfhvgddtwppmqvdecz (nobooking-prod). SPRAWDŹ REF PRZED URUCHOMIENIEM.
--
-- Powód: `orders` nie ma dziś żadnej kolumny źródła, więc nie da się powiedzieć,
-- które zamówienie przyszło z której kampanii. To warunek wstępny agenta
-- reklamowego (audyt 2026-09-05, CZĘŚĆ 4, A6) — bez atrybucji nie ma czego
-- optymalizować.
--
-- Migracja jest bezpieczna do uruchomienia wielokrotnie i nie dotyka istniejących
-- wierszy: wszystkie kolumny są opcjonalne, stare zamówienia zostaną z NULL-ami.
-- Zgodnie z niezmiennikiem 15 uruchom ją PRZED wdrożeniem kodu.

alter table public.orders
  add column if not exists utm_source   text,
  add column if not exists utm_medium   text,
  add column if not exists utm_campaign text,
  add column if not exists utm_content  text,
  add column if not exists utm_term     text,
  add column if not exists click_id     text,
  add column if not exists referrer     text,
  add column if not exists landing_path text;

-- Raporty marketingowe filtrują po kampanii i źródle, a nie po kliencie.
create index if not exists orders_utm_campaign_idx
  on public.orders (utm_campaign)
  where utm_campaign is not null;

create index if not exists orders_utm_source_idx
  on public.orders (utm_source)
  where utm_source is not null;

comment on column public.orders.click_id is
  'fbclid albo gclid — identyfikator kliknięcia z reklamy, do dopasowania konwersji po stronie Meta/Google.';
comment on column public.orders.landing_path is
  'Pierwsza ścieżka, na którą klient wszedł, razem z zapytaniem.';

-- Sprawdzenie po uruchomieniu — powinno zwrócić 8 wierszy:
-- select column_name from information_schema.columns
--  where table_name = 'orders'
--    and column_name in ('utm_source','utm_medium','utm_campaign','utm_content',
--                        'utm_term','click_id','referrer','landing_path');
