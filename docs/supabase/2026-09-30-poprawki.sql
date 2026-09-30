-- Poprawki klienta: brakujace kolumny w `orders`.
-- Projekt: cgsfhvgddtwppmqvdecz (nobooking-prod). SPRAWDZ REF PRZED URUCHOMIENIEM.
--
-- Powod: caly mechanizm poprawek istnieje w kodzie (trasa /api/revisions/[token],
-- strona /poprawki/[token], mail z linkiem, licznik czterech rund), ale zadna
-- z trzech kolumn, na ktorych stoi, nie zostala nigdy utworzona w bazie.
-- Migracja tej funkcji po prostu nie poszla.
--
-- Skutki widoczne dla klienta:
--   * mail „strona gotowa" buduje link /poprawki/undefined,
--   * wejscie na trase poprawek konczy sie bledem 42703 (kolumna nie istnieje).
--
-- Czyli funkcja reklamowana w mailu jako „zostaly Ci 4 rundy poprawek" nie
-- dziala wcale. To ten sam wzorzec, ktory w maju zatrzymal migracje odnowien:
-- kod wdrozony, migracja nie.
--
-- Bezpieczna do uruchomienia wielokrotnie.

alter table public.orders
  add column if not exists revision_token uuid not null default gen_random_uuid(),
  add column if not exists revision_count int  not null default 0,
  add column if not exists revision_notes text;

-- Trasa poprawek szuka zamowienia po tokenie — bez indeksu kazde wejscie
-- skanowaloby cala tabele.
create index if not exists orders_revision_token_idx
  on public.orders (revision_token);

comment on column public.orders.revision_token is
  'Token do strony poprawek /poprawki/[token]. Osobny od onboarding_token,
   bo onboarding konczy sie przed wygenerowaniem strony.';
comment on column public.orders.revision_count is
  'Ile rund poprawek klient juz wykorzystal. Limit w kodzie: MAX_REVISIONS = 4.';

-- Sprawdzenie po uruchomieniu — kazde zamowienie ma wlasny token i licznik 0:
-- select id, site_slug, revision_token, revision_count from public.orders;
