import Header from '@/components/Header'
import Hero from '@/components/Hero'
import CommissionCalculator from '@/components/CommissionCalculator'
import HowItWorks from '@/components/HowItWorks'
import FeaturesGrid from '@/components/FeaturesGrid'
import ComparisonTable from '@/components/ComparisonTable'
import PricingCards from '@/components/PricingCards'
import DemoCTA from '@/components/DemoCTA'
import FAQ from '@/components/FAQ'
import Footer from '@/components/Footer'

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <CommissionCalculator />
        <HowItWorks />
        <FeaturesGrid />
        <ComparisonTable />
        <PricingCards />
        <DemoCTA />
        <FAQ />
      </main>
      <Footer />
    </>
  )
}
