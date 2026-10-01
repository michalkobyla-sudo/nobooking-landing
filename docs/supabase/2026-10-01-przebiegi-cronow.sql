-- Slad po uruchomieniu crona.
--
-- Czego dotad brakowalo: wszystkie nasze wykrywacze awarii sa objawowe -
-- "kopia zapasowa jest stara", "przypomnienia zalegaja", "brak zdarzen Stripe
-- mimo rezerwacji". Kazdy z nich pilnuje skutku jednego crona, a kilka cronow
-- nie ma zadnego objawu, po ktorym daloby sie poznac, ze przestaly chodzic.
--
-- Gorzej: Sentry nie wychwyci crona, ktory sie NIE uruchomil. Wyjatek zglosi,
-- brak uruchomienia nie - bo nie ma czego zglaszac. A dokladnie to sie tu
-- zdarzylo: crony stanely na produkcji i nikt nie zauwazyl, dopoki nie
-- zabraklo kopii zapasowej.
--
-- Tabela trzyma jeden wiersz na crona. Raport stanu porownuje czas ostatniego
-- uruchomienia z oczekiwana czestotliwoscia i zglasza cisze.

create table if not exists cron_runs (
  nazwa            text primary key,
  ostatni_przebieg timestamptz not null default now(),
  przebiegi        bigint      not null default 0
);

comment on table cron_runs is
  'Kiedy ostatnio uruchomil sie kazdy cron. Zapisywane na wejsciu, po sprawdzeniu sekretu.';

comment on column cron_runs.przebiegi is
  'Licznik uruchomien. Sluzy tylko do ogladania - alarm opiera sie na ostatni_przebieg.';

alter table cron_runs enable row level security;

-- Jedno wywolanie zamiast odczytu i zapisu: licznik ma sie zwiekszyc
-- niepodzielnie, a przy okazji oszczedzamy cronowi jednej podrozy do bazy.
create or replace function odnotuj_przebieg_crona(p_nazwa text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_nazwa is null or length(p_nazwa) = 0 or length(p_nazwa) > 64 then
    return;
  end if;

  insert into cron_runs as c (nazwa, ostatni_przebieg, przebiegi)
  values (p_nazwa, now(), 1)
  on conflict (nazwa) do update
    set ostatni_przebieg = now(),
        przebiegi = c.przebiegi + 1;
end;
$$;

revoke all on function odnotuj_przebieg_crona(text) from public;
grant execute on function odnotuj_przebieg_crona(text) to service_role;
