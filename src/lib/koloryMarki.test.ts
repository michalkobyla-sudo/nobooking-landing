import { describe, expect, it } from 'vitest'
import { koloryMarki } from './koloryMarki'

describe('koloryMarki', () => {
  it('na ciemnym kolorze daje biały tekst i zostawia kolor linków', () => {
    expect(koloryMarki('#1A5276')).toEqual({ onPrimary: '#fff', link: '#1A5276' })
  })

  it('na jasnym kolorze daje ciemny tekst i ciemne linki', () => {
    expect(koloryMarki('#F1C40F')).toEqual({ onPrimary: '#1D1D1F', link: '#1D1D1F' })
  })

  it('obsługuje zapis trzyznakowy', () => {
    expect(koloryMarki('#fff').onPrimary).toBe('#1D1D1F')
  })

  it('nieznany zapis zostawia bez zmian z białym tekstem', () => {
    expect(koloryMarki('teal')).toEqual({ onPrimary: '#fff', link: 'teal' })
  })
})
