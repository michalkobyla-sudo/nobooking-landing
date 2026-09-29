-- ============================================================================
-- Nobooking  wszystkie migracje z 2026-09-29, zlozone w jeden plik.
-- Projekt: cgsfhvgddtwppmqvdecz (nobooking-prod). SPRAWDZ REF PRZED URUCHOMIENIEM.
--
-- Bez polskich znakow: przy przenoszeniu SQL przez schowek kodowanie potrafi
-- sie zgubic, co juz raz zapisalo przekrecone komentarze w bazie.
--
-- Bezpieczne do uruchomienia wielokrotnie (polityki RLS sa najpierw kasowane,
-- bo `create policy` nie ma wariantu `if not exists`). Nie dotyka istniejacych
-- wierszy. Zgodnie z niezmiennikiem 15 uruchom PRZED wdrozeniem kodu.
--
-- Po uruchomieniu sprawdz wynik poleceniem:
--   ./scripts/sprawdz-produkcje.sh
-- ============================================================================

-- ------------------------------------------------------------------------
-- 2026-09-29-sms.sql
-- ------------------------------------------------------------------------

-- Powiadomienia SMS dla wlasciciela (pakiet Pro). Dostawca: Twilio.
-- Projekt: cgsfhvgddtwppmqvdecz (nobooking-prod). SPRAWDZ REF PRZED URUCHOMIENIEM.
--
-- Numer telefonu zbieramy dzis w `orders.ob_sms_phone`, ale wysylka operuje na
-- `sites`  bez kolumny po tej stronie kazda wysylka wymagalaby siegania do
-- zamowienia. Wlasciciel musi tez moc wylaczyc SMS-y sam.
--
-- `sms_log` sluzy dwom rzeczom naraz: liczeniu dziennego limitu (SMS kosztuje
-- za sztuke) i widocznosci awarii  nieudana wysylka zostawia slad z trescia
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
-- `create policy` nie ma wariantu `if not exists`, wiec najpierw kasujemy.
drop policy if exists "no_anon_sms_log" on public.sms_log;
create policy "no_anon_sms_log" on public.sms_log for all to anon using (false);

comment on column public.sites.sms_phone is
  'Numer wlasciciela w postaci E.164 (+48600123456). Kopiowany z orders.ob_sms_phone przy provisioningu.';
comment on column public.sites.sms_enabled is
  'Wylacznik SMS-ow po stronie wlasciciela. SMS kosztuje za sztuke.';

-- Sprawdzenie po uruchomieniu:
-- select column_name from information_schema.columns
--  where table_name = 'sites' and column_name in ('sms_phone','sms_enabled');
-- select count(*) from public.sms_log;

-- ------------------------------------------------------------------------
-- 2026-09-29-powiadomienia-gosci.sql
-- ------------------------------------------------------------------------

-- Powiadomienia do gosci: przypomnienie przed przyjazdem i prosba o opinie.
-- Projekt: cgsfhvgddtwppmqvdecz (nobooking-prod). SPRAWDZ REF PRZED URUCHOMIENIEM.
--
-- Powod istnienia tabeli: cron uruchamia sie codziennie, a Vercel potrafi
-- powtorzyc wywolanie. Bez sladu to juz poszlo" gosc dostawalby te sama
-- wiadomosc kilka razy. Rozstrzyga o tym klucz unikalny w bazie, nie sprawdzenie
-- w kodzie  odczyt-potem-zapis ma okno wyscigu (ta sama zasada co przy
-- idempotencji webhooka Stripe, niezmiennik 5).
--
-- Bezpieczna do uruchomienia wielokrotnie. Zgodnie z niezmiennikiem 15 uruchom
-- PRZED wdrozeniem kodu.

create table if not exists public.guest_notifications (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  rodzaj     text not null,          -- 'przed_przyjazdem' | 'prosba_o_opinie'
  unique (booking_id, rodzaj)
);

create index if not exists guest_notifications_booking_idx
  on public.guest_notifications (booking_id);

alter table public.guest_notifications enable row level security;
-- `create policy` nie ma wariantu `if not exists`, wiec najpierw kasujemy.
drop policy if exists "no_anon_guest_notifications" on public.guest_notifications;
create policy "no_anon_guest_notifications"
  on public.guest_notifications for all to anon using (false);

comment on table public.guest_notifications is
  'Slad wyslanych wiadomosci do gosci. Klucz unikalny (booking_id, rodzaj) jest
   gwarancja jednokrotnej wysylki  nie sprawdzenie w kodzie.';

--  Jedna opinia na rezerwacje 
--
-- Formularz opinii zapisuje przez upsert po `booking_id`: gosc moze poprawic
-- swoja opinie, ale nie dopisac drugiej. Bez tego indeksu upsert nie ma po czym
-- rozstrzygac konfliktu. Indeks czesciowy, bo `booking_id` bywa puste 
-- opinie przeniesione recznie z innych serwisow nie maja rezerwacji.
--
-- Tabela `reviews` jest dzis pusta (do 2026-09-29 nic do niej nie pisalo), wiec
-- nie ma duplikatow, ktore moglyby zablokowac utworzenie indeksu.

create unique index if not exists reviews_booking_id_uniq
  on public.reviews (booking_id)
  where booking_id is not null;

-- Sprawdzenie po uruchomieniu:
-- select count(*) from public.guest_notifications;
-- select indexname from pg_indexes where tablename = 'reviews';

-- ------------------------------------------------------------------------
-- 2026-09-29-atrybucja-komentarze.sql
-- ------------------------------------------------------------------------

-- Poprawka komentarzy do kolumn z migracji 2026-09-29.
-- Bez polskich znakow: schowek zgubil kodowanie przy pierwszym uruchomieniu.
-- Wylacznie kosmetyka, nie dotyka danych ani struktury.

comment on column public.orders.click_id is
  'fbclid albo gclid - identyfikator klikniecia z reklamy, do dopasowania konwersji po stronie Meta/Google.';
comment on column public.orders.landing_path is
  'Pierwsza sciezka, na ktora klient wszedl, razem z zapytaniem.';

