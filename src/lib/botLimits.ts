import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Deduplikacja i limit bota — oparte na bazie, nie na pamięci procesu.
 *
 * Dwa problemy, które to rozwiązuje:
 *
 * 1. **Duplikaty odpowiedzi.** Meta ponawia webhooka, gdy nie dostanie 200
 *    odpowiednio szybko, a obsługa wiadomości zawiera wywołanie Claude, więc
 *    potrafi się przeciągnąć. Przy ponowieniu gość dostawał drugą odpowiedź na
 *    to samo pytanie. Każda wiadomość ma stały identyfikator (`message.mid`),
 *    więc wystarczy go zaklepać przed przetworzeniem.
 *
 * 2. **Limit w pamięci nie działa.** Funkcje na Vercelu żyją w wielu
 *    instancjach, a każda miała własny licznik — przy rozłożeniu ruchu limit
 *    praktycznie nie obowiązywał. Każda wiadomość to płatne wywołanie modelu,
 *    więc licznik musi być wspólny.
 */

/** Kod błędu Postgresa dla naruszenia unikalności. */
const PG_UNIQUE_VIOLATION = '23505'

export const LIMIT_WIADOMOSCI = 20
export const OKNO_MINUT = 10

export interface WynikZaklepania {
  /** Czy to pierwsze przetworzenie tej wiadomości. */
  swieza: boolean
  /** Czy użytkownik przekroczył limit w oknie czasowym. */
  poLimicie: boolean
}

/**
 * Zaklepuje wiadomość i sprawdza limit użytkownika w jednym kroku.
 *
 * Zwraca `swieza: false`, gdy Meta przysłała to samo po raz kolejny — wtedy
 * nie wolno odpowiadać. Przy błędzie bazy przepuszcza wiadomość
 * (`swieza: true`), bo lepiej odpowiedzieć gościowi dwa razy niż zamilknąć.
 */
export async function zaklepWiadomosc(
  supabase: SupabaseClient,
  mid: string,
  fbUserId: string,
): Promise<WynikZaklepania> {
  const { error } = await supabase
    .from('bot_processed_messages')
    .insert({ mid, fb_user_id: fbUserId })

  if (error) {
    if (error.code === PG_UNIQUE_VIOLATION) return { swieza: false, poLimicie: false }
    console.error('[bot] błąd zaklepania wiadomości — przepuszczam:', error.message)
    return { swieza: true, poLimicie: false }
  }

  const od = new Date(Date.now() - OKNO_MINUT * 60_000).toISOString()
  const { count, error: bladLiczenia } = await supabase
    .from('bot_processed_messages')
    .select('mid', { count: 'exact', head: true })
    .eq('fb_user_id', fbUserId)
    .gte('processed_at', od)

  if (bladLiczenia) {
    console.error('[bot] błąd liczenia limitu — przepuszczam:', bladLiczenia.message)
    return { swieza: true, poLimicie: false }
  }

  return { swieza: true, poLimicie: (count ?? 0) > LIMIT_WIADOMOSCI }
}

/**
 * Identyfikator zdarzenia dla komentarza. Meta nie daje dla komentarzy
 * osobnego `mid`, ale identyfikator komentarza jest stały, a odpowiadamy
 * na dany komentarz tylko raz.
 */
export function idKomentarza(commentId: string): string {
  return `comment:${commentId}`
}
