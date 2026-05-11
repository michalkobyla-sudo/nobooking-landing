import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return { title: `Panel — ${slug}` }
}

export default async function OwnerAdminLayout({ children, params }: Props) {
  const { slug } = await params

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: 'var(--font-jakarta, system-ui, sans-serif)' }}>
      <nav style={{
        background: 'white',
        borderBottom: '1px solid #E5E7EB',
        padding: '0 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '56px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <span style={{ fontSize: '1rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#111827' }}>
            <span style={{ color: '#059669' }}>No</span>booking
          </span>
          <span style={{ fontSize: '0.8rem', color: '#9CA3AF', margin: '0 0.5rem' }}>·</span>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#6B7280' }}>{slug}</span>
        </div>
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          <a
            href={`/sites/${slug}/admin/rezerwacje`}
            style={{ padding: '0.4rem 0.875rem', fontSize: '0.875rem', fontWeight: 600, color: '#374151', textDecoration: 'none', borderRadius: '8px' }}
          >
            Rezerwacje
          </a>
          <a
            href={`/sites/${slug}/admin/kalendarz`}
            style={{ padding: '0.4rem 0.875rem', fontSize: '0.875rem', fontWeight: 600, color: '#374151', textDecoration: 'none', borderRadius: '8px' }}
          >
            Kalendarz
          </a>
          <LogoutButton slug={slug} />
        </div>
      </nav>
      <main style={{ padding: '2rem', maxWidth: '960px', margin: '0 auto' }}>
        {children}
      </main>
    </div>
  )
}

function LogoutButton({ slug }: { slug: string }) {
  return (
    <form action={`/api/sites/${slug}/owner/logout`} method="POST" style={{ display: 'inline' }}>
      <button
        type="submit"
        style={{
          padding: '0.4rem 0.875rem',
          fontSize: '0.875rem',
          fontWeight: 600,
          color: '#9CA3AF',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'inherit',
          borderRadius: '8px',
        }}
      >
        Wyloguj
      </button>
    </form>
  )
}
