/**
 * Tabele i kolumny, bez których system cicho przestaje działać.
 *
 * **Dlaczego to tu, a nie w trasie raportu.** Bo pilnuje tego test, a test nie
 * powinien importować trasy serwerowej. Lista stała się czymś więcej niż
 * konfiguracją jednego crona: jest kontraktem między kodem a bazą.
 *
 * **Dlaczego w ogóle istnieje.** Trzy razy wdrożyliśmy funkcję bez uruchomienia
 * migracji i trzy razy awaria była niewidoczna:
 *
 * | kiedy | co | jak długo milczało |
 * |---|---|---|
 * | 2026-04 → 10 | bot Messengera, cztery tabele | pół roku |
 * | 2026-11-06 | synchronizacja iCal, dwie tabele | od wdrożenia |
 *
 * Za każdym razem kod działał na tyle, żeby nie krzyczeć: `isBotEnabled()`
 * zawodziło na zamknięto, a `sync-calendars` zwracał `db_error` co kwadrans
 * wyłącznie do logu Vercela. Wykrywacz milczących cronów nie pomaga, bo cron
 * **się uruchamia** — tylko kończy błędem.
 *
 * Ręcznie utrzymywana lista działa, dopóki ktoś pamięta ją uzupełnić. Trzy razy
 * nie pamiętał — i dlatego `schematWymagany.test.ts` porównuje ją z tabelami
 * faktycznie używanymi w kodzie i **wywraca CI**, gdy się rozjadą. Pamiętanie
 * przestaje być warunkiem poprawności.
 */

export type WymaganaKolumna = [tabela: string, kolumna: string]

export const WYMAGANE: WymaganaKolumna[] = [
  // Strony i odnowienia
  ['sites', 'expires_at'],
  ['sites', 'renewal_price_pln'],
  ['sites', 'sms_phone'],
  ['sites', 'sms_enabled'],

  // Rezerwacje i dostępność — rdzeń produktu. Do 2026-11-07 nie były tu wcale,
  // więc brak kolumny `checkin_submitted` po niepełnej migracji przeszedłby
  // niezauważony.
  ['bookings', 'checkin_submitted'],
  ['blocked_dates', 'date'],

  // Zamówienia, provisioning i poprawki
  ['orders', 'provisioning_started_at'],
  ['orders', 'revision_token'],
  ['orders', 'revision_count'],
  ['orders', 'review_request_sent_at'],
  ['orders', 'utm_source'],
  ['orders', 'click_id'],

  // Płatności
  ['stripe_webhook_events', 'event_id'],
  ['discount_codes', 'uses_count'],

  // Funkcje pakietu Pro i obieg gościa
  ['sms_log', 'udane'],
  ['checkin_forms', 'guests_data'],
  ['guest_notifications', 'rodzaj'],
  ['reviews', 'published'],

  // Synchronizacja kalendarzy z portalami. `last_error` nieprzypadkowo: to tam
  // ląduje powód nieudanego pobrania, a bez tej kolumny panel właściciela nie
  // ma czego pokazać.
  ['calendar_feeds', 'last_error'],
  ['external_blocked_dates', 'date'],

  // Bot Messengera. `enabled` jest tu nieprzypadkowo: to wyłącznik czytany przy
  // każdej wiadomości, a jego brak oznacza bota milczącego bez śladu w logu.
  ['bot_settings', 'enabled'],
  ['bot_knowledge', 'content'],
  ['bot_conversations', 'messages'],
  ['bot_leads', 'phone'],

  // Pozostałe
  ['bot_processed_messages', 'mid'],
  ['renewal_reminders', 'id'],
  // Bez tej tabeli limit żądań cicho przestaje być wspólny: proxy zawodzi
  // na otwarto i zostaje tylko licznik w pamięci instancji.
  ['rate_limits', 'koniec'],
  ['cron_runs', 'ostatni_przebieg'],
]

/**
 * Tabele używane w kodzie, których **świadomie** nie pilnujemy.
 *
 * Pusta i taka ma zostać. Każdy wpis to zgoda na to, że brak tej tabeli
 * przejdzie niezauważony — więc musi mieć powód zapisany obok, a nie
 * w czyjejś pamięci.
 */
export const SWIADOMIE_POMINIETE: Record<string, string> = {}

/** Zbiór tabel objętych kontrolą — do porównań w teście i w raporcie. */
export function pilnowaneTabele(): Set<string> {
  return new Set(WYMAGANE.map(([t]) => t))
}
