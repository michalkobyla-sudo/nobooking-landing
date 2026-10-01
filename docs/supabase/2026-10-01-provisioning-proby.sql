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
