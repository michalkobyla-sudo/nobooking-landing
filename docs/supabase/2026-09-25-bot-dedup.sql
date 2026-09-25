-- ============================================================
-- nobooking.eu — deduplikacja i limit bota Facebooka
-- Uruchom na NOBOOKING-PROD: cgsfhvgddtwppmqvdecz
-- (NIE na projekcie casa-sol: ejteazvuaufaltmhcrwi)
--
-- Po co:
--   1. Meta ponawia webhooka, gdy nie dostanie szybko 200. Obsługa wiadomości
--      zawiera wywołanie Claude, więc bywa wolna — przy ponowieniu gość
--      dostawał drugą odpowiedź na to samo pytanie, a my drugi rachunek za API.
--   2. Limit wiadomości działał w pamięci pojedynczej instancji funkcji.
--      Vercel uruchamia ich wiele, więc licznik praktycznie nie obowiązywał.
--      Wspólna tabela naprawia jedno i drugie.
-- ============================================================

CREATE TABLE IF NOT EXISTS bot_processed_messages (
  mid          text primary key,
  fb_user_id   text not null,
  processed_at timestamptz not null default now()
);

-- Indeks pod zliczanie wiadomości użytkownika w oknie czasowym.
CREATE INDEX IF NOT EXISTS bot_processed_messages_user_idx
  ON bot_processed_messages (fb_user_id, processed_at DESC);

ALTER TABLE bot_processed_messages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'bot_processed_messages' AND policyname = 'no_anon_bot_processed'
  ) THEN
    CREATE POLICY "no_anon_bot_processed" ON bot_processed_messages
      FOR ALL TO anon USING (false);
  END IF;
END $$;

-- ─── WERYFIKACJA ─────────────────────────────────────────────────────────────

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'bot_processed_messages'
ORDER BY ordinal_position;

-- ─── PORZĄDKI (opcjonalnie, raz na jakiś czas) ───────────────────────────────
-- Wpisy starsze niż 30 dni nie są już do niczego potrzebne:
-- DELETE FROM bot_processed_messages WHERE processed_at < now() - interval '30 days';
