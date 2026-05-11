import { redirect } from 'next/navigation'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function OwnerAdminPage({ params }: Props) {
  const { slug } = await params
  redirect(`/sites/${slug}/admin/rezerwacje`)
}
