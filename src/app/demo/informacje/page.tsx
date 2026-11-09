import type { Metadata } from 'next'
import config from '../config'
import { poprawnyJezyk } from '@/lib/metadataStrony'
import { informacjeDlaGosci, type DaneInformacji } from '@/lib/informacjeDlaGosci'
import { InformacjeDlaGosciWidok } from '@/components/apartment/InformacjeDlaGosciWidok'

export const metadata: Metadata = {
  title: `Prywatność i warunki rezerwacji — ${config.name} (demo)`,
  robots: 'noindex',
}

/** Wersja demo — bez nazwiska właściciela, z pełnym zestawem funkcji (Pro, płatności). */
const DANE: DaneInformacji = {
  nazwaObiektu: config.name,
  administrator: '',
  email: config.contact.email,
  telefon: config.contact.phone || undefined,
  checkin: true,
  platnosciOnline: true,
  politykaNobooking: 'https://nobooking.eu/polityka-prywatnosci',
}

export default async function DemoInformacje({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const lang = poprawnyJezyk((await searchParams)?.lang)
  const i = informacjeDlaGosci(lang, DANE)
  const powrot = `/demo${lang === 'pl' ? '' : `?lang=${lang}`}`
  return <InformacjeDlaGosciWidok i={i} dane={DANE} primary={config.theme?.primary ?? '#1A5276'} powrot={powrot} lang={lang} />
}
