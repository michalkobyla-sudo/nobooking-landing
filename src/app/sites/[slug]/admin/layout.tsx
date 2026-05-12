import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return { title: `Panel właściciela — ${slug}` }
}

export default function OwnerAdminLayout({ children }: Props) {
  return <>{children}</>
}
