import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { poprawnyToken, MAX_PROB_DEMO, type StatusDemo } from '@/lib/demoZgloszenie'
import type { ApartmentConfig } from '@/lib/apartmentTypes'
import PodgladDemo from './PodgladDemo'
import OczekiwanieNaDemo from './OczekiwanieNaDemo'

export const metadata: Metadata = {
  title: 'Twoje demo — Nobooking',
  // Podgląd z danymi klienta: nie do wyszukiwarki i bez odsyłacza na zewnątrz.
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
}

interface Props {
  params: Promise<{ token: string }>
}

/** Podgląd darmowego demo (`lib/demoZgloszenie.ts`). Dostęp: znajomość tokenu. */
export default async function PodgladPage({ params }: Props) {
  // Zawsze świeże — strona zmienia się z „przygotowujemy” na gotowe demo.
  await connection()
  const { token } = await params
  if (!poprawnyToken(token)) notFound()

  const supabase = createServiceClient()
  const { data } = await supabase
    .from('demo_requests')
    .select('status, attempts, config, apartment_name')
    .eq('token', token)
    .maybeSingle()
  if (!data) notFound()

  const status = data.status as StatusDemo
  if (status === 'ready' && data.config) {
    return <PodgladDemo token={token} config={data.config as ApartmentConfig} />
  }

  const wyczerpane = status === 'failed' && (data.attempts as number) >= MAX_PROB_DEMO
  return <OczekiwanieNaDemo nazwa={data.apartment_name as string} wyczerpane={wyczerpane} />
}
