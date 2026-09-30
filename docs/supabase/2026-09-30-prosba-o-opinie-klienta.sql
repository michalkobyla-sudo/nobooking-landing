-- Slad wyslanej prosby o opinie do klienta Nobookinga (wlasciciela apartamentu).
-- Projekt: cgsfhvgddtwppmqvdecz (nobooking-prod). SPRAWDZ REF PRZED URUCHOMIENIEM.
--
-- Powod: cron `review-requests` szukal zamowien w statusie 'completed' w oknie
-- +/- 12 godzin wokol „trzy dni temu". Status 'completed' ustawia wylacznie
-- czlowiek w panelu admina — nic w kodzie go nie nadaje — wiec cron nie mial
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
