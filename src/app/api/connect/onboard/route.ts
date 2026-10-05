import { NextRequest, NextResponse } from 'next/server'
import { createOnboardingLink, createConnectAccount } from '@/lib/stripe-connect'
import { createServiceClient } from '@/lib/supabase'
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

  try {
    let kontoId = site.stripe_account_id as string | null

    // **Brak konta nie jest błędem — to sytuacja, do której ta trasa służy.**
    //
    // Provisioning zakłada konto połączone, ale porażka jest tam celowo
    // nieśmiertelna: zamówienie ma się dokończyć nawet wtedy, gdy Stripe
    // akurat nie odpowiada, a komentarz w `provision-site.ts` odsyła
    // właściciela do panelu („owner can connect Stripe later via the admin
    // panel"). Tyle że panel prowadził tutaj, a tu zwracaliśmy surowe
    // `404 site_not_found_or_no_stripe_account` — czyli udokumentowana droga
    // ratunkowa kończyła się komunikatem błędu w formacie JSON.
    //
    // Zakładamy więc konto teraz, dokładnie tak jak zrobiłby to provisioning.
    if (!kontoId) {
      const nazwa = ((site.config as Record<string, unknown> | null)?.name as string | undefined) ?? undefined
      const email = (site.owner_email as string | null)?.trim()
      if (!email) {
        console.error(`[connect/onboard] strona ${slug} nie ma adresu wlasciciela`)
        return NextResponse.json({ error: 'brak_adresu_wlasciciela' }, { status: 500 })
      }

      kontoId = await createConnectAccount(email, nazwa)

      const { error } = await createServiceClient()
        .from('sites')
        .update({ stripe_account_id: kontoId })
        .eq('id', site.id)

      // Zapis się nie udał: konto w Stripe istnieje, ale my o nim nie wiemy.
      // Przerywamy zamiast puszczać właściciela dalej — inaczej następne
      // wejście założyłoby kolejne konto, i tak przy każdym kliknięciu.
      if (error) {
        console.error(`[connect/onboard] konto ${kontoId} zalozone, ale niezapisane dla ${slug}:`, error.message)
        return NextResponse.json({ error: 'konto_zalozone_ale_niezapisane' }, { status: 500 })
      }
    }

    const url = await createOnboardingLink(kontoId, slug)
    return NextResponse.redirect(url)
  } catch (err) {
    console.error('[connect/onboard] stripe error:', err)
    return NextResponse.json({ error: 'stripe_error' }, { status: 500 })
  }
}
