'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

export type Lang = 'pl' | 'en'
export type Currency = 'pln' | 'eur'

interface LangContextType {
  lang: Lang
  currency: Currency
  setLang: (l: Lang) => void
  setCurrency: (c: Currency) => void
}

const LangContext = createContext<LangContextType>({
  lang: 'pl',
  currency: 'pln',
  setLang: () => {},
  setCurrency: () => {},
})

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('pl')
  const [currency, setCurrency] = useState<Currency>('pln')
  return (
    <LangContext.Provider value={{ lang, currency, setLang, setCurrency }}>
      {children}
    </LangContext.Provider>
  )
}

export function useLang() {
  return useContext(LangContext)
}
