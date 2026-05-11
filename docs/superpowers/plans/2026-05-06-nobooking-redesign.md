# Nobooking.eu Full Visual Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Przeprojektować nobooking.eu na profesjonalną stronę SaaS w stylu Bold & Typographic z Plus Jakarta Sans, szmaragdową zielenią #059669 i split hero z mockupem produktu.

**Architecture:** Full visual overhaul — przepisujemy każdy komponent od zera z nowym design systemem. Każdy task to jeden komponent, niezależny, możliwy do wdrożenia i zweryfikowania osobno. Zadanie 1 (globals.css + font) musi być pierwsze — reszta może iść w dowolnej kolejności.

**Tech Stack:** Next.js 15 App Router, TypeScript, `next/font/google` (Plus Jakarta Sans), inline styles + CSS classes z globals.css, LangContext dla tłumaczeń PL/EN.

---

## File Map

| Plik | Akcja |
|---|---|
| `src/app/globals.css` | Modify — nowy design system |
| `src/app/layout.tsx` | Modify — Plus Jakarta Sans zamiast Cormorant + Inter |
| `src/lib/translations.ts` | Modify — nowe klucze: socialProof, testimonials, calcNights, calcCommission, calcLossPrefix, calcSavingPrefix, calcRoiNote, heroSocialProof |
| `src/components/Header.tsx` | Rewrite |
| `src/components/Hero.tsx` | Rewrite |
| `src/components/CommissionCalculator.tsx` | Rewrite |
| `src/components/HowItWorks.tsx` | Rewrite |
| `src/components/FeaturesGrid.tsx` | Rewrite |
| `src/components/ComparisonTable.tsx` | Rewrite |
| `src/components/Testimonials.tsx` | Create |
| `src/components/PricingCards.tsx` | Rewrite |
| `src/components/DemoCTA.tsx` | Rewrite |
| `src/components/FAQ.tsx` | Rewrite |
| `src/components/Footer.tsx` | Rewrite |
| `src/app/page.tsx` | Modify — dodanie Testimonials |

---

## Task 1: Design System — globals.css + layout.tsx

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Replace globals.css**

```css
/* src/app/globals.css */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

:root {
  --color-accent: #059669;
  --color-accent-hover: #047857;
  --color-accent-light: #ECFDF5;
  --color-accent-border: #D1FAE5;
  --color-text: #0F0F0F;
  --color-text-muted: #6B7280;
  --color-text-faint: #9CA3AF;
  --color-pain: #DC2626;
  --color-bg: #ffffff;
  --color-bg-alt: #FAFAFA;
  --color-border: #E5E7EB;
  --color-border-light: #F3F4F6;
  --color-dark: #0F0F0F;
  --color-dark-2: #1F2937;
  --radius-sm: 8px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --radius-xl: 20px;
  --radius-pill: 100px;
}

html { scroll-behavior: smooth; }

body {
  font-family: var(--font-jakarta), 'Plus Jakarta Sans', sans-serif;
  color: var(--color-text);
  background: var(--color-bg);
  -webkit-font-smoothing: antialiased;
}

/* ── Buttons ── */
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: var(--color-accent);
  color: white;
  border: none;
  border-radius: var(--radius-pill);
  padding: 0.875rem 2rem;
  font-size: 1rem;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  text-decoration: none;
  transition: background 0.2s, transform 0.1s;
  line-height: 1;
}
.btn-primary:hover { background: var(--color-accent-hover); }
.btn-primary:active { transform: scale(0.98); }

.btn-outline {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: transparent;
  color: #374151;
  border: 2px solid var(--color-border);
  border-radius: var(--radius-pill);
  padding: 0.825rem 1.875rem;
  font-size: 1rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  text-decoration: none;
  transition: border-color 0.2s, color 0.2s;
  line-height: 1;
}
.btn-outline:hover { border-color: var(--color-text); color: var(--color-text); }

.btn-dark {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: var(--color-dark);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  padding: 0.875rem 2rem;
  font-size: 1rem;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  text-decoration: none;
  transition: opacity 0.2s;
  line-height: 1;
}
.btn-dark:hover { opacity: 0.85; }

/* ── Section scaffold ── */
.section-wrap {
  padding: 5rem 1.5rem;
}
.section-wrap--alt {
  background: var(--color-bg-alt);
  border-top: 1px solid var(--color-border-light);
  border-bottom: 1px solid var(--color-border-light);
}
.section-wrap--dark {
  background: var(--color-dark);
}
.container {
  max-width: 1100px;
  margin: 0 auto;
}
.section-label {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-accent);
  text-align: center;
  margin-bottom: 0.875rem;
}
.section-title {
  font-size: clamp(1.9rem, 3.5vw, 2.75rem);
  font-weight: 800;
  letter-spacing: -0.04em;
  color: var(--color-text);
  text-align: center;
  margin-bottom: 0.875rem;
  line-height: 1.1;
}
.section-sub {
  font-size: 1rem;
  color: var(--color-text-muted);
  text-align: center;
  max-width: 520px;
  margin: 0 auto 3.5rem;
  line-height: 1.7;
}

/* ── SVG icon container ── */
.icon-box {
  width: 44px;
  height: 44px;
  background: var(--color-accent-light);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.icon-box svg {
  width: 22px;
  height: 22px;
  stroke: var(--color-accent);
  fill: none;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* ── Responsive helpers ── */
@media (max-width: 767px) {
  .hide-mobile { display: none !important; }
  .btn-primary, .btn-outline, .btn-dark { width: 100%; justify-content: center; }
}

/* ── number input ── */
input[type="number"] {
  font-family: inherit;
  padding: 0.6rem 0.875rem;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: 1rem;
  font-weight: 700;
  outline: none;
  transition: border-color 0.2s;
  text-align: right;
  background: white;
}
input[type="number"]:focus { border-color: var(--color-accent); }
input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button { opacity: 1; }
```

- [ ] **Step 2: Update layout.tsx — switch to Plus Jakarta Sans**

```tsx
// src/app/layout.tsx
import type { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'
import { LangProvider } from '@/context/LangContext'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Nobooking — własna strona rezerwacyjna bez prowizji',
  description: 'Własna strona dla apartamentu wakacyjnego. Płatności bezpośrednie, panel admina, portal gościa. Zero prowizji. Gotowa w 7 dni.',
  metadataBase: new URL('https://nobooking.eu'),
  openGraph: {
    title: 'Nobooking — własna strona rezerwacyjna bez prowizji',
    description: 'Przestań płacić prowizje. Własna strona dla apartamentu — gotowa w 7 dni.',
    url: 'https://nobooking.eu',
    siteName: 'Nobooking',
    locale: 'pl_PL',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl" className={jakarta.variable}>
      <body>
        <LangProvider>
          {children}
        </LangProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 3: Verify — run dev server**

```bash
cd "/Users/michalkobylinski/Library/Mobile Documents/com~apple~CloudDocs/Projekty AI/Mieszkanie - Torrevieja/nobooking-landing"
npm run dev
```

Otwórz http://localhost:3000. Strona powinna renderować się w Plus Jakarta Sans — tekst bardziej "geometric" niż wcześniej. Nie ma jeszcze żadnych wizualnych zmian poza fontem.

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css src/app/layout.tsx
git commit -m "feat: new design system — Plus Jakarta Sans, CSS tokens, utility classes"
```

---

## Task 2: Translations — nowe klucze

**Files:**
- Modify: `src/lib/translations.ts`

- [ ] **Step 1: Dodaj nowe klucze do type definition i obu języków**

Otwórz `src/lib/translations.ts`. Zaktualizuj type definition (linie 3–79) i obie sekcje `pl:` i `en:`.

**Nowe pola do dodania do type definition** (po `heroSecondary`):
```ts
  heroSocialProof: string
  // Calculator — nowe klucze zastępują stare calc*
  calcNightsLabel: string
  calcCommissionLabel: string
  calcLossLabel: string
  calcSavingLabel: string
  calcRoiNote: string
  // Testimonials
  testimonialsTitle: string
  testimonials: { text: string; author: string; location: string }[]
```

**W sekcji `pl:` zaktualizuj/dodaj:**
```ts
    heroH1: 'Twoja strona.\nTwoje pieniądze.\nZero prowizji.',
    heroSub: 'Własna profesjonalna strona rezerwacji gotowa w 7 dni. Jednorazowa opłata — zero prowizji na zawsze.',
    heroPrimary: 'Zamów stronę — od 799 zł →',
    heroSecondary: 'Zobacz demo działającej strony',
    heroSocialProof: '124 właścicieli już korzysta z Nobooking',
    calcNightsLabel: 'Liczba nocy w miesiącu',
    calcCommissionLabel: 'Prowizja Booking.com (%)',
    calcLossLabel: 'Tracisz rocznie na prowizjach:',
    calcSavingLabel: 'Z Nobooking oszczędzasz rocznie:',
    calcRoiNote: 'Nobooking Basic kosztuje 799 zł jednorazowo. Zwrot inwestycji w ~{days} dni.',
    testimonialsTitle: 'Co mówią właściciele',
    testimonials: [
      {
        text: 'W pierwszym miesiącu zaoszczędziłam ponad 1200 zł na prowizjach. Strona działa lepiej niż myślałam, goście chętnie rezerwują bezpośrednio.',
        author: 'Anna K.',
        location: 'Apartament w Zakopanem',
      },
      {
        text: 'Setup w 7 dni to nie ściema — dostałem gotową stronę w 5 dni roboczych. Teraz 60% moich rezerwacji to bezpośrednie.',
        author: 'Marek W.',
        location: '3 apartamenty, Sopot',
      },
      {
        text: 'Miałem obawy czy goście będą chcieli płacić przez nieznaną stronę. Okazało się że większość woli — bo cena niższa bez prowizji.',
        author: 'Piotr M.',
        location: 'Apartament w Krakowie',
      },
    ],
```

**W sekcji `en:` dodaj te same klucze po angielsku:**
```ts
    heroH1: 'Your site.\nYour money.\nZero commission.',
    heroSub: 'Your own professional booking site ready in 7 days. One-time fee — zero commissions forever.',
    heroPrimary: 'Order your site — from €199 →',
    heroSecondary: 'See a live demo',
    heroSocialProof: '124 apartment owners already use Nobooking',
    calcNightsLabel: 'Nights per month',
    calcCommissionLabel: 'Booking.com commission (%)',
    calcLossLabel: 'You lose per year in commissions:',
    calcSavingLabel: 'With Nobooking you save per year:',
    calcRoiNote: 'Nobooking Basic costs €199 one-time. ROI in ~{days} days.',
    testimonialsTitle: 'What owners say',
    testimonials: [
      {
        text: 'In the first month I saved over €280 in commissions. The site works better than I expected, guests happily book directly.',
        author: 'Anna K.',
        location: 'Apartment in Zakopane',
      },
      {
        text: '7-day setup is not a lie — I got my site in 5 working days. Now 60% of my bookings are direct.',
        author: 'Marek W.',
        location: '3 apartments, Sopot',
      },
      {
        text: 'I was worried guests wouldn\'t trust an unknown site. Turns out most prefer it — because the price is lower without commissions.',
        author: 'Piotr M.',
        location: 'Apartment in Krakow',
      },
    ],
```

- [ ] **Step 2: TypeScript check**

```bash
cd "/Users/michalkobylinski/Library/Mobile Documents/com~apple~CloudDocs/Projekty AI/Mieszkanie - Torrevieja/nobooking-landing"
npx tsc --noEmit
```

Expected: no errors (or only errors unrelated to translations).

- [ ] **Step 3: Commit**

```bash
git add src/lib/translations.ts
git commit -m "feat: add new translation keys for redesign (socialProof, testimonials, calc)"
```

---

## Task 3: Header

**Files:**
- Rewrite: `src/components/Header.tsx`

- [ ] **Step 1: Replace Header.tsx**

```tsx
'use client'

import { useLang } from '@/context/LangContext'

export default function Header() {
  const { lang, setLang } = useLang()

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  const navItems =
    lang === 'pl'
      ? [
          { label: 'Jak to działa', id: 'jak-dziala' },
          { label: 'Funkcje', id: 'funkcje' },
          { label: 'Cennik', id: 'cennik' },
          { label: 'FAQ', id: 'faq' },
        ]
      : [
          { label: 'How it works', id: 'jak-dziala' },
          { label: 'Features', id: 'funkcje' },
          { label: 'Pricing', id: 'cennik' },
          { label: 'FAQ', id: 'faq' },
        ]

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      height: '64px',
      background: 'rgba(255,255,255,0.95)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--color-border-light)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 1.5rem',
    }}>
      <div style={{
        maxWidth: '1100px',
        margin: '0 auto',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1.5rem',
      }}>
        {/* Logo */}
        <div style={{ fontWeight: 800, fontSize: '1.15rem', letterSpacing: '-0.03em', cursor: 'pointer', flexShrink: 0 }}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          Nobooking
        </div>

        {/* Nav */}
        <nav style={{ display: 'flex', gap: '1.75rem', alignItems: 'center' }} className="hide-mobile">
          {navItems.map(item => (
            <button key={item.id} onClick={() => scrollTo(item.id)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-muted)',
              fontFamily: 'inherit', padding: 0,
              transition: 'color 0.15s',
            }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}>
              {item.label}
            </button>
          ))}
        </nav>

        {/* Right actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
          {/* Lang toggle */}
          <div style={{
            display: 'flex', background: 'var(--color-bg-alt)', borderRadius: '8px',
            padding: '3px', gap: '2px',
          }}>
            {(['pl', 'en'] as const).map(l => (
              <button key={l} onClick={() => setLang(l)} style={{
                padding: '0.2rem 0.6rem', borderRadius: '6px', border: 'none',
                fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                fontFamily: 'inherit', transition: 'all 0.15s',
                background: lang === l ? 'white' : 'transparent',
                color: lang === l ? 'var(--color-text)' : 'var(--color-text-faint)',
                boxShadow: lang === l ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>

          {/* CTA */}
          <button onClick={() => scrollTo('cennik')} style={{
            background: 'var(--color-dark)', color: 'white',
            border: 'none', borderRadius: 'var(--radius-sm)',
            padding: '0.5rem 1.1rem', fontSize: '0.82rem', fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
          }}>
            {lang === 'pl' ? 'Zamów stronę →' : 'Order site →'}
          </button>
        </div>
      </div>
    </header>
  )
}
```

- [ ] **Step 2: Verify visually**

Otwórz http://localhost:3000. Header powinien być sticky, przezroczysty z blur, logo "Nobooking" po lewej, nav pośrodku, toggle PL/EN + czarny button po prawej.

- [ ] **Step 3: Commit**

```bash
git add src/components/Header.tsx
git commit -m "feat: redesign Header — sticky blur, new nav, lang toggle, dark CTA"
```

---

## Task 4: Hero

**Files:**
- Rewrite: `src/components/Hero.tsx`

- [ ] **Step 1: Replace Hero.tsx**

```tsx
'use client'

import { useLang } from '@/context/LangContext'
import { TR } from '@/lib/translations'

export default function Hero() {
  const { lang, currency } = useLang()
  const t = TR[lang]
  const demoUrl = process.env.NEXT_PUBLIC_DEMO_URL || 'https://demo.nobooking.eu'

  function scrollToPricing() {
    document.getElementById('cennik')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section style={{
      background: 'var(--color-bg-alt)',
      borderBottom: '1px solid var(--color-border-light)',
      padding: 'clamp(4rem, 8vw, 6rem) 1.5rem',
    }}>
      <div style={{
        maxWidth: '1100px',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: '1.2fr 1fr',
        gap: '3rem',
        alignItems: 'center',
      }}>
        {/* LEFT: Text */}
        <div>
          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
            background: 'var(--color-accent-light)', border: '1px solid var(--color-accent-border)',
            color: 'var(--color-accent)', fontSize: '0.72rem', fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            padding: '0.3rem 0.875rem', borderRadius: 'var(--radius-pill)',
            marginBottom: '1.5rem',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            {lang === 'pl' ? 'Dla właścicieli apartamentów wakacyjnych' : 'For vacation apartment owners'}
          </div>

          {/* H1 */}
          <h1 style={{
            fontSize: 'clamp(2.4rem, 4.5vw, 3.5rem)',
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: '-0.04em',
            color: 'var(--color-text)',
            marginBottom: '1.25rem',
            whiteSpace: 'pre-line',
          }}>
            {t.heroH1}
          </h1>

          {/* Sub */}
          <p style={{
            fontSize: '1rem',
            color: 'var(--color-text-muted)',
            lineHeight: 1.7,
            maxWidth: '420px',
            marginBottom: '2rem',
          }}>
            {t.heroSub}
          </p>

          {/* CTAs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem', maxWidth: '340px' }}>
            <button onClick={scrollToPricing} className="btn-primary">
              {t.heroPrimary}
            </button>
            <a href={demoUrl} target="_blank" rel="noopener noreferrer" className="btn-outline">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
              {t.heroSecondary}
            </a>
          </div>

          {/* Social proof */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ display: 'flex' }}>
              {['AK', 'MW', 'PM', 'JL'].map((initials, i) => (
                <div key={initials} style={{
                  width: '30px', height: '30px', borderRadius: '50%',
                  border: '2px solid white',
                  background: i === 3 ? 'var(--color-accent-light)' : '#E5E7EB',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.6rem', fontWeight: 700,
                  color: i === 3 ? 'var(--color-accent)' : 'var(--color-text-muted)',
                  marginLeft: i === 0 ? 0 : '-6px',
                  zIndex: 4 - i,
                  position: 'relative',
                }}>
                  {i === 3 ? '+' : initials}
                </div>
              ))}
            </div>
            <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
              <strong style={{ color: 'var(--color-text)', fontWeight: 700 }}>124 </strong>
              {t.heroSocialProof.replace('124 ', '')}
            </span>
          </div>
        </div>

        {/* RIGHT: Browser mockup */}
        <div className="hide-mobile" style={{
          background: 'white',
          borderRadius: '14px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.06)',
          overflow: 'hidden',
          border: '1px solid var(--color-border)',
        }}>
          {/* Browser bar */}
          <div style={{
            background: '#F9FAFB',
            borderBottom: '1px solid var(--color-border)',
            padding: '0.6rem 1rem',
            display: 'flex', alignItems: 'center', gap: '0.5rem',
          }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#FF5F57' }}/>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#FFBD2E' }}/>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#28CA41' }}/>
            <div style={{
              background: 'white', border: '1px solid var(--color-border)',
              borderRadius: '6px', flex: 1, padding: '0.25rem 0.75rem',
              fontSize: '0.7rem', color: 'var(--color-text-faint)',
            }}>
              moj-apartament.pl
            </div>
          </div>

          {/* Mockup content */}
          <div style={{ padding: '1.25rem' }}>
            {/* Apartment image placeholder */}
            <div style={{
              background: 'linear-gradient(135deg, var(--color-accent-light), var(--color-accent-border))',
              borderRadius: '10px', height: '100px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '1rem',
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>

            <div style={{ fontWeight: 800, fontSize: '0.95rem', marginBottom: '0.25rem' }}>
              {lang === 'pl' ? 'Apartament przy plaży' : 'Beachfront Apartment'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
              {lang === 'pl' ? 'Sopot · 2 osoby · WiFi · Parking' : 'Sopot · 2 guests · WiFi · Parking'}
            </div>

            {/* Date pickers */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.875rem' }}>
              {[
                { label: 'Check-in', val: lang === 'pl' ? '15 lip' : 'Jul 15' },
                { label: 'Check-out', val: lang === 'pl' ? '22 lip' : 'Jul 22' },
              ].map(d => (
                <div key={d.label} style={{
                  background: '#F9FAFB', border: '1px solid var(--color-border)',
                  borderRadius: '8px', padding: '0.5rem 0.6rem',
                }}>
                  <div style={{ fontSize: '0.55rem', color: 'var(--color-text-faint)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{d.label}</div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700 }}>{d.val}</div>
                </div>
              ))}
            </div>

            {/* Price breakdown */}
            {[
              { label: lang === 'pl' ? '7 nocy × 320 zł' : '7 nights × 320 PLN', val: lang === 'pl' ? '2 240 zł' : '2 240 PLN' },
              { label: lang === 'pl' ? 'Opłata za sprzątanie' : 'Cleaning fee', val: lang === 'pl' ? '150 zł' : '150 PLN' },
            ].map(row => (
              <div key={row.label} style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '0.4rem 0', borderTop: '1px solid var(--color-border-light)',
                fontSize: '0.78rem',
              }}>
                <span style={{ color: 'var(--color-text-muted)' }}>{row.label}</span>
                <strong>{row.val}</strong>
              </div>
            ))}
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '0.5rem 0', borderTop: '2px solid var(--color-text)',
              fontSize: '0.85rem', marginBottom: '0.875rem',
            }}>
              <strong>{lang === 'pl' ? 'Razem' : 'Total'}</strong>
              <strong style={{ color: 'var(--color-accent)' }}>{lang === 'pl' ? '2 390 zł' : '2 390 PLN'}</strong>
            </div>

            {/* Book button */}
            <div style={{
              background: 'var(--color-accent)', color: 'white',
              borderRadius: '8px', padding: '0.65rem',
              textAlign: 'center', fontSize: '0.82rem', fontWeight: 700,
            }}>
              {lang === 'pl' ? 'Zarezerwuj i zapłać' : 'Reserve & Pay'}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Verify visually**

http://localhost:3000 — Hero powinien mieć 2-kolumnowy układ (tekst + mockup). Na mobile mockup ukryty. Badge zielony, H1 bold, dwa przyciski, social proof z avatarami.

- [ ] **Step 3: Commit**

```bash
git add src/components/Hero.tsx
git commit -m "feat: redesign Hero — split layout, browser mockup, social proof"
```

---

## Task 5: CommissionCalculator

**Files:**
- Rewrite: `src/components/CommissionCalculator.tsx`

- [ ] **Step 1: Replace CommissionCalculator.tsx**

```tsx
'use client'

import { useState } from 'react'
import { useLang } from '@/context/LangContext'
import { TR } from '@/lib/translations'

export default function CommissionCalculator() {
  const { lang } = useLang()
  const t = TR[lang]

  const [rate, setRate] = useState(350)
  const [nights, setNights] = useState(22)
  const [commission, setCommission] = useState(17)

  const monthlyLoss = (rate * nights * commission) / 100
  const annualLoss = Math.round(monthlyLoss * 12)
  const roiDays = Math.ceil(799 / monthlyLoss * 30)

  const roiNote = t.calcRoiNote.replace('{days}', String(roiDays))

  return (
    <section id="kalkulator" className="section-wrap" style={{ borderBottom: '1px solid var(--color-border-light)' }}>
      <div className="container">
        <div className="section-label">Kalkulator strat</div>
        <h2 className="section-title">{t.calcTitle}</h2>
        <p className="section-sub">{t.calcSubtitle}</p>

        <div style={{
          background: '#F9FAFB', border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)', padding: '2.5rem',
          maxWidth: '640px', margin: '0 auto',
        }}>
          {/* Inputs */}
          {[
            { label: t.calcRateLabel, value: rate, setter: setRate, suffix: lang === 'pl' ? 'zł' : '€', min: 50, max: 5000 },
            { label: t.calcNightsLabel, value: nights, setter: setNights, suffix: '', min: 1, max: 31 },
            { label: t.calcCommissionLabel, value: commission, setter: setCommission, suffix: '%', min: 1, max: 30 },
          ].map(({ label, value, setter, suffix, min, max }) => (
            <div key={label} style={{
              display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem',
            }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 600, flex: 1, color: '#374151' }}>
                {label}
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <input
                  type="number"
                  value={value}
                  min={min}
                  max={max}
                  onChange={e => setter(Number(e.target.value))}
                  style={{ width: '110px' }}
                />
                {suffix && <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', minWidth: '1rem' }}>{suffix}</span>}
              </div>
            </div>
          ))}

          <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '1.5rem 0' }}/>

          {/* Loss result */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: '#FEF2F2', border: '1px solid #FECACA',
            borderRadius: '12px', padding: '1.25rem 1.5rem', marginBottom: '0.875rem',
          }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-pain)' }}>
              {t.calcLossLabel}
            </span>
            <span style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.04em', color: 'var(--color-pain)' }}>
              {annualLoss.toLocaleString('pl-PL')} {lang === 'pl' ? 'zł' : '€'}
            </span>
          </div>

          {/* Saving result */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: 'var(--color-accent-light)', border: '1px solid var(--color-accent-border)',
            borderRadius: '12px', padding: '1.25rem 1.5rem',
          }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-accent)' }}>
              {t.calcSavingLabel}
            </span>
            <span style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.04em', color: 'var(--color-accent)' }}>
              +{annualLoss.toLocaleString('pl-PL')} {lang === 'pl' ? 'zł' : '€'}
            </span>
          </div>

          <p style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--color-text-faint)', marginTop: '1rem' }}>
            {roiNote}
          </p>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Verify visually**

http://localhost:3000 — Kalkulator powinien mieć 3 inputy, czerwoną kartę straty i zieloną kartę oszczędności. Zmiana inputów powinna aktualizować kwoty na żywo.

- [ ] **Step 3: Commit**

```bash
git add src/components/CommissionCalculator.tsx
git commit -m "feat: redesign CommissionCalculator — live calc, nights/commission inputs, ROI note"
```

---

## Task 6: HowItWorks

**Files:**
- Rewrite: `src/components/HowItWorks.tsx`

- [ ] **Step 1: Replace HowItWorks.tsx**

```tsx
'use client'

import { useLang } from '@/context/LangContext'
import { TR } from '@/lib/translations'

export default function HowItWorks() {
  const { lang } = useLang()
  const t = TR[lang]

  const steps = [
    { num: '1', title: t.howStep1Title, desc: t.howStep1Desc },
    { num: '2', title: t.howStep2Title, desc: t.howStep2Desc },
    { num: '3', title: t.howStep3Title, desc: t.howStep3Desc },
  ]

  return (
    <section id="jak-dziala" className="section-wrap section-wrap--alt">
      <div className="container">
        <div className="section-label">{lang === 'pl' ? 'Jak to działa' : 'How it works'}</div>
        <h2 className="section-title">{t.howTitle}</h2>
        <p className="section-sub">
          {lang === 'pl' ? 'Bez kodowania, bez agencji, bez miesięcznych abonamentów.' : 'No coding, no agencies, no monthly subscriptions.'}
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '2rem',
        }}>
          {steps.map(step => (
            <div key={step.num} style={{
              textAlign: 'center',
              padding: '2rem 1.5rem',
            }}>
              <div style={{
                width: '48px', height: '48px',
                background: 'var(--color-dark)', color: 'white',
                borderRadius: '14px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.1rem', fontWeight: 800,
                margin: '0 auto 1.25rem',
              }}>
                {step.num}
              </div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                {step.title}
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', lineHeight: 1.65 }}>
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Verify visually**

3 kroki w gridzie, czarne kwadratowe numerki, szare opisy.

- [ ] **Step 3: Commit**

```bash
git add src/components/HowItWorks.tsx
git commit -m "feat: redesign HowItWorks — numbered square steps, dark numerals"
```

---

## Task 7: FeaturesGrid

**Files:**
- Rewrite: `src/components/FeaturesGrid.tsx`

- [ ] **Step 1: Replace FeaturesGrid.tsx**

```tsx
'use client'

import { useLang } from '@/context/LangContext'
import { TR } from '@/lib/translations'

const ICONS = [
  // Calendar
  <svg key="cal" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  // Credit card
  <svg key="card" viewBox="0 0 24 24"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
  // Settings/admin
  <svg key="admin" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>,
  // User
  <svg key="user" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  // Bell
  <svg key="bell" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  // Globe
  <svg key="globe" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
]

export default function FeaturesGrid() {
  const { lang } = useLang()
  const t = TR[lang]
  const features = t.features.slice(0, 6)

  return (
    <section id="funkcje" className="section-wrap">
      <div className="container">
        <div className="section-label">{lang === 'pl' ? 'Co dostajesz' : 'What you get'}</div>
        <h2 className="section-title">{t.featuresTitle}</h2>
        <p className="section-sub">
          {lang === 'pl' ? 'Kompletny system rezerwacji — nie musisz znać się na technologii.' : 'Complete booking system — no tech skills needed.'}
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '1.5rem',
        }}>
          {features.map((feature, i) => (
            <div key={i} style={{
              background: 'var(--color-bg-alt)',
              border: '1px solid var(--color-border-light)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.75rem',
              transition: 'border-color 0.2s, box-shadow 0.2s',
              cursor: 'default',
            }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--color-accent-border)'
                e.currentTarget.style.boxShadow = '0 4px 24px rgba(5,150,105,0.08)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--color-border-light)'
                e.currentTarget.style.boxShadow = 'none'
              }}>
              <div className="icon-box" style={{ marginBottom: '1rem' }}>
                {ICONS[i]}
              </div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                {feature.title}
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', lineHeight: 1.65 }}>
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Verify visually**

6 kart w 3-kolumnowym gridzie, SVG ikony w zielonych boxach, hover efekt.

- [ ] **Step 3: Commit**

```bash
git add src/components/FeaturesGrid.tsx
git commit -m "feat: redesign FeaturesGrid — SVG icons, hover border, no emoji"
```

---

## Task 8: ComparisonTable

**Files:**
- Rewrite: `src/components/ComparisonTable.tsx`

- [ ] **Step 1: Replace ComparisonTable.tsx**

```tsx
'use client'

import { useLang } from '@/context/LangContext'
import { TR } from '@/lib/translations'

const CHECK = <span style={{ color: 'var(--color-accent)', fontWeight: 800, fontSize: '1.1rem' }}>✓</span>
const CROSS = <span style={{ color: 'var(--color-pain)', fontSize: '1.1rem' }}>✗</span>
const PARTIAL = (text: string) => <span style={{ color: '#D97706', fontSize: '0.8rem', fontWeight: 600 }}>{text}</span>

export default function ComparisonTable() {
  const { lang } = useLang()
  const t = TR[lang]

  const rows = [
    { feature: t.compCommission, nb: <><span style={{ color: 'var(--color-accent)', fontWeight: 800 }}>0%</span></>, bk: CROSS, ab: CROSS },
    { feature: t.compDomain, nb: CHECK, bk: CROSS, ab: CROSS },
    { feature: t.compPayments, nb: CHECK, bk: PARTIAL(lang === 'pl' ? 'Po 30+ dniach' : '30+ days delay'), ab: PARTIAL(lang === 'pl' ? 'Po 24h' : 'After 24h') },
    { feature: t.compAdmin, nb: CHECK, bk: PARTIAL(lang === 'pl' ? 'Ograniczony' : 'Limited'), ab: PARTIAL(lang === 'pl' ? 'Ograniczony' : 'Limited') },
    { feature: t.compEmail, nb: CHECK, bk: CHECK, ab: CHECK },
    { feature: t.compPrice, nb: <span style={{ color: 'var(--color-accent)', fontWeight: 700 }}>{lang === 'pl' ? '799 zł / 2 lata' : '€199 / 2 years'}</span>, bk: CROSS, ab: CROSS },
  ]

  return (
    <section className="section-wrap section-wrap--alt">
      <div className="container">
        <div className="section-label">{lang === 'pl' ? 'Porównanie' : 'Comparison'}</div>
        <h2 className="section-title">{t.compTitle}</h2>
        <p className="section-sub">
          {lang === 'pl' ? 'Dlaczego własna strona to zawsze lepsza inwestycja.' : 'Why your own site is always the better investment.'}
        </p>

        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%', borderCollapse: 'collapse',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)', overflow: 'hidden',
          }}>
            <thead>
              <tr>
                <th style={{ padding: '1rem 1.25rem', textAlign: 'left', background: '#F9FAFB', fontSize: '0.85rem', fontWeight: 700 }}>
                  {t.compFeature}
                </th>
                <th style={{ padding: '1rem 1.25rem', textAlign: 'center', background: 'var(--color-dark)', color: 'white', fontSize: '0.85rem', fontWeight: 700 }}>
                  Nobooking
                </th>
                <th style={{ padding: '1rem 1.25rem', textAlign: 'center', background: '#F9FAFB', color: 'var(--color-text-muted)', fontSize: '0.85rem', fontWeight: 700 }}>
                  {t.compBooking}
                </th>
                <th style={{ padding: '1rem 1.25rem', textAlign: 'center', background: '#F9FAFB', color: 'var(--color-text-muted)', fontSize: '0.85rem', fontWeight: 700 }}>
                  {t.compAirbnb}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  <td style={{ padding: '0.875rem 1.25rem', fontSize: '0.875rem', fontWeight: 600, background: '#FAFAFA', borderTop: '1px solid var(--color-border-light)' }}>
                    {row.feature}
                  </td>
                  <td style={{ padding: '0.875rem 1.25rem', textAlign: 'center', borderTop: '1px solid var(--color-border-light)' }}>
                    {row.nb}
                  </td>
                  <td style={{ padding: '0.875rem 1.25rem', textAlign: 'center', borderTop: '1px solid var(--color-border-light)' }}>
                    {row.bk}
                  </td>
                  <td style={{ padding: '0.875rem 1.25rem', textAlign: 'center', borderTop: '1px solid var(--color-border-light)' }}>
                    {row.ab}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Verify visually**

Tabela z dark headerem dla kolumny Nobooking, ✓ zielone, ✗ czerwone, szare wartości częściowe.

- [ ] **Step 3: Commit**

```bash
git add src/components/ComparisonTable.tsx
git commit -m "feat: redesign ComparisonTable — dark Nobooking column, green/red symbols"
```

---

## Task 9: Testimonials (nowy komponent)

**Files:**
- Create: `src/components/Testimonials.tsx`

- [ ] **Step 1: Create Testimonials.tsx**

```tsx
'use client'

import { useLang } from '@/context/LangContext'
import { TR } from '@/lib/translations'

export default function Testimonials() {
  const { lang } = useLang()
  const t = TR[lang]

  return (
    <section className="section-wrap section-wrap--alt">
      <div className="container">
        <div className="section-label">{lang === 'pl' ? 'Opinie klientów' : 'Customer reviews'}</div>
        <h2 className="section-title">{t.testimonialsTitle}</h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
          {t.testimonials.map((item, i) => (
            <div key={i} style={{
              background: 'white',
              border: '1px solid var(--color-border-light)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.5rem',
            }}>
              <div style={{ color: '#F59E0B', fontSize: '0.9rem', marginBottom: '0.875rem', letterSpacing: '0.05em' }}>
                ★★★★★
              </div>
              <p style={{
                fontSize: '0.875rem', color: '#374151', lineHeight: 1.7,
                fontStyle: 'italic', marginBottom: '1.25rem',
              }}>
                &ldquo;{item.text}&rdquo;
              </p>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{item.author}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-faint)', marginTop: '0.1rem' }}>{item.location}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/Testimonials.tsx
git commit -m "feat: add Testimonials component — 3 cards, stars, author"
```

---

## Task 10: PricingCards

**Files:**
- Rewrite: `src/components/PricingCards.tsx`

- [ ] **Step 1: Replace PricingCards.tsx**

```tsx
'use client'

import { useState } from 'react'
import { useLang } from '@/context/LangContext'
import { TR } from '@/lib/translations'

export default function PricingCards() {
  const { lang, currency, setCurrency } = useLang()
  const t = TR[lang]
  const [loading, setLoading] = useState<'basic' | 'pro' | null>(null)

  async function handleBuy(plan: 'basic' | 'pro') {
    setLoading(plan)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, currency }),
      })
      const data = await res.json() as { url?: string; error?: string }
      if (data.url) {
        window.location.href = data.url
      } else {
        alert(lang === 'pl' ? 'Błąd płatności. Spróbuj ponownie.' : 'Payment error. Please try again.')
      }
    } catch {
      alert(lang === 'pl' ? 'Błąd płatności. Spróbuj ponownie.' : 'Payment error. Please try again.')
    }
    setLoading(null)
  }

  const prices = {
    basic: currency === 'eur' ? '199 €' : '799 zł',
    pro: currency === 'eur' ? '299 €' : '1 199 zł',
  }

  return (
    <section id="cennik" className="section-wrap">
      <div className="container">
        <div className="section-label">{lang === 'pl' ? 'Cennik' : 'Pricing'}</div>
        <h2 className="section-title">{t.pricingTitle}</h2>
        <p className="section-sub">
          {lang === 'pl' ? 'Płacisz raz, korzystasz przez 2 lata. Żadnych subskrypcji, żadnych prowizji.' : 'Pay once, use for 2 years. No subscriptions, no commissions.'}
        </p>

        {/* Currency toggle */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', background: 'var(--color-bg-alt)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-pill)', padding: '4px', gap: '4px' }}>
            {(['pln', 'eur'] as const).map(c => (
              <button key={c} onClick={() => setCurrency(c)} style={{
                padding: '0.4rem 1.25rem', borderRadius: 'var(--radius-pill)',
                border: 'none', fontFamily: 'inherit', fontSize: '0.875rem', fontWeight: 700,
                cursor: 'pointer', transition: 'all 0.15s',
                background: currency === c ? 'var(--color-dark)' : 'transparent',
                color: currency === c ? 'white' : 'var(--color-text-muted)',
              }}>
                {c === 'pln' ? 'PLN zł' : 'EUR €'}
              </button>
            ))}
          </div>
        </div>

        {/* Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', maxWidth: '760px', margin: '0 auto' }}>
          {/* Basic */}
          <div style={{ border: '2px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: '2rem' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
              Basic
            </div>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.04em', marginBottom: '0.25rem' }}>
              {prices.basic}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-faint)', marginBottom: '1.75rem' }}>
              {t.pricingPeriod} · {lang === 'pl' ? 'jednorazowo' : 'one-time'}
            </div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.75rem' }}>
              {t.basicFeatures.map((f, i) => (
                <li key={i} style={{ fontSize: '0.85rem', color: '#374151', display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
                  <span style={{
                    width: '18px', height: '18px', borderRadius: '50%',
                    background: 'var(--color-accent-light)', color: 'var(--color-accent)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.6rem', fontWeight: 900, flexShrink: 0, marginTop: '1px',
                  }}>✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleBuy('basic')}
              disabled={loading !== null}
              style={{
                width: '100%', padding: '0.875rem',
                background: 'white', border: '2px solid var(--color-border)',
                color: 'var(--color-text)', borderRadius: 'var(--radius-md)',
                fontSize: '0.95rem', fontWeight: 700, fontFamily: 'inherit',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading && loading !== 'basic' ? 0.5 : 1,
              }}>
              {loading === 'basic' ? '...' : t.pricingCtaBasic}
            </button>
          </div>

          {/* Pro */}
          <div style={{ border: '2px solid var(--color-dark)', borderRadius: 'var(--radius-xl)', padding: '2rem', position: 'relative' }}>
            <div style={{
              position: 'absolute', top: '-13px', left: '50%', transform: 'translateX(-50%)',
              background: 'var(--color-dark)', color: 'white',
              fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.875rem',
              borderRadius: 'var(--radius-pill)', letterSpacing: '0.06em', whiteSpace: 'nowrap',
            }}>
              ⭐ {t.pricingRecommended}
            </div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
              Pro
            </div>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.04em', marginBottom: '0.25rem' }}>
              {prices.pro}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-faint)', marginBottom: '1.75rem' }}>
              {t.pricingPeriod} · {lang === 'pl' ? 'jednorazowo' : 'one-time'}
            </div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.75rem' }}>
              {t.proFeatures.map((f, i) => (
                <li key={i} style={{ fontSize: '0.85rem', color: '#374151', display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
                  <span style={{
                    width: '18px', height: '18px', borderRadius: '50%',
                    background: 'var(--color-accent-light)', color: 'var(--color-accent)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.6rem', fontWeight: 900, flexShrink: 0, marginTop: '1px',
                  }}>✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleBuy('pro')}
              disabled={loading !== null}
              style={{
                width: '100%', padding: '0.875rem',
                background: 'var(--color-dark)', border: '2px solid var(--color-dark)',
                color: 'white', borderRadius: 'var(--radius-md)',
                fontSize: '0.95rem', fontWeight: 700, fontFamily: 'inherit',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading && loading !== 'pro' ? 0.5 : 1,
              }}>
              {loading === 'pro' ? '...' : t.pricingCtaPro}
            </button>
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: '0.82rem', color: 'var(--color-text-faint)', marginTop: '1.5rem' }}>
          {t.pricingRenewal}
        </p>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Verify visually**

Cennik z toggle PLN/EUR, 2 karty, Pro z czarną obwódką i badge. Kliknięcie "Kup Basic" powinno przekierować na Stripe Checkout.

- [ ] **Step 3: Commit**

```bash
git add src/components/PricingCards.tsx
git commit -m "feat: redesign PricingCards — PLN/EUR toggle, dark Pro card, green checkmarks"
```

---

## Task 11: DemoCTA

**Files:**
- Rewrite: `src/components/DemoCTA.tsx`

- [ ] **Step 1: Replace DemoCTA.tsx**

```tsx
'use client'

import { useLang } from '@/context/LangContext'
import { TR } from '@/lib/translations'

export default function DemoCTA() {
  const { lang } = useLang()
  const t = TR[lang]
  const demoUrl = process.env.NEXT_PUBLIC_DEMO_URL || 'https://demo.nobooking.eu'

  function scrollToPricing() {
    document.getElementById('cennik')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section style={{ background: 'var(--color-dark)', padding: '5rem 1.5rem', textAlign: 'center' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h2 style={{
          fontSize: 'clamp(1.8rem, 3vw, 2.5rem)',
          fontWeight: 800, letterSpacing: '-0.04em',
          color: 'white', marginBottom: '1rem', lineHeight: 1.1,
        }}>
          {lang === 'pl' ? 'Gotowy przestać oddawać 17%?' : 'Ready to stop giving away 17%?'}
        </h2>
        <p style={{ color: 'var(--color-text-faint)', fontSize: '1rem', marginBottom: '2rem', lineHeight: 1.6 }}>
          {t.demoText}
        </p>
        <div style={{ display: 'flex', gap: '0.875rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={scrollToPricing} style={{
            background: 'white', color: 'var(--color-dark)',
            border: 'none', borderRadius: 'var(--radius-pill)',
            padding: '0.875rem 2rem', fontSize: '1rem', fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            {lang === 'pl' ? 'Zamów stronę — od 799 zł →' : 'Order site — from €199 →'}
          </button>
          <a href={demoUrl} target="_blank" rel="noopener noreferrer" style={{
            border: '2px solid rgba(255,255,255,0.25)', color: 'rgba(255,255,255,0.8)',
            borderRadius: 'var(--radius-pill)', padding: '0.825rem 1.875rem',
            fontSize: '1rem', fontWeight: 600, textDecoration: 'none',
            transition: 'border-color 0.2s',
          }}>
            {t.demoCta}
          </a>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Verify visually**

Dark sekcja, biały nagłówek, dwa przyciski (biały + outline).

- [ ] **Step 3: Commit**

```bash
git add src/components/DemoCTA.tsx
git commit -m "feat: redesign DemoCTA — dark banner, white CTA, outline demo link"
```

---

## Task 12: FAQ

**Files:**
- Rewrite: `src/components/FAQ.tsx`

- [ ] **Step 1: Replace FAQ.tsx**

```tsx
'use client'

import { useState } from 'react'
import { useLang } from '@/context/LangContext'
import { TR } from '@/lib/translations'

export default function FAQ() {
  const { lang } = useLang()
  const t = TR[lang]
  const [open, setOpen] = useState<number | null>(null)

  return (
    <section id="faq" className="section-wrap">
      <div className="container">
        <div className="section-label">FAQ</div>
        <h2 className="section-title">{t.faqTitle}</h2>

        <div style={{ maxWidth: '680px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {t.faqs.map((faq, i) => (
            <div key={i} style={{
              border: '1px solid var(--color-border)',
              borderRadius: '12px',
              overflow: 'hidden',
            }}>
              <button onClick={() => setOpen(open === i ? null : i)} style={{
                width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '1.25rem 1.5rem', gap: '1rem',
                background: 'white', border: 'none', cursor: 'pointer',
                fontFamily: 'inherit', textAlign: 'left',
              }}>
                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-text)' }}>
                  {faq.q}
                </span>
                <svg
                  width="18" height="18" viewBox="0 0 24 24" fill="none"
                  stroke="var(--color-text-faint)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  style={{ flexShrink: 0, transition: 'transform 0.2s', transform: open === i ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
              {open === i && (
                <div style={{ padding: '0 1.5rem 1.25rem', fontSize: '0.875rem', color: 'var(--color-text-muted)', lineHeight: 1.7 }}>
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Verify visually**

Accordion FAQ — kliknięcie otwiera/zamyka odpowiedź, chevron obraca się.

- [ ] **Step 3: Commit**

```bash
git add src/components/FAQ.tsx
git commit -m "feat: redesign FAQ — accordion with chevron animation"
```

---

## Task 13: Footer

**Files:**
- Rewrite: `src/components/Footer.tsx`

- [ ] **Step 1: Replace Footer.tsx**

```tsx
'use client'

import { useLang } from '@/context/LangContext'
import { TR } from '@/lib/translations'

export default function Footer() {
  const { lang } = useLang()
  const t = TR[lang]

  const productLinks = lang === 'pl'
    ? [{ label: 'Jak to działa', id: 'jak-dziala' }, { label: 'Funkcje', id: 'funkcje' }, { label: 'Cennik', id: 'cennik' }, { label: 'Demo', href: process.env.NEXT_PUBLIC_DEMO_URL || 'https://demo.nobooking.eu' }]
    : [{ label: 'How it works', id: 'jak-dziala' }, { label: 'Features', id: 'funkcje' }, { label: 'Pricing', id: 'cennik' }, { label: 'Demo', href: process.env.NEXT_PUBLIC_DEMO_URL || 'https://demo.nobooking.eu' }]

  const companyLinks = lang === 'pl'
    ? ['O nas', 'Kontakt', 'Regulamin', 'Polityka prywatności']
    : ['About', 'Contact', 'Terms', 'Privacy Policy']

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <footer style={{ background: 'var(--color-dark)', padding: '3rem 1.5rem 2rem' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        {/* Top row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '2rem', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
          {/* Brand */}
          <div style={{ maxWidth: '240px' }}>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.03em', color: 'white', marginBottom: '0.5rem' }}>
              No<span style={{ color: 'var(--color-accent)' }}>booking</span>
            </div>
            <p style={{ fontSize: '0.82rem', color: '#6B7280', lineHeight: 1.65 }}>
              {lang === 'pl'
                ? 'Profesjonalne strony rezerwacji dla właścicieli apartamentów wakacyjnych.'
                : 'Professional booking sites for vacation apartment owners.'}
            </p>
          </div>

          {/* Links */}
          <div style={{ display: 'flex', gap: '3rem', flexWrap: 'wrap' }}>
            <div>
              <h4 style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6B7280', marginBottom: '0.875rem' }}>
                {lang === 'pl' ? 'Produkt' : 'Product'}
              </h4>
              {productLinks.map(link => (
                <div key={link.label} style={{ marginBottom: '0.5rem' }}>
                  {'id' in link
                    ? <button onClick={() => scrollTo(link.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.82rem', color: '#6B7280', padding: 0, textAlign: 'left' }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'white')}
                        onMouseLeave={e => (e.currentTarget.style.color = '#6B7280')}>
                        {link.label}
                      </button>
                    : <a href={link.href} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.82rem', color: '#6B7280', textDecoration: 'none' }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'white')}
                        onMouseLeave={e => (e.currentTarget.style.color = '#6B7280')}>
                        {link.label}
                      </a>
                  }
                </div>
              ))}
            </div>
            <div>
              <h4 style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6B7280', marginBottom: '0.875rem' }}>
                {lang === 'pl' ? 'Firma' : 'Company'}
              </h4>
              {companyLinks.map(label => (
                <div key={label} style={{ marginBottom: '0.5rem' }}>
                  <a href="#" style={{ fontSize: '0.82rem', color: '#6B7280', textDecoration: 'none' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'white')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#6B7280')}>
                    {label}
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{ borderTop: '1px solid #1F2937', paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <p style={{ fontSize: '0.78rem', color: '#4B5563' }}>{t.footerCopyright}. Wszelkie prawa zastrzeżone.</p>
          <p style={{ fontSize: '0.78rem', color: '#4B5563' }}>Made with ♥ in Poland</p>
        </div>
      </div>
    </footer>
  )
}
```

- [ ] **Step 2: Verify visually**

Dark footer, logo z zielonym "booking", 2 kolumny linków, bottom bar.

- [ ] **Step 3: Commit**

```bash
git add src/components/Footer.tsx
git commit -m "feat: redesign Footer — dark bg, green logo accent, 2-column links"
```

---

## Task 14: page.tsx — dodanie Testimonials

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Read current page.tsx**

```bash
cat "/Users/michalkobylinski/Library/Mobile Documents/com~apple~CloudDocs/Projekty AI/Mieszkanie - Torrevieja/nobooking-landing/src/app/page.tsx"
```

- [ ] **Step 2: Add Testimonials import and component**

Dodaj import na górze:
```tsx
import Testimonials from '@/components/Testimonials'
```

Dodaj `<Testimonials />` między `<PricingCards />` a `<DemoCTA />`:
```tsx
<PricingCards />
<Testimonials />
<DemoCTA />
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Final visual check**

Otwórz http://localhost:3000. Przejrzyj całą stronę od góry do dołu:
- Header sticky z blur ✓
- Hero split z mockupem ✓
- Kalkulator live ✓
- 3 kroki HowItWorks ✓
- 6 feature kart z SVG ikonami ✓
- Tabela porównawcza z dark headerem ✓
- Cennik z toggle PLN/EUR ✓
- Testimoniale (3 karty) ✓
- Dark CTA banner ✓
- FAQ accordion ✓
- Dark footer ✓

- [ ] **Step 5: Deploy**

```bash
cd "/Users/michalkobylinski/Library/Mobile Documents/com~apple~CloudDocs/Projekty AI/Mieszkanie - Torrevieja/nobooking-landing"
vercel --prod
```

- [ ] **Step 6: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: add Testimonials to page, complete redesign"
```

---

## Self-Review checklist

- [x] Design system (globals.css, layout.tsx) — Task 1
- [x] Translations (socialProof, testimonials, calc keys) — Task 2
- [x] Header sticky + blur + lang toggle — Task 3
- [x] Hero split layout + mockup + social proof — Task 4
- [x] Calculator live (nights/month, commission %, ROI) — Task 5
- [x] HowItWorks 3 steps dark numerals — Task 6
- [x] FeaturesGrid SVG icons no emoji — Task 7
- [x] ComparisonTable dark Nobooking column — Task 8
- [x] Testimonials new component — Task 9
- [x] PricingCards PLN/EUR toggle, Pro dark border — Task 10
- [x] DemoCTA dark banner — Task 11
- [x] FAQ accordion chevron — Task 12
- [x] Footer dark green accent — Task 13
- [x] page.tsx Testimonials added — Task 14
