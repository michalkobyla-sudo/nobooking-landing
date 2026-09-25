import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Weryfikacja, że żądanie pochodzi z Vercel Cron.
 *
 * Vercel wysyła `Authorization: Bearer <CRON_SECRET>`.
 *
 * Zawodzi "na zamknięto": brak CRON_SECRET w środowisku oznacza 401, nie
 * przepustkę. Wcześniej dwa warianty tej kontroli w repo różniły się
 * zachowaniem — jeden pomijał sprawdzenie, gdy zmienna nie była ustawiona.
 *
 * Zwraca odpowiedź 401 do zwrócenia z handlera, albo null gdy żądanie jest OK.
 */
export function requireCron(request: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET

  if (!secret) {
    console.error('[cron-auth] CRON_SECRET nie jest ustawiony — odrzucam żądanie')
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const header = request.headers.get('authorization') ?? ''
  const expected = `Bearer ${secret}`

  // timingSafeEqual rzuca przy różnej długości buforów — stąd wcześniejsze
  // porównanie długości i try/catch.
  if (header.length !== expected.length) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  try {
    if (!crypto.timingSafeEqual(Buffer.from(header), Buffer.from(expected))) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  return null
}
