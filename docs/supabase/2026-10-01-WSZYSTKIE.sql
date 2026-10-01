-- Limity zadan na wspolnym magazynie.
--
-- Problem: licznik siedzial w pamieci instancji, a Vercel uruchamia ich wiele.
-- Realny limit byl tyle razy wyzszy, ile instancji akurat dzialalo, wiec
-- "10 prob logowania na 5 minut" oznaczalo w praktyce kilkadziesiat.
--
-- Tabela plus funkcja, bo zliczanie musi byc niepodzielne. Odczyt, porownanie
-- i zapis z poziomu aplikacji daloby wyscig: dwa zadania czytaja te sama
-- wartosc i oba przechodza.
--
-- WAZNE: klucz glowny jest pelny, nie czesciowy. Indeks czesciowy pilnuje
-- unikalnosci poprawnie, ale ON CONFLICT go nie dopasuje i kazdy upsert konczy
-- sie bledem 42P10. Kosztowalo to juz jeden cykl przy tabeli reviews.

create table if not exists rate_limits (
  klucz  text primary key,
  ile    integer     not null default 0,
  koniec timestamptz not null
);

comment on table rate_limits is
  'Licznik zadan wspolny dla wszystkich instancji. Wiersze wygasle sprzata cron cleanup-pending-bookings.';

-- Sprzatanie po kluczu czasu: cron kasuje wszystko, co dawno wygaslo.
create index if not exists rate_limits_koniec_idx on rate_limits (koniec);

-- Zwraca TRUE, gdy zadanie przekracza limit.
--
-- security definer, zeby trasa mogla wolac funkcje kluczem anonimowym:
-- proxy i tak ma ten klucz pod reka, a wpuszczanie klucza serwisowego do
-- warstwy brzegowej byloby rozszerzeniem jego zasiegu bez potrzeby.
create or replace function sprawdz_limit(
  p_klucz   text,
  p_maks    integer,
  p_okno_s  integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ile integer;
begin
  -- Pusty klucz oznaczalby jeden wspolny licznik dla calego swiata.
  if p_klucz is null or length(p_klucz) = 0 or length(p_klucz) > 512 then
    return false;
  end if;
  if p_maks is null or p_maks < 1 or p_okno_s is null or p_okno_s < 1 or p_okno_s > 86400 then
    return false;
  end if;

  insert into rate_limits as r (klucz, ile, koniec)
  values (p_klucz, 1, now() + make_interval(secs => p_okno_s))
  on conflict (klucz) do update
    set ile = case when r.koniec < now() then 1 else r.ile + 1 end,
        -- Okno nie przesuwa sie przy kazdej probie. Inaczej natarczywy klient
        -- trzymalby sie zablokowany w nieskonczonosc, odnawiajac kare.
        koniec = case when r.koniec < now()
                      then now() + make_interval(secs => p_okno_s)
                      else r.koniec end
  returning r.ile into v_ile;

  return v_ile > p_maks;
end;
$$;

revoke all on function sprawdz_limit(text, integer, integer) from public;
grant execute on function sprawdz_limit(text, integer, integer) to anon, authenticated, service_role;

-- Sama tabela zostaje zamknieta: czyta i pisze do niej wylacznie funkcja,
-- ktora dziala z uprawnieniami wlasciciela.
alter table rate_limits enable row level security;
-- Cykl ponawiania provisioningu: licznik prob i powod ostatniej porazki.
--
-- Stan przed zmiana: zaklepanie zamowienia wygasa po 15 minutach, wiec cron
-- bral je ponownie i probowal bez konca, co minute po wygasnieciu. Kazda proba
-- to wywolanie modelu (platne) i ewentualne zalozenie konta Stripe Connect.
-- Zamowienie, ktore nie moze sie udac - bo dane onboardingowe sa polamane -
-- probowalo w nieskonczonosc, a jedynym sladem byl wpis w logu Vercela.
--
-- Po zmianie: po wyczerpaniu prob cron przestaje probowac, a raport stanu
-- systemu zglasza zamowienie jako problem krytyczny razem z powodem.

alter table orders
  add column if not exists provisioning_attempts integer not null default 0;

alter table orders
  add column if not exists provisioning_error text;

comment on column orders.provisioning_attempts is
  'Ile razy cron provision-sites zaklepal to zamowienie. Po przekroczeniu limitu przestaje probowac.';

comment on column orders.provisioning_error is
  'Powod ostatniej nieudanej proby provisioningu. Czytany przez raport stanu systemu.';

-- Zamowienia czekajace na strone to zawsze garstka, ale cron pyta o nie co
-- minute, a warunek po trzech kolumnach bez indeksu wymusza przeglad calej
-- tabeli zamowien.
create index if not exists orders_do_provisioningu_idx
  on orders (onboarding_submitted, provisioning_started_at)
  where site_slug is null;
