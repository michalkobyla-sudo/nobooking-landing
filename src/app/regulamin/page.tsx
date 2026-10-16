import type { Metadata } from 'next'
import { StronaPrawna } from '@/components/StronaPrawna'

export const metadata: Metadata = {
  title: 'Regulamin — Nobooking',
  description: 'Warunki sprzedaży stron rezerwacyjnych Nobooking: zakres pakietów, terminy, odnowienie, odstąpienie i reklamacje.',
  alternates: { canonical: 'https://nobooking.eu/regulamin' },
}

export default function RegulaminPage() {
  return <StronaPrawna plik="PRAWNE-regulamin.md" />
}
