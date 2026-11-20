import { describe, it, expect, beforeEach } from 'vitest'
import { czytajZrodlo } from './attribution'
import { zapamietajZrodlo, zapamietaneZrodlo, wyczyscZapamietaneZrodlo } from './zrodloWPamieci'

const START = 'https://nobooking.eu/'

describe('źródło w pamięci karty', () => {
  beforeEach(() => wyczyscZapamietaneZrodlo())

  it('na starcie nic nie ma', () => {
    expect(zapamietaneZrodlo()).toBeNull()
  })

  it('pierwsze dotknięcie wygrywa z kolejnym', () => {
    zapamietajZrodlo(czytajZrodlo(`${START}?utm_source=facebook&utm_campaign=jesien`, null))
    zapamietajZrodlo(czytajZrodlo(`${START}?utm_source=google`, null))
    expect(zapamietaneZrodlo()?.utm_campaign).toBe('jesien')
  })

  it('wejście bezpośrednie ustępuje kampanii', () => {
    zapamietajZrodlo(czytajZrodlo(START, ''))
    zapamietajZrodlo(czytajZrodlo(`${START}?fbclid=abc`, null))
    expect(zapamietaneZrodlo()?.utm_source).toBe('facebook')
  })
})
