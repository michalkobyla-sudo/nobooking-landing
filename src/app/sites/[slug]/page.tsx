import { createServiceClient } from '@/lib/supabase'
import ApartmentPage from '@/components/apartment/ApartmentPage'
import type { ApartmentConfig } from '@/lib/apartmentTypes'

export const revalidate = 300 // ISR: odświeżaj co 5 minut

interface Props {
  params: Promise<{ slug: string }>
}

export default async function SitePage({ params }: Props) {
  const { slug } = await params
  const supabase = createServiceClient()

  const { data: site } = await supabase
    .from('sites')
    .select('id, config, active, stripe_onboarded')
    .eq('slug', slug)
    .eq('active', true)
    .single()

  if (!site?.config) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: '2rem',
        fontFamily: '-apple-system, sans-serif',
      }}>
        <div style={{ textAlign: 'center', maxWidth: '480px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚧</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111827', marginBottom: '0.75rem' }}>
            Strona w przygotowaniu
          </h1>
          <p style={{ color: '#6B7280', fontSize: '0.9rem' }}>
            Ta strona apartamentu jest właśnie budowana. Wróć wkrótce!
          </p>
        </div>
      </div>
    )
  }

  const config = site.config as unknown as ApartmentConfig

  // Opinie zatwierdzone przez wlasciciela. Do 2026-09-29 karuzela pokazywala
  // wylacznie `config.reviews.items`, czyli teksty wpisane przy generowaniu
  // strony — prawdziwe opinie gosci nie mialy jak sie tam znalezc, bo nic nie
  // pisalo do tabeli. Teraz wygrywaja opinie z tabeli, a config zostaje jako
  // tresc zastepcza dla stron, ktore jeszcze zadnej nie zebraly.
  const { data: opinie } = await supabase
    .from('reviews')
    .select('guest_name, score, text, created_at')
    .eq('site_id', site.id)
    .eq('published', true)
    .order('created_at', { ascending: false })
    .limit(20)

  const configZOpiniami: ApartmentConfig = (opinie && opinie.length > 0)
    ? {
        ...config,
        reviews: {
          score: Math.round((opinie.reduce((a, o) => a + Number(o.score), 0) / opinie.length) * 10) / 10,
          count: opinie.length,
          items: opinie.map(o => ({
            // Opinia jest w jednym jezyku — tym, w ktorym napisal ja gosc.
            // Nie tlumaczymy jej, bo cudza wypowiedz nie jest nasza do zmieniania.
            text: { pl: o.text as string, en: o.text as string, es: o.text as string, de: o.text as string },
            author: o.guest_name as string,
            location: '',
            score: Number(o.score),
            date: String(o.created_at).slice(0, 10),
          })),
        },
      }
    : config

  return (
    <ApartmentPage
      config={configZOpiniami}
      siteId={site.id as string}
      slug={slug}
      showDemoBanner={false}
      stripeEnabled={site.stripe_onboarded === true}
    />
  )
}
