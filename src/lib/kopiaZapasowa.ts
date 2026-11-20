/**
 * Co trafia do dziennej kopii zapasowej i w jakiej kolejności się ją odtwarza.
 *
 * **Dlaczego to osobny moduł.** Do 2026-11-20 kopia brała ze `sites` tylko
 * `id, slug`, a z `orders` sześć kolumn z 61 — rezerwacje dałoby się odtworzyć,
 * strony klientów już nie. Nikt tego nie zauważył, bo nikt kopii nie odtwarzał.
 * Lista jest teraz jawna, a `kopiaZapasowa.test.ts` wywraca CI, gdy tabela
 * używana w kodzie nie jest ani kopiowana, ani świadomie pominięta.
 *
 * Kolejność ma znaczenie: odtwarzanie idzie po kluczach obcych — najpierw
 * `orders`, potem `sites` (`sites.order_id`), potem wszystko, co wskazuje na
 * strony i rezerwacje.
 */
export const KOPIOWANE = [
  'orders',
  'sites',
  'bookings',
  'blocked_dates',
  'calendar_feeds',
  'discount_codes',
  'reviews',
  'guest_notifications',
  'renewal_reminders',
  'sms_log',
  'bot_settings',
  'bot_knowledge',
  'bot_leads',
  'stripe_webhook_events',
] as const

export type TabelaKopii = (typeof KOPIOWANE)[number]

/** Tabele celowo poza kopią — każda z powodem. */
export const POMINIETE_W_KOPII: Record<string, string> = {
  checkin_forms:
    'numery dokumentów gości usuwamy 7 dni po wyjeździe (polityka prywatności, pkt 5); ' +
    'kopia trzymałaby je dłużej. Stan check-inu zostaje w bookings.checkin_submitted.',
  external_blocked_dates: 'odbudowuje ją synchronizacja kalendarzy co 15 minut z calendar_feeds',
  bot_conversations: 'kontekst bieżących rozmów bota, nie dane do odtworzenia',
  bot_processed_messages: 'deduplikacja wiadomości Messengera, ulotna',
  rate_limits: 'liczniki limitów zapytań, ulotne',
  cron_runs: 'ślad ostatniego przebiegu cronów, odbuduje się sam',
}

/** Klucz główny do stabilnego stronicowania; domyślnie `id`. */
export const KLUCZ_GLOWNY: Partial<Record<TabelaKopii, string>> = {
  stripe_webhook_events: 'event_id',
}

/** Ile wierszy PostgREST oddaje naraz (domyślny `max-rows` Supabase). */
export const PORCJA = 1000

/** Plik kopii w wersji 2 — wszystkie tabele z `KOPIOWANE`, w całości. */
export interface PlikKopii {
  wersja: 2
  exported_at: string
  /** Na najwyższym poziomie, bo czyta to strażnik spadku w cronie kopii. */
  bookings_count: number
  liczby: Record<string, number>
  tabele: Record<string, unknown[]>
  przebazowanie?: boolean
  poprzednia_liczba_rezerwacji?: number | null
}

export function zbudujPlikKopii(
  tabele: Record<TabelaKopii, unknown[]>,
  teraz: Date,
  dodatki: Pick<PlikKopii, 'przebazowanie' | 'poprzednia_liczba_rezerwacji'> = {},
): PlikKopii {
  const liczby: Record<string, number> = {}
  for (const t of KOPIOWANE) liczby[t] = tabele[t].length
  return {
    wersja: 2,
    exported_at: teraz.toISOString(),
    bookings_count: tabele.bookings.length,
    ...dodatki,
    liczby,
    tabele,
  }
}

// Odtwarzanie: `scripts/odtworz-kopie.mjs` — tabele z pliku w kolejności zapisu,
// czyli w kolejności `KOPIOWANE`.
