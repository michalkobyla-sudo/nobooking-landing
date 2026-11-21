import type { ReactNode } from 'react'

export const metadata = { title: 'Admin — Nobooking' }

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: 'var(--font-sans)' }}>
      {children}
    </div>
  )
}
