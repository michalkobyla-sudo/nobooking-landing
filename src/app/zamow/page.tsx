import { redirect } from 'next/navigation'
import OrderForm, { type DaneZDemo } from '@/components/OrderForm'
import { createServiceClient } from '@/lib/supabase'
import { poprawnyToken } from '@/lib/demoZgloszenie'

/** Dane z darmowego demo do wypełnienia formularza. Brak tabeli albo tokenu — pusty formularz. */
async function daneZDemo(token: string | undefined): Promise<DaneZDemo | null> {
  if (!token || !poprawnyToken(token)) return null
  const { data } = await createServiceClient()
    .from('demo_requests')
    .select('first_name, email, apartment_name, apartment_location')
    .eq('token', token)
    .maybeSingle()
  return data ? { token, ...(data as Omit<DaneZDemo, 'token'>) } : null
}

interface Props {
  searchParams: Promise<{ plan?: string; currency?: string; demo?: string }>
}

export default async function ZamowPage({ searchParams }: Props) {
  const params = await searchParams
  const plan = params.plan
  const currency = params.currency

  if (plan !== 'basic' && plan !== 'pro') {
    redirect('/#cennik')
  }
  if (currency !== 'pln' && currency !== 'eur') {
    redirect('/#cennik')
  }

  return <OrderForm plan={plan} currency={currency} demo={await daneZDemo(params.demo)} />
}
