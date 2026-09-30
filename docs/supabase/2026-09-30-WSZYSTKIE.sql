-- ============================================================================
-- Nobooking  migracje z 2026-09-30, zlozone w jeden plik.
-- Projekt: cgsfhvgddtwppmqvdecz (nobooking-prod). SPRAWDZ REF PRZED URUCHOMIENIEM.
--
-- Obie naprawiaja funkcje, ktore istnialy w kodzie i nie dzialaly, bo brakowalo
-- im kolumn w bazie:
--   1. poprawki klienta  4 rundy reklamowane w mailu strona gotowa",
--   2. prosba o opinie o Nobookingu  cron milczacy od maja.
--
-- Bez polskich znakow: schowek potrafi zgubic kodowanie.
-- Bezpieczne do uruchomienia wielokrotnie.
--
-- Po uruchomieniu:  ./scripts/sprawdz-produkcje.sh
-- ============================================================================

-- ------------------------------------------------------------------------
-- 2026-09-30-poprawki.sql
-- ------------------------------------------------------------------------

-- Poprawki klienta: brakujace kolumny w `orders`.
-- Projekt: cgsfhvgddtwppmqvdecz (nobooking-prod). SPRAWDZ REF PRZED URUCHOMIENIEM.
--
-- Powod: caly mechanizm poprawek istnieje w kodzie (trasa /api/revisions/[token],
-- strona /poprawki/[token], mail z linkiem, licznik czterech rund), ale zadna
-- z trzech kolumn, na ktorych stoi, nie zostala nigdy utworzona w bazie.
-- Migracja tej funkcji po prostu nie poszla.
--
-- Skutki widoczne dla klienta:
--   * mail strona gotowa" buduje link /poprawki/undefined,
--   * wejscie na trase poprawek konczy sie bledem 42703 (kolumna nie istnieje).
--
-- Czyli funkcja reklamowana w mailu jako zostaly Ci 4 rundy poprawek" nie
-- dziala wcale. To ten sam wzorzec, ktory w maju zatrzymal migracje odnowien:
-- kod wdrozony, migracja nie.
--
-- Bezpieczna do uruchomienia wielokrotnie.

alter table public.orders
  add column if not exists revision_token uuid not null default gen_random_uuid(),
  add column if not exists revision_count int  not null default 0,
  add column if not exists revision_notes text;

-- Trasa poprawek szuka zamowienia po tokenie  bez indeksu kazde wejscie
-- skanowaloby cala tabele.
create index if not exists orders_revision_token_idx
  on public.orders (revision_token);

comment on column public.orders.revision_token is
  'Token do strony poprawek /poprawki/[token]. Osobny od onboarding_token,
   bo onboarding konczy sie przed wygenerowaniem strony.';
comment on column public.orders.revision_count is
  'Ile rund poprawek klient juz wykorzystal. Limit w kodzie: MAX_REVISIONS = 4.';

-- Sprawdzenie po uruchomieniu  kazde zamowienie ma wlasny token i licznik 0:
-- select id, site_slug, revision_token, revision_count from public.orders;

-- ------------------------------------------------------------------------
-- 2026-09-30-prosba-o-opinie-klienta.sql
-- ------------------------------------------------------------------------

-- Slad wyslanej prosby o opinie do klienta Nobookinga (wlasciciela apartamentu).
-- Projekt: cgsfhvgddtwppmqvdecz (nobooking-prod). SPRAWDZ REF PRZED URUCHOMIENIEM.
--
-- Powod: cron `review-requests` szukal zamowien w statusie 'completed' w oknie
-- +/- 12 godzin wokol trzy dni temu". Status 'completed' ustawia wylacznie
-- czlowiek w panelu admina  nic w kodzie go nie nadaje  wiec cron nie mial
-- czego znalezc i od maja nie wyslal ani jednej wiadomosci. Kolejna cicha
-- bezczynnosc, tym razem bez zadnego bledu w logach.
--
-- Okno czasowe bylo drugim problemem: przy dziennym cyklu i oknie 24-godzinnym
-- to samo zamowienie moglo trafic w dwa kolejne przebiegi. Znacznik w bazie
-- rozstrzyga to raz na zawsze, bez polegania na szerokosci okna.
--
-- Bezpieczna do uruchomienia wielokrotnie, nie dotyka istniejacych wierszy.

alter table public.orders
  add column if not exists review_request_sent_at timestamptz;

comment on column public.orders.review_request_sent_at is
  'Kiedy poszla prosba o opinie o Nobookingu do wlasciciela apartamentu.
   Pusty = jeszcze nie poszla. Zastepuje kruche okno czasowe w cronie.';

-- Zamowienia sprzed tej migracji dostaly juz strony dawno temu; oznaczamy je
-- jako obsluzone, zeby cron nie wyslal nagle prosby o opinie po czterech
-- miesiacach od uruchomienia strony.
update public.orders
   set review_request_sent_at = now()
 where site_generated_at is not null
   and review_request_sent_at is null;

-- Sprawdzenie po uruchomieniu:
-- select id, site_slug, site_generated_at, review_request_sent_at from public.orders;

