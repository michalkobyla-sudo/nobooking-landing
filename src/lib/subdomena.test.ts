import { describe, it, expect } from 'vitest'
import { sciezkaDlaSubdomeny } from './subdomena'

describe('sciezkaDlaSubdomeny', () => {
  it('strona główna i podstrony apartamentu', () => {
    expect(sciezkaDlaSubdomeny('casa-sol', '/')).toBe('/sites/casa-sol')
    expect(sciezkaDlaSubdomeny('casa-sol', '/informacje')).toBe('/sites/casa-sol/informacje')
    expect(sciezkaDlaSubdomeny('casa-sol', '/guest/abc')).toBe('/sites/casa-sol/guest/abc')
  })

  it('demo ma własną trasę i też nie dubluje prefiksu', () => {
    expect(sciezkaDlaSubdomeny('demo', '/')).toBe('/demo')
    expect(sciezkaDlaSubdomeny('demo', '/informacje')).toBe('/demo/informacje')
    expect(sciezkaDlaSubdomeny('demo', '/demo/informacje')).toBeNull()
  })

  // Wywołania API mają slug w ścieżce — prefiks dawał 404 formularza rezerwacji.
  it('API bez przepisywania', () => {
    expect(sciezkaDlaSubdomeny('casa-sol', '/api/sites/casa-sol/book')).toBeNull()
  })

  // Link zbudowany jako `/sites/slug/…` działa na domenie głównej. Na subdomenie
  // prefiks doklejał się drugi raz: `/sites/casa-sol/sites/casa-sol/informacje`.
  it('nie dubluje prefiksu, który już jest w ścieżce', () => {
    expect(sciezkaDlaSubdomeny('casa-sol', '/sites/casa-sol')).toBeNull()
    expect(sciezkaDlaSubdomeny('casa-sol', '/sites/casa-sol/informacje')).toBeNull()
  })

  // Cudzy slug w ścieżce to nie jest „już przepisane” — subdomena wygrywa,
  // inaczej casa-sol.nobooking.eu/sites/inna pokazywałoby cudzą stronę.
  it('cudzy slug w ścieżce dostaje prefiks tej subdomeny', () => {
    expect(sciezkaDlaSubdomeny('casa-sol', '/sites/inna')).toBe('/sites/casa-sol/sites/inna')
  })
})
