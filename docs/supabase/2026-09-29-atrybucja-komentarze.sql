-- Poprawka komentarzy do kolumn z migracji 2026-09-29.
-- Bez polskich znakow: schowek zgubil kodowanie przy pierwszym uruchomieniu.
-- Wylacznie kosmetyka, nie dotyka danych ani struktury.

comment on column public.orders.click_id is
  'fbclid albo gclid - identyfikator klikniecia z reklamy, do dopasowania konwersji po stronie Meta/Google.';
comment on column public.orders.landing_path is
  'Pierwsza sciezka, na ktora klient wszedl, razem z zapytaniem.';
