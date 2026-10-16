import type { Metadata } from 'next'
import { StronaPrawna } from '@/components/StronaPrawna'

export const metadata: Metadata = {
  title: 'Polityka prywatności — Nobooking',
  description: 'Jakie dane zbiera Nobooking, po co, komu je przekazuje i jak długo przechowuje. Prawa właścicieli apartamentów i ich gości.',
  alternates: { canonical: 'https://nobooking.eu/polityka-prywatnosci' },
}

export default function PolitykaPage() {
  return <StronaPrawna plik="PRAWNE-polityka-prywatnosci.md" />
}
