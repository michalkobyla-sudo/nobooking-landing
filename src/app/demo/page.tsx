import type { Metadata } from 'next'
import ApartmentPage from '@/components/apartment/ApartmentPage'
import config from './config'

export const metadata: Metadata = {
  title: `${config.name} — Demo Nobooking`,
  description: 'Demo strony apartamentu stworzonej przez Nobooking. Własna strona rezerwacji bez prowizji.',
  robots: 'noindex',
}

export default function DemoPage() {
  return <ApartmentPage config={config} showDemoBanner={true} />
}
