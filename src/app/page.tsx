import Header from '@/components/Header'
import Hero from '@/components/Hero'
import CommissionCalculator from '@/components/CommissionCalculator'
import HowItWorks from '@/components/HowItWorks'
import FeaturesGrid from '@/components/FeaturesGrid'
import ComparisonTable from '@/components/ComparisonTable'
import PricingCards from '@/components/PricingCards'
import Testimonials from '@/components/Testimonials'
import DemoCTA from '@/components/DemoCTA'
import FAQ from '@/components/FAQ'
import Footer from '@/components/Footer'
import type { Metadata } from 'next'
import { PLAN_NAMES, PRICES } from '@/lib/prices'

export const metadata: Metadata = {
  alternates: { canonical: 'https://nobooking.eu' },
}

// Dane strukturalne dla Google: produkt z cenami z `prices.ts` (te same kwoty, które pobiera Stripe).
const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://nobooking.eu/#org',
      name: 'Nobooking',
      url: 'https://nobooking.eu',
      logo: 'https://nobooking.eu/icon.png',
      founder: { '@type': 'Person', name: 'Michał Kobyliński', url: 'https://michalkobylinski.pl' },
    },
    {
      '@type': 'SoftwareApplication',
      name: 'Nobooking',
      url: 'https://nobooking.eu',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      description:
        'Własna strona rezerwacji dla apartamentu wakacyjnego: kalendarz, płatności online prosto na konto właściciela, panel admina i portal gościa. 0% prowizji od rezerwacji.',
      publisher: { '@id': 'https://nobooking.eu/#org' },
      offers: (['basic', 'pro'] as const).map((plan) => ({
        '@type': 'Offer',
        name: PLAN_NAMES[plan],
        price: (PRICES[plan].pln / 100).toFixed(2),
        priceCurrency: 'PLN',
        url: 'https://nobooking.eu/#cennik',
      })),
    },
  ],
}

export default function HomePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Header />
      <main>
        <Hero />
        <CommissionCalculator />
        <HowItWorks />
        <FeaturesGrid />
        <ComparisonTable />
        <PricingCards />
        <Testimonials />
        <DemoCTA />
        <FAQ />
      </main>
      <Footer />
    </>
  )
}
