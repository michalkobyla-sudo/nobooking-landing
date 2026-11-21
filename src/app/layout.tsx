import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import './ios.css'
import { LangProvider } from '@/context/LangContext'
import ZapiszZrodlo from '@/components/ZapiszZrodlo'

/**
 * Krój: systemowy (SF Pro na urządzeniach Apple). Inter jest tylko zapasem dla
 * Windowsa i Androida — bez wstępnego ładowania, więc na Macu i iPhonie nie
 * pobiera się w ogóle (przeglądarka ściąga font dopiero, gdy go używa).
 */
const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-inter',
  display: 'swap',
  preload: false,
})

export const metadata: Metadata = {
  title: 'Nobooking — własna strona rezerwacyjna bez prowizji',
  description: 'Własna strona dla apartamentu wakacyjnego. Płatności bezpośrednie, panel admina, portal gościa. Zero prowizji. Gotowa w 24 godziny.',
  metadataBase: new URL('https://nobooking.eu'),
  openGraph: {
    title: 'Nobooking — własna strona rezerwacyjna bez prowizji',
    description: 'Przestań płacić prowizje. Własna strona dla apartamentu — gotowa w 24 godziny.',
    url: 'https://nobooking.eu',
    siteName: 'Nobooking',
    locale: 'pl_PL',
    type: 'website',
  },
  twitter: { card: 'summary_large_image' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl" className={inter.variable}>
      <body>
        <ZapiszZrodlo />
        <LangProvider>
          {children}
        </LangProvider>
      </body>
    </html>
  )
}
