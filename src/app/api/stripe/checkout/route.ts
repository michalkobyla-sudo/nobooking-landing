import { NextRequest, NextResponse } from 'next/server'
import { utworzSesjeZamowienia } from '@/lib/checkoutZamowienia'

/**
 * Sesja płatności za pakiet. Logika siedzi w `@/lib/checkoutZamowienia`,
 * bo woła ją też `/api/orders` — wcześniej robiło to żądaniem po sieci pod
 * adres z konfiguracji, co pozwalało jednemu środowisku zlecić operację
 * finansową innemu.
 *
 * Trasa zostaje, bo wywołuje ją strona cennika bez tworzenia zamówienia.
 */
export async function POST(request: NextRequest) {
  const { plan, currency, order_id } = await request.json() as {
    plan: 'basic' | 'pro'
    currency: 'pln' | 'eur'
    order_id?: string
  }

  const wynik = await utworzSesjeZamowienia({
    plan,
    currency,
    orderId: order_id,
    // Adres z bieżącego żądania, nie z konfiguracji: gość ma wrócić tam,
    // skąd przyszedł.
    adresPowrotu: request.nextUrl.origin,
  })

  if (!wynik.ok) {
    const status = wynik.blad === 'invalid_input' ? 400 : 500
    return NextResponse.json({ error: wynik.blad }, { status })
  }

  return NextResponse.json({ url: wynik.url })
}
