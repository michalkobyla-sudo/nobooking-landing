import OnboardingForm from '@/components/OnboardingForm'
import { adresSerwisu } from '@/lib/adresSerwisu'
import { CheckCircle, MagnifyingGlass } from '@/components/ui/ikony'

function Komunikat({ ikona, tytul, children }: { ikona: React.ReactNode; tytul: string; children: React.ReactNode }) {
  return (
    <div className="n-page" style={{ display: 'flex', alignItems: 'center' }}>
      <div className="n-page__inner" style={{ maxWidth: 480, textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>{ikona}</div>
        <h1>{tytul}</h1>
        <p className="n-page__lead">{children}</p>
      </div>
    </div>
  )
}

interface Props {
  params: Promise<{ token: string }>
}

export default async function OnboardingPage({ params }: Props) {
  const { token } = await params

  const siteUrl = adresSerwisu()

  const res = await fetch(`${siteUrl}/api/onboarding/${token}`, { cache: 'no-store' })
  const data = await res.json() as {
    found: boolean
    submitted?: boolean
    first_name?: string
    apartment_name?: string
    plan?: 'basic' | 'pro'
  }

  if (!data.found) {
    return (
      <Komunikat ikona={<MagnifyingGlass weight="fill" size={64} color="var(--ios-graphite)" aria-hidden />} tytul="Nie znaleziono formularza">
        Ten link jest nieprawidłowy lub wygasł. Napisz do nas: <a href="mailto:kontakt@nobooking.eu">kontakt@nobooking.eu</a>
      </Komunikat>
    )
  }

  if (data.submitted) {
    return (
      <Komunikat ikona={<CheckCircle weight="fill" size={64} color="var(--emerald)" aria-hidden />} tytul="Formularz już wypełniony">
        Dziękujemy! Gdy strona będzie gotowa, dostaniesz maila z adresem i dostępem do panelu.
      </Komunikat>
    )
  }

  return (
    <OnboardingForm
      token={token}
      firstName={data.first_name ?? ''}
      apartmentName={data.apartment_name ?? ''}
      plan={data.plan ?? 'basic'}
    />
  )
}
