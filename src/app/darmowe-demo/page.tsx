import type { Metadata } from 'next'
import DemoForm from '@/components/DemoForm'

export const metadata: Metadata = {
  title: 'Darmowe demo strony Twojego apartamentu — Nobooking',
  description: 'Podaj kilka danych i zobacz, jak będzie wyglądać własna strona rezerwacyjna Twojego apartamentu. Bez płacenia i bez zakładania konta.',
  alternates: { canonical: 'https://nobooking.eu/darmowe-demo' },
}

export default function DarmoweDemoPage() {
  return <DemoForm />
}
