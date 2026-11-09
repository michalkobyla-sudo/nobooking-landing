import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase'
import type { ApartmentConfig } from '@/lib/apartmentTypes'
import { poprawnyJezyk } from '@/lib/metadataStrony'
import { informacjeDlaGosci, type DaneInformacji } from '@/lib/informacjeDlaGosci'
import { InformacjeDlaGosciWidok } from '@/components/apartment/InformacjeDlaGosciWidok'

export const revalidate = 300

interface Props {
  params: Promise<{ slug: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

/**
 * Prywatność i warunki rezerwacji dla gości apartamentu.
 *
 * Właściciel jest administratorem danych gości, ale to nasz formularz je
 * zbiera — więc to my musimy dać gościowi informację z art. 13 RODO w chwili
 * zbierania. Strona wskazuje właściciela z imienia i nazwiska (albo firmy)
 * z zamówienia; regulamin Nobooking uprzedza go o tym w pkt 13.
 */
async function wczytaj(slug: string): Promise<{ dane: DaneInformacji; primary: string } | null> {
  const db = createServiceClient()
  const { data: site } = await db
    .from('sites')
    .select('config, plan, stripe_onboarded')
    .eq('slug', slug)
    .eq('active', true)
    .single()
  const config = site?.config as ApartmentConfig | undefined
  if (!config) return null

  // Najnowsze zamówienie tej strony — przy odnowieniu dane mogły się zmienić.
  const { data: zamowienie } = await db
    .from('orders')
    .select('first_name, last_name, invoice_company')
    .eq('site_slug', slug)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const osoba = [zamowienie?.first_name, zamowienie?.last_name].filter(Boolean).join(' ').trim()
  const administrator = String(zamowienie?.invoice_company ?? '').trim() || osoba

  return {
    primary: config.theme?.primary ?? '#1A5276',
    dane: {
      nazwaObiektu: config.name,
      administrator,
      email: config.contact.email,
      telefon: config.contact.phone || undefined,
      checkin: site!.plan === 'pro',
      platnosciOnline: site!.stripe_onboarded === true,
      politykaNobooking: 'https://nobooking.eu/polityka-prywatnosci',
    },
  }
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params
  const lang = poprawnyJezyk((await searchParams)?.lang)
  const w = await wczytaj(slug)
  if (!w) return { title: 'Strona w przygotowaniu' }
  const i = informacjeDlaGosci(lang, w.dane)
  return {
    title: `${i.tytul} — ${w.dane.nazwaObiektu}`,
    robots: { index: false, follow: true },
  }
}

export default async function InformacjeDlaGosci({ params, searchParams }: Props) {
  const { slug } = await params
  const lang = poprawnyJezyk((await searchParams)?.lang)
  const w = await wczytaj(slug)
  if (!w) notFound()

  const i = informacjeDlaGosci(lang, w.dane)
  const powrot = `/sites/${slug}${lang === 'pl' ? '' : `?lang=${lang}`}`

  return <InformacjeDlaGosciWidok i={i} dane={w.dane} primary={w.primary} powrot={powrot} lang={lang} />
}
