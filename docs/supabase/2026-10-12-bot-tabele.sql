-- Cztery tabele bota Messengera.
--
-- DLACZEGO TEN PLIK POWSTAJE DOPIERO TERAZ. Bot został napisany bez swojego
-- schematu: z pięciu tabel, na których stoi, istniała wyłącznie
-- `bot_processed_messages` (utworzona 2026-09-25 przy naprawie duplikatów).
-- Migracji dla pozostałych czterech nie było w repozytorium w ogóle — nie
-- zginęła, nigdy nie powstała.
--
-- Skutek: `isBotEnabled()` trafiał na brak `bot_settings`, zawodził na
-- zamknięto i webhook kończył się ciszej, niż ktokolwiek zauważył. Bot milczał
-- od początku, a wrześniowe poprawki — model `claude-sonnet-5`, prompt caching,
-- structured outputs, zaklepywanie po `message.mid` — dotyczyły kodu, który ani
-- razu się nie wykonał. Są poprawne i nie naprawiły niczego działającego.
--
-- Kształt tabel wynika wprost z zapytań w kodzie, nie z domysłów:
--   src/lib/claude-bot.ts                     — bot_settings, bot_knowledge
--   src/app/api/facebook/webhook/route.ts     — bot_conversations, bot_leads
--   src/app/api/admin/bot/{settings,knowledge,leads}/route.ts — panel
--
-- URUCHOMIENIE NIE WŁĄCZA BOTA. `bot_settings.enabled` startuje jako `false`,
-- więc po migracji bot nadal milczy — tyle że z własnej decyzji, a nie przez
-- awarię odczytu. Włącza się go świadomie, po zapełnieniu bazy wiedzy
-- i sprawdzeniu, co bot odpowiada. Taki jest warunek z planu: odpowiada
-- publicznie pod Twoją marką.

-- ── bot_settings ────────────────────────────────────────────────────────────
-- Dokładnie jeden wiersz, o kluczu `default`. Kod czyta go przez
-- `.eq('id','default').single()`, więc brak wiersza jest błędem odczytu,
-- a nie "ustawieniami domyślnymi" — stąd wstawiamy go razem z tabelą.
create table if not exists bot_settings (
  id           text primary key,
  enabled      boolean     not null default false,
  purchase_url text,
  updated_at   timestamptz not null default now()
);

comment on column bot_settings.enabled is
  'Wylacznik bota. Czytany przy kazdej wiadomosci; false = webhook odpowiada cisza.';

insert into bot_settings (id, enabled, purchase_url)
values ('default', false, 'https://nobooking.eu/zamow')
on conflict (id) do nothing;

-- ── bot_knowledge ───────────────────────────────────────────────────────────
-- Baza wiedzy sklejana w prompt systemowy w kolejności dodania.
create table if not exists bot_knowledge (
  id         uuid        primary key default gen_random_uuid(),
  title      text        not null,
  content    text        not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- `getKnowledgeBase` sortuje po `created_at` rosnąco przy każdej wiadomości.
create index if not exists bot_knowledge_created_idx
  on bot_knowledge (created_at);

-- ── bot_conversations ───────────────────────────────────────────────────────
-- Historia rozmowy z jednym użytkownikiem Messengera, przycinana w kodzie do
-- dziesięciu ostatnich wiadomości.
--
-- `fb_user_id` MUSI być kluczem jednoznacznym i nieczęściowym: webhook zapisuje
-- przez `.upsert({ fb_user_id, ... })`, a `ON CONFLICT` nie potrafi oprzeć się
-- na indeksie częściowym. Ta sama pułapka wywróciła wcześniej zapis opinii.
create table if not exists bot_conversations (
  fb_user_id text        primary key,
  messages   jsonb       not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── bot_leads ───────────────────────────────────────────────────────────────
-- Kontakt zostawiony w rozmowie. `conversation` trzyma kopię historii z chwili
-- zapisu — rozmowa w `bot_conversations` jest przycinana, a lead ma pozostać
-- czytelny później.
--
-- `email` nie jest zapisywany przez webhook (bot zbiera imię i telefon), ale
-- panel administracyjny go odczytuje, więc kolumna musi istnieć. Nullable
-- celowo: lepiej puste pole niż wybór zapytania rozsypany o brak kolumny.
create table if not exists bot_leads (
  id           uuid        primary key default gen_random_uuid(),
  fb_user_id   text        not null,
  name         text,
  phone        text,
  email        text,
  conversation jsonb       not null default '[]'::jsonb,
  created_at   timestamptz not null default now()
);

-- Panel listuje leady od najnowszych.
create index if not exists bot_leads_created_idx
  on bot_leads (created_at desc);

-- ── Dostęp ──────────────────────────────────────────────────────────────────
-- Wszystkie cztery tabele są czytane i zapisywane wyłącznie kluczem
-- serwisowym (webhook i panel administracyjny). Klucz anonimowy — ten, który
-- wychodzi do przeglądarki — nie ma tu czego szukać: są tu numery telefonów,
-- treść rozmów i identyfikatory użytkowników Facebooka.
alter table bot_settings      enable row level security;
alter table bot_knowledge     enable row level security;
alter table bot_conversations enable row level security;
alter table bot_leads         enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['bot_settings', 'bot_knowledge', 'bot_conversations', 'bot_leads']
  loop
    if not exists (
      select 1 from pg_policies
      where tablename = t and policyname = 'no_anon_' || t
    ) then
      execute format(
        'create policy %I on %I for all to anon using (false)',
        'no_anon_' || t, t
      );
    end if;
  end loop;
end $$;

-- ── Sprawdzenie po uruchomieniu ─────────────────────────────────────────────
-- Powinno zwrócić cztery wiersze i `enabled = false`.
--
--   select table_name from information_schema.tables
--    where table_name in ('bot_settings','bot_knowledge','bot_conversations','bot_leads');
--
--   select id, enabled, purchase_url from bot_settings;
