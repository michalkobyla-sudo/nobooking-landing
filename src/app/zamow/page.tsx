import { redirect } from 'next/navigation'
import OrderForm from '@/components/OrderForm'

interface Props {
  searchParams: Promise<{ plan?: string; currency?: string }>
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

  return <OrderForm plan={plan} currency={currency} />
}
