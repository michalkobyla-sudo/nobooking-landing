import { NextRequest, NextResponse } from 'next/server'
import { createOnboardingLink } from '@/lib/stripe-connect'
import { verifyOwnerSession } from '@/lib/ownerAuth'

/**
 * GET /api/connect/onboard?slug=casa-sol
 *
 * Przekierowuje właściciela na onboarding Stripe Connect. Wywoływane z panelu
 * i z zapasowego odnośnika w mailu powitalnym (gdy przy provisioningu nie udało
 * się wygenerować linku bezpośrednio).
 *
 * **Wymaga sesji właściciela.** Do 2026-10-03 trasa była publiczna: brała slug
 * z adresu, odczytywała `stripe_account_id` tej strony i oddawała link
 * onboardingowy do **cudzego konta połączonego**. Slug jest publiczny — to
 * adres strony apartamentu — więc wystarczyło go znać. Link onboardingowy
 * prowadzi do panelu, w którym ustawia się dane właściciela i **konto bankowe
 * do wypłat**, czyli miejsce, gdzie trafiają pieniądze z rezerwacji.
 *
 * Bez sesji odsyłamy na logowanie zamiast zwracać 401: odnośnik z maila ma
 * dalej działać, tylko po zalogowaniu.
 */
export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug')

  if (!slug) {
    return NextResponse.json({ error: 'missing_slug' }, { status: 400 })
  }

  const site = await verifyOwnerSession(slug, request.headers.get('cookie'))
  if (!site) {
    // Z `powrot` ekran logowania odeśle tu z powrotem. Bez tego właściciel,
    // któremu wygasł link onboardingowy, lądował w panelu i musiał sam
    // odnaleźć przycisk, od którego zaczął.
    const logowanie = new URL(`/sites/${slug}/admin/login`, request.nextUrl.origin)
    logowanie.searchParams.set('powrot', request.nextUrl.pathname + request.nextUrl.search)
    return NextResponse.redirect(logowanie)
  }

  if (!site.stripe_account_id) {
    return NextResponse.json({ error: 'site_not_found_or_no_stripe_account' }, { status: 404 })
  }

  try {
    const url = await createOnboardingLink(site.stripe_account_id as string, slug)
    return NextResponse.redirect(url)
  } catch (err) {
    console.error('[connect/onboard] stripe error:', err)
    return NextResponse.json({ error: 'stripe_error' }, { status: 500 })
  }
}
