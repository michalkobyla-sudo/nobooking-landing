-- Powiadomienia SMS dla wlasciciela (pakiet Pro). Dostawca: Twilio.
-- Projekt: cgsfhvgddtwppmqvdecz (nobooking-prod). SPRAWDZ REF PRZED URUCHOMIENIEM.
--
-- Numer telefonu zbieramy dzis w `orders.ob_sms_phone`, ale wysylka operuje na
-- `sites` — bez kolumny po tej stronie kazda wysylka wymagalaby siegania do
-- zamowienia. Wlasciciel musi tez moc wylaczyc SMS-y sam.
--
-- `sms_log` sluzy dwóm rzeczom naraz: liczeniu dziennego limitu (SMS kosztuje
-- za sztuke) i widocznosci awarii — nieudana wysylka zostawia slad z trescia
-- bledu, zamiast przepasc w logach funkcji.
--
-- Bezpieczna do uruchomienia wielokrotnie. Zgodnie z niezmiennikiem 15 uruchom
-- PRZED wdrozeniem kodu.

alter table public.sites
  add column if not exists sms_phone   text,
  add column if not exists sms_enabled boolean not null default true;

create table if not exists public.sms_log (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  site_id    uuid not null references public.sites(id) on delete cascade,
  phone      text not null,
  rodzaj     text not null,              -- 'rezerwacja' | 'test'
  udane      boolean not null,
  blad       text
);

-- Limit dzienny liczy udane wysylki z biezacej doby dla jednej strony.
create index if not exists sms_log_site_created_idx
  on public.sms_log (site_id, created_at desc);

alter table public.sms_log enable row level security;
create policy "no_anon_sms_log" on public.sms_log for all to anon using (false);

comment on column public.sites.sms_phone is
  'Numer wlasciciela w postaci E.164 (+48600123456). Kopiowany z orders.ob_sms_phone przy provisioningu.';
comment on column public.sites.sms_enabled is
  'Wylacznik SMS-ow po stronie wlasciciela. SMS kosztuje za sztuke.';

-- Sprawdzenie po uruchomieniu:
-- select column_name from information_schema.columns
--  where table_name = 'sites' and column_name in ('sms_phone','sms_enabled');
-- select count(*) from public.sms_log;
