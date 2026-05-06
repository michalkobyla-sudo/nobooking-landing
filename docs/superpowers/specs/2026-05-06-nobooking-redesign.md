# Nobooking.eu — Full Visual Redesign Spec

## Goal
Przeprojektować nobooking.eu z obecnego minimalnego stylu na profesjonalną, wysokokonwertującą stronę sprzedażową SaaS w stylu Bold & Typographic.

## Design System

### Typography
- **Font heading:** Plus Jakarta Sans 800 (zastępuje Cormorant Garamond)
- **Font subheading:** Plus Jakarta Sans 700/600
- **Font body:** Plus Jakarta Sans 400/500 (Inter usunięty)
- **Letter spacing headings:** `-0.04em` do `-0.05em`
- **Google Fonts import:** `Plus+Jakarta+Sans:wght@400;500;600;700;800`

### Colors
| Token | Value | Użycie |
|---|---|---|
| `--color-accent` | `#059669` | CTA primary, ikony, akcenty, liczby pozytywne |
| `--color-text` | `#0F0F0F` | Nagłówki, czarny CTA button |
| `--color-text-muted` | `#6B7280` | Opisy, subtexty |
| `--color-text-faint` | `#9CA3AF` | Labels, labels stat |
| `--color-pain` | `#DC2626` | Przekreślone 17%, kwoty strat |
| `--color-bg` | `#ffffff` | Sekcje główne |
| `--color-bg-alt` | `#FAFAFA` | Sekcje alternowane |
| `--color-border` | `#E5E7EB` | Obwódki kart, dividerów |
| `--color-accent-light` | `#ECFDF5` | Tło ikon, badge |
| `--color-accent-border` | `#D1FAE5` | Obwódki accent elementów |

### Buttons
- **Primary:** `bg #059669`, `color white`, `border-radius 10px`, `font-weight 700`, hover `#047857`
- **Secondary/Outline:** `border 2px #E5E7EB`, `color #374151`, hover `border #0F0F0F`
- **CTA Black:** `bg #0F0F0F`, `color white`, `border-radius 8-10px`
- **Kształt:** pill (`border-radius 100px`) dla hero CTAs, `10px` dla sekcji

### Icons
- Wszystkie ikony: SVG inline, `stroke` (nie `fill`), `stroke-width: 2`, `stroke-linecap: round`, `stroke-linejoin: round`
- Rozmiar w kartach: `22x22px` w kontenerze `44x44px` z `bg #ECFDF5`, `border-radius 12px`
- Zero emoji w UI

---

## Sections

### 1. Header
- Sticky, `backdrop-filter: blur(12px)`, `bg rgba(255,255,255,0.95)`, `border-bottom 1px #F3F4F6`
- Height: `64px`
- Logo: `No` (czarne) + `booking` (czarne) — akcent kolorem tylko w footer
- Nav links: Jak to działa · Funkcje · Cennik · FAQ (smooth scroll)
- Right: toggle PL/EN (pill z active state) + czarny CTA button "Zamów stronę →"
- Mobile: hamburger menu (drawer)

### 2. Hero — Split Layout
**Lewa kolumna (flex: 1.2):**
- Badge: ikona SVG domu + "Dla właścicieli apartamentów wakacyjnych" (`bg #ECFDF5`, `border #D1FAE5`, `color #059669`)
- H1 (Plus Jakarta Sans 800, `clamp(2.4rem, 4.5vw, 3.5rem)`, `letter-spacing -0.04em`):
  ```
  Twoja strona.
  Twoje pieniądze.
  Zero prowizji.
  ```
  Wariant z przekreślonym "17% Booking.com" w zależności od tłumaczenia
- Subtext: szary, `0.95rem`, max-width 420px
- CTAs (flex column na desktop, wrap mobile):
  - Primary: "Zamów stronę — od 799 zł →" (`#059669`)
  - Outline: "Zobacz demo działającej strony"
- Social proof: 4 avatary (inicjały) + "124 właścicieli już korzysta z Nobooking"

**Prawa kolumna (flex: 1):**
- Mockup okna przeglądarki (`box-shadow: 0 20px 60px rgba(0,0,0,0.12)`)
- Pasek przeglądarki: 3 kółka (czerwone/żółte/zielone) + URL "moj-apartament.pl"
- Zawartość mockup:
  - Zdjęcie apartamentu (gradient placeholder `#D1FAE5 → #A7F3D0` + ikona)
  - Nazwa i lokalizacja
  - Date pickers (Check-in / Check-out)
  - Podsumowanie ceny (noce × stawka + sprzątanie = total)
  - Zielony button "Zarezerwuj i zapłać"

**Layout:** `display: grid; grid-template-columns: 1.2fr 1fr; gap: 3rem; align-items: center`
**Mobile (< 768px):** single column, mockup ukryty (`display: none`), przyciski full-width

### 3. Commission Calculator (Kalkulator strat)
- Background: `#fff`, `border-bottom 1px #F3F4F6`
- Section label + h2 + sub (centered)
- Karta kalkulatora: `bg #F9FAFB`, `border 1px #E5E7EB`, `border-radius 20px`, max-width 640px, centered
- 3 inputy: cena za noc (zł), liczba nocy/mies., prowizja (%)
- Wyniki live (useState + obliczenia po każdej zmianie):
  - Czerwona karta: "Tracisz rocznie:" → `totalLoss` (czerwony, bold)
  - Zielona karta: "Z Nobooking oszczędzasz:" → `totalLoss` (zielony, bold)
- Dopisek: "Nobooking Basic kosztuje 799 zł. Zwrot inwestycji w ~X dni." (obliczany dynamicznie)

### 4. How It Works (Jak to działa)
- Background: `#FAFAFA`, `border-top/bottom 1px #F3F4F6`
- 3 kroki w gridzie (`grid-template-columns: repeat(3, 1fr)`)
- Każdy krok: kwadratowy numerek `48x48px bg #0F0F0F`, `border-radius 14px`, biały numer
- Tytuł + opis (szary)

### 5. Features Grid (Co dostajesz)
- Background: `#fff`
- 6 kart w `grid-template-columns: repeat(3, 1fr)`
- Każda karta: `bg #FAFAFA`, `border 1px #F3F4F6`, `border-radius 16px`, `padding 1.75rem`
- Hover: `border-color #D1FAE5`, `box-shadow 0 4px 24px rgba(5,150,105,0.08)`
- SVG ikona w `44x44` kontenerze + tytuł + opis
- 6 funkcji: Kalendarz rezerwacji · Płatności online · SMS/email · Sezony i ceny · Panel admin · SEO

### 6. Comparison Table (Porównanie)
- Background: `#FAFAFA`
- Tabela: `border-radius 16px`, `overflow hidden`, `border 1px #E5E7EB`
- Header kolumny: Nobooking (`bg #0F0F0F`, biały tekst) | Booking.com | Airbnb (szare)
- Wiersze: prowizja · własna domena · kontakt z gościem · panel · wypłaty · koszt
- Symbole: `✓` zielony | `✗` czerwony | tekst pomarańczowy dla "częściowe"

### 7. Pricing Cards (Cennik)
- Background: `#fff`
- Toggle PLN/EUR (pill)
- Grid 2 kolumny, max-width 760px, centered
- **Basic:** border `2px #E5E7EB`, cena `799 zł` / `199 €`, outline button
- **Pro:** border `2px #0F0F0F`, badge "⭐ Najpopularniejszy", cena `1199 zł` / `299 €`, filled black button
- Lista funkcji: `✓` z zielonym kółkiem
- Dopisek EUR pod kartami

### 8. Testimonials (Opinie)
- Background: `#FAFAFA`, nowa sekcja (nie było w oryginale)
- 3 karty w gridzie (`repeat(3, 1fr)`)
- Każda: gwiazdki ★★★★★ amber + cytat kursywą + imię + lokalizacja
- Treść opinii: fikcyjne ale wiarygodne (PL właściciele apartamentów)

### 9. Demo CTA Banner
- Background: `#0F0F0F`
- H2 biały + subtext szary + biały button
- Tekst: "Gotowy przestać oddawać 17%?" + "Dołącz do 124 właścicieli..."

### 10. FAQ
- Background: `#fff`
- Accordion, max-width 680px, centered
- `border 1px #E5E7EB`, `border-radius 12px` na każdym item
- Chevron SVG po prawej, animacja rotate 180° przy open
- 4-6 pytań: technologia · po 2 latach · domena · płatności · support

### 11. Footer
- Background: `#0F0F0F`
- Logo: `No` biały + `booking` zielony `#059669`
- 2 kolumny linków: Produkt (Jak działa/Funkcje/Cennik/Demo) · Firma (O nas/Kontakt/Regulamin/Prywatność)
- Bottom bar: copyright + "Made with ♥ in Poland"

---

## Translations
Wszystkie nowe teksty dodane do `src/lib/translations.ts`:
- `heroH1`, `heroSub`, `heroPrimary`, `heroSecondary` — zaktualizowane
- `socialProof` — "124 właścicieli już korzysta z Nobooking"
- `testimonials` — tablica 3 obiektów `{ stars, text, author, location }`
- Pozostałe sekcje: zaktualizowane tłumaczenia EN

## Files to Create/Modify

| Plik | Akcja | Co |
|---|---|---|
| `src/app/globals.css` | Modify | Nowy design system: fonts, tokens, utility classes |
| `src/app/layout.tsx` | Modify | Zamiana fontu na Plus Jakarta Sans |
| `src/components/Header.tsx` | Rewrite | Sticky header z toggle, nav, CTA |
| `src/components/Hero.tsx` | Rewrite | Split layout z mockupem i social proof |
| `src/components/CommissionCalculator.tsx` | Rewrite | Live kalkulator z nowym UI |
| `src/components/HowItWorks.tsx` | Rewrite | Numerowane kroki, dark numery |
| `src/components/FeaturesGrid.tsx` | Rewrite | SVG ikony, hover efekty |
| `src/components/ComparisonTable.tsx` | Rewrite | Nowa tabela z dark header kolumny |
| `src/components/PricingCards.tsx` | Rewrite | Nowy design, PLN/EUR toggle |
| `src/components/Testimonials.tsx` | Create | Nowa sekcja z opiniami |
| `src/app/page.tsx` | Modify | Dodanie `<Testimonials />` między PricingCards a DemoCTA |
| `src/components/DemoCTA.tsx` | Rewrite | Dark banner |
| `src/components/FAQ.tsx` | Rewrite | Accordion z animacją |
| `src/components/Footer.tsx` | Rewrite | Dark footer |
| `src/lib/translations.ts` | Modify | Nowe stringi (socialProof, testimonials) |

## Non-Goals
- Zmiana struktury routingu
- Zmiana logiki API (Stripe, webhook)
- Responsywność mobile (osobny etap po desktopie)
- Animacje scroll (YAGNI)
