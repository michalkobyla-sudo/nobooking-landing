-- Powiadomienia do gosci: przypomnienie przed przyjazdem i prosba o opinie.
-- Projekt: cgsfhvgddtwppmqvdecz (nobooking-prod). SPRAWDZ REF PRZED URUCHOMIENIEM.
--
-- Powod istnienia tabeli: cron uruchamia sie codziennie, a Vercel potrafi
-- powtorzyc wywolanie. Bez sladu „to juz poszlo" gosc dostawalby te sama
-- wiadomosc kilka razy. Rozstrzyga o tym klucz unikalny w bazie, nie sprawdzenie
-- w kodzie — odczyt-potem-zapis ma okno wyscigu (ta sama zasada co przy
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
   gwarancja jednokrotnej wysylki — nie sprawdzenie w kodzie.';

-- ─── Jedna opinia na rezerwacje ──────────────────────────────────────────────
--
-- Formularz opinii zapisuje przez upsert po `booking_id`: gosc moze poprawic
-- swoja opinie, ale nie dopisac drugiej. Bez tego indeksu upsert nie ma po czym
-- rozstrzygac konfliktu.
--
-- Indeks NIE moze byc czesciowy. Pierwsza wersja miala `where booking_id is not
-- null` i choc pilnowala unikalnosci, `ON CONFLICT (booking_id)` nie potrafil
-- jej dopasowac — Postgres przy indeksie czesciowym wymaga powtorzenia tego
-- samego predykatu w zapytaniu. Predykat niczego zreszta nie kupowal: w zwyklym
-- indeksie unikalnym i tak mozna miec wiele wartosci NULL, wiec opinie bez
-- rezerwacji nadal sie zapisza.
--
-- Tabela `reviews` jest dzis pusta (do 2026-09-29 nic do niej nie pisalo), wiec
-- nie ma duplikatow, ktore moglyby zablokowac utworzenie indeksu.

drop index if exists public.reviews_booking_id_uniq;

create unique index if not exists reviews_booking_id_uniq
  on public.reviews (booking_id);

-- Sprawdzenie po uruchomieniu:
-- select count(*) from public.guest_notifications;
-- select indexname from pg_indexes where tablename = 'reviews';
