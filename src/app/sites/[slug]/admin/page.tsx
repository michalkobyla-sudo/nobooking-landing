import { requireOwnerPage } from '@/lib/ownerAuth'
import { OwnerAdminApp } from '@/components/owner/OwnerAdminApp'
import type { ApartmentConfig } from '@/lib/apartmentTypes'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function OwnerAdminPage({ params }: Props) {
  const { slug } = await params
  const site = await requireOwnerPage(slug)

  const config = site.config as Partial<ApartmentConfig>
  const siteName = config.name ?? slug

  return (
    <OwnerAdminApp
      slug={slug}
      initialSiteName={siteName}
      initialPlan={site.plan as 'basic' | 'pro'}
    />
  )
}
