'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface KnowledgeEntry {
  id: string
  title: string
  content: string
  created_at: string
}

interface Lead {
  id: string
  name: string | null
  phone: string | null
  email: string | null
  fb_user_id: string
  conversation: Array<{ role: string; content: string }>
  created_at: string
}

interface BotSettings {
  purchase_url: string
  enabled: boolean
}

type Modal =
  | { type: 'add' }
  | { type: 'edit'; entry: KnowledgeEntry }
  | { type: 'lead'; lead: Lead }
  | null

export default function AdminBotPage() {
  const router = useRouter()
  const [knowledge, setKnowledge] = useState<KnowledgeEntry[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [settings, setSettings] = useState<BotSettings>({ purchase_url: '', enabled: true })
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<Modal>(null)
  const [formTitle, setFormTitle] = useState('')
  const [formContent, setFormContent] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      const [kRes, lRes, sRes] = await Promise.all([
        fetch('/api/admin/bot/knowledge'),
        fetch('/api/admin/bot/leads'),
        fetch('/api/admin/bot/settings'),
      ])
      if (kRes.status === 401) { router.push('/admin/login'); return }
      setKnowledge(await kRes.json())
      setLeads(await lRes.json())
      setSettings(await sRes.json())
      setLoading(false)
    }
    load()
  }, [router])

  function openAdd() {
    setFormTitle('')
    setFormContent('')
    setModal({ type: 'add' })
  }

  function openEdit(entry: KnowledgeEntry) {
    setFormTitle(entry.title)
    setFormContent(entry.content)
    setModal({ type: 'edit', entry })
  }

  async function handleSaveEntry() {
    if (!formTitle.trim() || !formContent.trim()) return
    setSaving(true)
    if (modal?.type === 'add') {
      const res = await fetch('/api/admin/bot/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: formTitle, content: formContent }),
      })
      const entry = (await res.json()) as KnowledgeEntry
      setKnowledge((prev) => [...prev, entry])
    } else if (modal?.type === 'edit') {
      const res = await fetch(`/api/admin/bot/knowledge/${modal.entry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: formTitle, content: formContent }),
      })
      const updated = (await res.json()) as KnowledgeEntry
      setKnowledge((prev) => prev.map((k) => (k.id === updated.id ? updated : k)))
    }
    setSaving(false)
    setModal(null)
  }

  async function handleDelete(id: string) {
    if (!confirm('Usunąć ten wpis?')) return
    await fetch(`/api/admin/bot/knowledge/${id}`, { method: 'DELETE' })
    setKnowledge((prev) => prev.filter((k) => k.id !== id))
  }

  async function handleToggleBot() {
    const newEnabled = !settings.enabled
    setSettings((prev) => ({ ...prev, enabled: newEnabled }))
    await fetch('/api/admin/bot/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: newEnabled }),
    })
  }

  async function handleSavePurchaseUrl() {
    await fetch('/api/admin/bot/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ purchase_url: settings.purchase_url }),
    })
    alert('Zapisano!')
  }

  if (loading) {
    return <div style={{ padding: '3rem', textAlign: 'center', color: '#6B7280' }}>Ładowanie...</div>
  }

  return (
    <div>
      {/* Top nav */}
      <div style={{ background: 'white', borderBottom: '1px solid #E5E7EB', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '1.1rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
          <span style={{ color: 'var(--color-accent)' }}>No</span>booking Admin
        </div>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <a href="/admin/zamowienia" style={{ fontSize: '0.875rem', color: '#6B7280', textDecoration: 'none' }}>Zamówienia</a>
          <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#111827' }}>Bot FB</span>
        </div>
      </div>

      <div style={{ padding: '2rem', maxWidth: '900px' }}>

        {/* Ustawienia */}
        <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: '#111827' }}>Ustawienia bota</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.875rem', color: '#374151' }}>Status:</span>
            <button
              onClick={handleToggleBot}
              style={{
                padding: '0.4rem 1rem', borderRadius: '20px', border: 'none',
                fontFamily: 'inherit', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
                background: settings.enabled ? '#D1FAE5' : '#FEE2E2',
                color: settings.enabled ? '#065F46' : '#991B1B',
              }}
            >
              {settings.enabled ? '✅ Włączony' : '❌ Wyłączony'}
            </button>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.875rem', color: '#374151', whiteSpace: 'nowrap' }}>URL zakupu:</span>
            <input
              value={settings.purchase_url}
              onChange={(e) => setSettings((prev) => ({ ...prev, purchase_url: e.target.value }))}
              style={{ flex: 1, padding: '0.4rem 0.75rem', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '0.875rem', fontFamily: 'inherit' }}
            />
            <button
              onClick={handleSavePurchaseUrl}
              style={{ padding: '0.4rem 1rem', borderRadius: '8px', border: 'none', background: '#111827', color: 'white', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
            >
              Zapisz
            </button>
          </div>
        </div>

        {/* Baza wiedzy */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827' }}>Baza wiedzy</h2>
            <button
              onClick={openAdd}
              style={{ padding: '0.5rem 1.25rem', borderRadius: '8px', border: 'none', background: '#111827', color: 'white', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              + Dodaj wpis
            </button>
          </div>

          {knowledge.length === 0 ? (
            <p style={{ color: '#9CA3AF', fontSize: '0.875rem' }}>Brak wpisów. Dodaj pierwszy wpis bazy wiedzy.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {knowledge.map((entry) => (
                <div key={entry.id} style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#111827', marginBottom: '0.25rem' }}>{entry.title}</div>
                    <div style={{ fontSize: '0.8rem', color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.content}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                    <button onClick={() => openEdit(entry)} style={{ padding: '0.35rem 0.75rem', border: '1px solid #D1D5DB', borderRadius: '6px', background: 'white', fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'inherit' }}>Edytuj</button>
                    <button onClick={() => handleDelete(entry.id)} style={{ padding: '0.35rem 0.75rem', border: '1px solid #FCA5A5', borderRadius: '6px', background: '#FEF2F2', color: '#DC2626', fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'inherit' }}>Usuń</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Leady */}
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', marginBottom: '1rem' }}>
            Leady z bota{' '}
            <span style={{ fontSize: '0.875rem', fontWeight: 400, color: '#6B7280' }}>({leads.length})</span>
          </h2>

          {leads.length === 0 ? (
            <p style={{ color: '#9CA3AF', fontSize: '0.875rem' }}>Brak leadów. Bot zbiera je automatycznie gdy ktoś podaje dane kontaktowe.</p>
          ) : (
            <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: '12px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #E5E7EB', background: '#F9FAFB' }}>
                    {['Imię', 'Telefon', 'Data', ''].map((h) => (
                      <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead, i) => (
                    <tr key={lead.id} style={{ borderBottom: i < leads.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
                      <td style={{ padding: '0.875rem 1rem', fontSize: '0.875rem', fontWeight: 600, color: '#111827' }}>{lead.name ?? '—'}</td>
                      <td style={{ padding: '0.875rem 1rem', fontSize: '0.875rem', color: '#374151' }}>{lead.phone ?? '—'}</td>
                      <td style={{ padding: '0.875rem 1rem', fontSize: '0.8rem', color: '#6B7280' }}>{new Date(lead.created_at).toLocaleDateString('pl-PL')}</td>
                      <td style={{ padding: '0.875rem 1rem' }}>
                        <button
                          onClick={() => setModal({ type: 'lead', lead })}
                          style={{ padding: '0.3rem 0.75rem', border: '1px solid #D1D5DB', borderRadius: '6px', background: 'white', fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'inherit' }}
                        >
                          Rozmowa
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal: dodaj/edytuj wpis */}
      {(modal?.type === 'add' || modal?.type === 'edit') && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '2rem', width: '100%', maxWidth: '560px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1.25rem', color: '#111827' }}>
              {modal.type === 'add' ? 'Nowy wpis' : 'Edytuj wpis'}
            </h3>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '0.375rem' }}>Tytuł</label>
              <input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="np. Cennik"
                style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '0.875rem', fontFamily: 'inherit', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '0.375rem' }}>Treść</label>
              <textarea
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                rows={6}
                placeholder="Informacje które bot ma znać na ten temat..."
                style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '0.875rem', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setModal(null)} style={{ padding: '0.5rem 1.25rem', border: '1px solid #D1D5DB', borderRadius: '8px', background: 'white', fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'inherit' }}>Anuluj</button>
              <button onClick={handleSaveEntry} disabled={saving} style={{ padding: '0.5rem 1.25rem', border: 'none', borderRadius: '8px', background: '#111827', color: 'white', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                {saving ? 'Zapisywanie...' : 'Zapisz'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: rozmowa leada */}
      {modal?.type === 'lead' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '2rem', width: '100%', maxWidth: '560px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#111827' }}>
                Rozmowa — {modal.lead.name ?? 'Anonim'}
              </h3>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#6B7280' }}>✕</button>
            </div>
            <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {modal.lead.conversation.map((msg, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-start' : 'flex-end' }}>
                  <div style={{
                    padding: '0.5rem 0.875rem', borderRadius: '12px', maxWidth: '80%',
                    background: msg.role === 'user' ? '#F3F4F6' : '#111827',
                    color: msg.role === 'user' ? '#111827' : 'white',
                    fontSize: '0.8rem', lineHeight: '1.4',
                  }}>
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
