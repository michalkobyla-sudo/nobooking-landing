import { createServiceClient } from '@/lib/supabase'
import ApartmentPage from '@/components/apartment/ApartmentPage'
import type { ApartmentConfig } from '@/lib/apartmentTypes'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function SitePage({ params }: Props) {
  const { slug } = await params
  const supabase = createServiceClient()

  const { data: order } = await supabase
    .from('orders')
    .select('generated_config, apartment_name, first_name, last_name')
    .eq('site_slug', slug)
    .single()

  if (!order?.generated_config) {
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

  let config: ApartmentConfig
  try {
    config = JSON.parse(order.generated_config) as ApartmentConfig
  } catch {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: '#9CA3AF', fontFamily: '-apple-system, sans-serif' }}>
        Błąd wczytywania konfiguracji strony.
      </div>
    )
  }

  return <ApartmentPage config={config} showDemoBanner={false} />
}
