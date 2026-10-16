import { describe, it, expect } from 'vitest'
import { markdownNaHtml } from './markdown'

describe('markdownNaHtml', () => {
  it('nagłówki według poziomu', () => {
    expect(markdownNaHtml('# Jeden')).toBe('<h1>Jeden</h1>')
    expect(markdownNaHtml('### Trzy')).toBe('<h3>Trzy</h3>')
  })

  it('akapit skleja wiersze do pustej linii', () => {
    expect(markdownNaHtml('Pierwszy wiersz\ndrugi wiersz.')).toBe('<p>Pierwszy wiersz drugi wiersz.</p>')
  })

  it('pogrubienie, kod i odnośniki', () => {
    expect(markdownNaHtml('**mocno** i `kod`')).toBe('<p><strong>mocno</strong> i <code>kod</code></p>')
    expect(markdownNaHtml('[tekst](https://example.com)'))
      .toBe('<p><a href="https://example.com" rel="noopener noreferrer">tekst</a></p>')
  })

  it('listy punktowane i numerowane', () => {
    expect(markdownNaHtml('- raz\n- dwa')).toBe('<ul><li>raz</li><li>dwa</li></ul>')
    expect(markdownNaHtml('1. raz\n2. dwa')).toBe('<ol><li>raz</li><li>dwa</li></ol>')
  })

  it('tabela z nagłówkiem', () => {
    const html = markdownNaHtml('| a | b |\n|---|---|\n| 1 | 2 |')
    expect(html).toContain('<th>a</th><th>b</th>')
    expect(html).toContain('<td>1</td><td>2</td>')
  })

  it('cytat blokowy renderuje zawartość', () => {
    expect(markdownNaHtml('> **uwaga**')).toBe('<blockquote><p><strong>uwaga</strong></p></blockquote>')
  })

  /**
   * Treść jest nasza, ale dokument prawny bywa przeklejany z maila albo
   * z pisma od prawnika. Znak mniejszości ma zostać znakiem, nie początkiem
   * znacznika.
   */
  it('escapuje znaki, które inaczej byłyby znacznikiem', () => {
    expect(markdownNaHtml('a < b & c')).toBe('<p>a &lt; b &amp; c</p>')
    expect(markdownNaHtml('<script>alert(1)</script>'))
      .toBe('<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>')
  })

  it('linia pozioma', () => {
    expect(markdownNaHtml('---')).toBe('<hr />')
  })

  it('pomija puste wiersze zamiast robić z nich akapity', () => {
    expect(markdownNaHtml('\n\nTekst\n\n\n')).toBe('<p>Tekst</p>')
  })

  // Dokumenty prawne mają numerowane punkty z wciętą kontynuacją.
  it('skleja wciętą kontynuację pozycji listy', () => {
    expect(markdownNaHtml('1. Początek\n   ciąg dalszy'))
      .toBe('<ol><li>Początek ciąg dalszy</li></ol>')
  })

  it('radzi sobie z pustym wejściem', () => {
    expect(markdownNaHtml('')).toBe('')
  })
})
