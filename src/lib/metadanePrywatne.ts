import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase'
import type { ApartmentConfig } from '@/lib/apartmentTypes'

/**
 * Metadane stron, które mają **nie** trafić do wyszukiwarek: portal gościa,
 * formularz check-in, formularz opinii.
 *
 * **Dlaczego `noindex`, skoro jest robots.txt.** Bo robots.txt jest prośbą
 * o nieodwiedzanie, a nie zakazem indeksowania. Google potrafi pokazać
 * w wynikach adres, którego nie odwiedził, jeśli ktoś do niego linkuje —
 * wtedy sam adres z identyfikatorem rezerwacji staje się publiczny. `noindex`
 * w nagłówku strony to zamyka. Jedno i drugie, nie jedno albo drugie.
 *
 * **Dlaczego w tytule nie ma danych gościa.** Tytuł trafia do historii
 * przeglądarki, do listy otwartych kart i na ekran przy udostępnianiu pulpitu.
 * Nazwa apartamentu wystarczy, żeby gość wiedział, gdzie jest.
 */

export async function metadanePortaluGoscia(
  slug: string,
  podtytul: string,
): Promise<Metadata> {
  let nazwa = 'Twoja rezerwacja'

  try {
    const supabase = createServiceClient()
    const { data: site } = await supabase
      .from('sites')
      .select('config')
      .eq('slug', slug)
      .single()

    const config = site?.config as ApartmentConfig | undefined
    if (config?.name?.trim()) nazwa = config.name.trim()
  } catch {
    // Tytuł jest wygodą, nie treścią. Awaria odczytu nie może wywrócić strony,
    // na którą gość wchodzi po szczegóły swojego pobytu.
  }

  return {
    title: `${podtytul} — ${nazwa}`,
    robots: { index: false, follow: false },
  }
}
