import OnboardingForm from '@/components/OnboardingForm'

interface Props {
  params: Promise<{ token: string }>
}

export default async function OnboardingPage({ params }: Props) {
  const { token } = await params

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://nobooking.eu')
    .trim()
    .replace(/\/$/, '')

  const res = await fetch(`${siteUrl}/api/onboarding/${token}`, { cache: 'no-store' })
  const data = await res.json() as {
    found: boolean
    submitted?: boolean
    first_name?: string
    apartment_name?: string
  }

  if (!data.found) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', fontFamily: 'var(--font-jakarta, sans-serif)' }}>
        <div style={{ textAlign: 'center', maxWidth: '480px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111827', marginBottom: '0.75rem' }}>
            Nie znaleziono formularza
          </h1>
          <p style={{ color: '#6B7280', fontSize: '0.9rem' }}>
            Ten link jest nieprawidłowy lub wygasł. Napisz do nas: kontakt@nobooking.eu
          </p>
        </div>
      </div>
    )
  }

  if (data.submitted) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', fontFamily: 'var(--font-jakarta, sans-serif)' }}>
        <div style={{ textAlign: 'center', maxWidth: '480px' }}>
          <div style={{ width: '64px', height: '64px', background: 'var(--color-accent)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', fontSize: '1.75rem', color: 'white' }}>
            ✓
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111827', marginBottom: '0.75rem' }}>
            Formularz już wypełniony
          </h1>
          <p style={{ color: '#6B7280', fontSize: '0.9rem' }}>
            Dziękujemy! Wkrótce odezwiemy się z informacją o postępie prac.
          </p>
        </div>
      </div>
    )
  }

  return (
    <OnboardingForm
      token={token}
      firstName={data.first_name ?? ''}
      apartmentName={data.apartment_name ?? ''}
    />
  )
}
