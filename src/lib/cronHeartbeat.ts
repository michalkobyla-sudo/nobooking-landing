/**
 * Ślad po uruchomieniu crona.
 *
 * Wszystkie pozostałe wykrywacze w tym systemie są **objawowe**: „kopia
 * zapasowa jest stara", „przypomnienia zalegają", „brak zdarzeń Stripe mimo
 * rezerwacji". Każdy pilnuje skutku jednego crona, a kilka cronów nie zostawia
 * po sobie żadnego objawu, po którym dałoby się poznać, że stanęły.
 *
 * Sentry też tego nie złapie. Zgłosi wyjątek, ale nie zgłosi **braku
 * uruchomienia** — nie ma czego zgłaszać, gdy kod się nie wykonał. A właśnie
 * to się tu wydarzyło: crony stanęły na produkcji i wyszło to dopiero, gdy
 * zabrakło kopii zapasowej.
 *
 * Zapis idzie na wejściu, zaraz po sprawdzeniu sekretu — interesuje nas
 * nieobecność, a nie powodzenie. Cron, który się uruchomił i wywrócił, zostawia
 * wyjątek w Sentry; cron, który się nie uruchomił, nie zostawia nic.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Maksymalna przerwa między uruchomieniami, po której bijemy na alarm.
 *
 * Wartości muszą pasować do `vercel.json`. Z zapasem, bo Vercel nie gwarantuje
 * uruchomienia co do minuty, a alarm o pojedynczym poślizgu nauczyłby nas
 * ignorować cały raport (zasada Z4).
 */
export const MAKS_PRZERWA_H: Record<string, number> = {
  'provision-sites': 2,            // co minutę
  'cleanup-pending-bookings': 4,   // co 30 minut
  'review-requests': 36,           // codziennie 10:00
  'backup-bookings': 36,           // codziennie 02:00
  'renewal-reminders': 36,         // codziennie 09:00
  'health': 36,                    // codziennie 06:00
  'guest-reminders': 36,           // codziennie 08:00
}

/** Nazwa crona z adresu żądania: `/api/cron/health` → `health`. */
export function nazwaZeSciezki(sciezka: string): string | null {
  const m = sciezka.match(/\/api\/cron\/([a-z0-9-]+)/i)
  return m ? m[1] : null
}

export interface PrzebiegCrona {
  nazwa: string
  godzinTemu: number
}

/**
 * Po tylu przebiegach raportu uznajemy, że mechanizm zdążył się zapełnić.
 *
 * Raport chodzi raz na dobę, a najrzadsze crony też — więc po drugim przebiegu
 * każdy z nich powinien mieć już swój wiersz.
 */
const PRZEBIEGI_NA_ROZRUCH = 2

/**
 * Które crony milczą dłużej, niż powinny.
 *
 * `przebiegiRaportu` to licznik samego crona `health`. Dopóki jest niski,
 * **nie zgłaszamy brakujących wpisów** — zaraz po migracji tabela jest pusta
 * i bez tego pierwszy raport wypisałby siedem alarmów krytycznych naraz, z
 * których żaden nie byłby prawdziwy. Alarm, który wchodzi fałszywym sygnałem,
 * uczy ignorować cały raport (zasada Z4).
 *
 * Crony, które wiersz mają i są spóźnione, zgłaszamy od pierwszego przebiegu —
 * tu nie ma niejednoznaczności.
 */
export function milczaceCrony(
  przebiegi: PrzebiegCrona[],
  przebiegiRaportu = Number.POSITIVE_INFINITY,
  znaneNazwy: string[] = Object.keys(MAKS_PRZERWA_H),
): Array<{ nazwa: string; godzinTemu: number | null }> {
  const wg = new Map(przebiegi.map(p => [p.nazwa, p.godzinTemu]))
  const wynik: Array<{ nazwa: string; godzinTemu: number | null }> = []
  const rozruch = przebiegiRaportu < PRZEBIEGI_NA_ROZRUCH

  for (const nazwa of znaneNazwy) {
    const godzinTemu = wg.get(nazwa)

    if (godzinTemu === undefined) {
      // „Nigdy się nie uruchomił" jest gorszą wiadomością niż „spóźnił się",
      // a nie lepszą — ale tylko wtedy, gdy mechanizm zdążył już działać.
      if (!rozruch) wynik.push({ nazwa, godzinTemu: null })
      continue
    }

    if (godzinTemu > (MAKS_PRZERWA_H[nazwa] ?? 36)) {
      wynik.push({ nazwa, godzinTemu })
    }
  }

  return wynik
}

/**
 * Odnotowuje uruchomienie. Nigdy nie rzuca.
 *
 * Błąd zapisu nie może wywrócić crona: ślad jest narzędziem diagnostycznym,
 * a nie częścią zadania. Brak tabeli (nieuruchomiona migracja) wychodzi
 * osobno — raport stanu sprawdza schemat.
 */
export async function odnotujPrzebieg(db: SupabaseClient, sciezka: string): Promise<void> {
  const nazwa = nazwaZeSciezki(sciezka)
  if (!nazwa) return

  const { error } = await db.rpc('odnotuj_przebieg_crona', { p_nazwa: nazwa })
  if (error) console.error(`[cron-heartbeat] nie udalo sie odnotowac "${nazwa}":`, error.message)
}
