import type { Metadata } from 'next'
import { Cormorant_Garamond, Inter } from 'next/font/google'
import './globals.css'
import { LangProvider } from '@/context/LangContext'

const cormorant = Cormorant_Garamond({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '600', '700'],
  variable: '--font-cormorant',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-inter',
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
    <html lang="pl" className={`${cormorant.variable} ${inter.variable}`}>
      <body>
        <LangProvider>
          {children}
        </LangProvider>
      </body>
    </html>
  )
}
