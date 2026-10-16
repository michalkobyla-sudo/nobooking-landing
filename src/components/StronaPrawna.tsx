import fs from 'fs'
import path from 'path'
import { markdownNaHtml } from '@/lib/markdown'

/**
 * Strona dokumentu prawnego — regulamin albo polityka prywatności.
 *
 * Treść czytana jest **z pliku w `docs/`**, tego samego, który wersjonuje git
 * i który czyta prawnik. Nie ma drugiej kopii w komponencie: dokument
 * zatwierdzony i dokument opublikowany to ma być ten sam plik.
 *
 * Czytanie z dysku wykonuje się przy budowaniu — strona nie ma parametrów,
 * więc Next generuje ją statycznie i treść wchodzi do HTML-a.
 */
export function StronaPrawna({ plik }: { plik: string }) {
  const sciezka = path.join(process.cwd(), 'docs', plik)
  const html = markdownNaHtml(fs.readFileSync(sciezka, 'utf8'))

  return (
    <main style={{ background: '#F9FAFB', minHeight: '100vh', padding: '3rem 1rem 5rem' }}>
      <article
        className="dokument-prawny"
        style={{
          maxWidth: 760,
          margin: '0 auto',
          background: 'white',
          border: '1px solid #E5E7EB',
          borderRadius: 16,
          padding: '2.5rem clamp(1.25rem, 4vw, 3rem)',
          color: '#1F2937',
          fontSize: '0.95rem',
          lineHeight: 1.7,
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <p style={{ maxWidth: 760, margin: '1.5rem auto 0', textAlign: 'center', fontSize: '0.82rem' }}>
        <a href="/" style={{ color: '#6B7280', textDecoration: 'none' }}>← Nobooking</a>
      </p>

      {/* Style dla treści z Markdowna. Zwykły `style` nie sięga elementów
          wstawionych przez `dangerouslySetInnerHTML`, więc idą selektorem. */}
      <style>{`
        .dokument-prawny h1 { font-size: 1.75rem; font-weight: 800; letter-spacing: -0.02em; margin: 0 0 1.5rem; }
        .dokument-prawny h2 { font-size: 1.2rem; font-weight: 700; margin: 2.5rem 0 0.75rem; }
        .dokument-prawny h3 { font-size: 1rem; font-weight: 700; margin: 1.75rem 0 0.5rem; }
        .dokument-prawny p { margin: 0 0 1rem; }
        .dokument-prawny ul, .dokument-prawny ol { margin: 0 0 1rem; padding-left: 1.25rem; }
        .dokument-prawny li { margin-bottom: 0.4rem; }
        .dokument-prawny a { color: #059669; }
        .dokument-prawny code { background: #F3F4F6; border-radius: 4px; padding: 0.1em 0.35em; font-size: 0.88em; }
        .dokument-prawny hr { border: none; border-top: 1px solid #E5E7EB; margin: 2.5rem 0; }
        .dokument-prawny blockquote {
          margin: 0 0 1.25rem; padding: 0.9rem 1.1rem;
          background: #F9FAFB; border-left: 3px solid #D1D5DB; border-radius: 0 8px 8px 0;
          color: #4B5563; font-size: 0.9rem;
        }
        .dokument-prawny blockquote p:last-child { margin-bottom: 0; }
        .dokument-prawny table { width: 100%; border-collapse: collapse; margin: 0 0 1.25rem; font-size: 0.88rem; }
        .dokument-prawny th, .dokument-prawny td { border: 1px solid #E5E7EB; padding: 0.5rem 0.7rem; text-align: left; vertical-align: top; }
        .dokument-prawny th { background: #F9FAFB; font-weight: 700; }
        @media (max-width: 640px) {
          .dokument-prawny table, .dokument-prawny thead, .dokument-prawny tbody,
          .dokument-prawny tr, .dokument-prawny th, .dokument-prawny td { display: block; }
          .dokument-prawny thead { display: none; }
          .dokument-prawny tr { margin-bottom: 0.75rem; border: 1px solid #E5E7EB; border-radius: 8px; overflow: hidden; }
          .dokument-prawny td { border: none; border-bottom: 1px solid #F3F4F6; }
        }
      `}</style>
    </main>
  )
}
