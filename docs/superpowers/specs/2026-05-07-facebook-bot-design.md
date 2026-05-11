# Facebook Bot — nobooking.eu

**Data:** 2026-05-07  
**Projekt:** nobooking-landing  
**Cel:** Bot sprzedażowy na Facebook Page nobooking.eu, odpowiadający na pytania potencjalnych klientów (właścicieli apartamentów), kierujący na stronę zakupową i zbierający leady.

---

## 1. Architektura

Bot działa jako moduł w istniejącym projekcie `nobooking-landing` (Next.js 16, Supabase, Vercel).

```
Facebook Page nobooking.eu
        │
        │ Messenger wiadomość / komentarz pod postem
        ▼
/api/facebook/webhook  (nobooking-landing, Vercel)
        │
        ├─► Weryfikacja podpisu Meta (x-hub-signature-256)
        │
        ├─► Pobiera bazę wiedzy z Supabase (tabela: bot_knowledge)
        │
        ├─► Wysyła do Claude API: [baza wiedzy + historia rozmowy + nowa wiadomość]
        │
        ├─► Claude decyduje:
        │     ├─ Odpowiedź informacyjna → odsyła na nobooking.eu/zamow
        │     └─ Lead (pyta o szczegóły/chce rozmawiać) → zbiera dane → bot_leads
        │
        └─► Odpowiada przez Facebook Graph API
```

---

## 2. Przepływ rozmowy

Bot prowadzi rozmowę w maksymalnie 3 krokach:

**Krok 1 — Odpowiedź na pytanie**
- Użytkownik zadaje pytanie o usługę
- Bot odpowiada na podstawie bazy wiedzy i zawsze dołącza link do `nobooking.eu/zamow`

**Krok 2 — Dalsze pytania / wątpliwości**
- Claude odpowiada na podstawie bazy wiedzy
- Jeśli pytanie jest poza zakresem bazy wiedzy: grzecznie informuje i kieruje na stronę

**Krok 3 — Zbieranie leada**
- Gdy użytkownik wyraźnie chce porozmawiać lub ma wątpliwości których bot nie rozwieje
- Bot prosi o imię i numer telefonu
- Dane zapisywane do tabeli `bot_leads` wraz z historią rozmowy

**Komentarze pod postami:**
- Bot odpowiada publicznie krótką odpowiedzią
- Zaprasza do wiadomości prywatnej po szczegóły

**Języki:** PL/EN/DE — bot wykrywa język wiadomości i odpowiada w tym samym języku.

---

## 3. Prompt systemowy Claude

Prompt zawiera:
- Rolę: asystent sprzedaży nobooking.eu (budowa stron wynajmu dla właścicieli apartamentów)
- Całą bazę wiedzy pobraną z Supabase
- Instrukcję: zawsze kieruj na stronę zakupową, zbieraj leady gdy ktoś chce rozmawiać
- Instrukcję wykrywania języka i odpowiadania w nim
- Zakaz wymyślania informacji spoza bazy wiedzy

---

## 4. Nowe tabele Supabase

### `bot_knowledge`
| Kolumna | Typ | Opis |
|---------|-----|------|
| id | uuid | PK |
| title | text | Nazwa wpisu (np. "Cennik") |
| content | text | Treść — przekazywana do Claude |
| created_at | timestamptz | Data utworzenia |
| updated_at | timestamptz | Data ostatniej edycji |

### `bot_leads`
| Kolumna | Typ | Opis |
|---------|-----|------|
| id | uuid | PK |
| name | text | Imię podane przez użytkownika |
| phone | text | Numer telefonu |
| email | text | Email (opcjonalny) |
| fb_user_id | text | ID użytkownika FB |
| conversation | jsonb | Historia rozmowy |
| created_at | timestamptz | Data |

### `bot_conversations` (cache historii rozmów)
| Kolumna | Typ | Opis |
|---------|-----|------|
| fb_user_id | text | PK |
| messages | jsonb | Ostatnie 10 wiadomości (kontekst dla Claude) |
| updated_at | timestamptz | TTL — czyścić po 7 dniach |

---

## 5. Nowe API routes

### `POST /api/facebook/webhook`
- Weryfikacja podpisu `x-hub-signature-256` z `FACEBOOK_APP_SECRET`
- Obsługa eventów: `messages` (Messenger) i `feed` (komentarze)
- Ignoruje własne wiadomości bota (echo prevention)

### `GET /api/facebook/webhook`
- Weryfikacja webhook przy konfiguracji w Meta Developer Console
- Sprawdza `hub.verify_token` z env

---

## 6. Panel admina — `/admin/bot`

Nowa zakładka w istniejącym panelu admina nobooking.

**Sekcja: Baza wiedzy**
- Lista wpisów z tytułem i skróconą treścią
- Przycisk "+ Dodaj wpis" → modal z polami: tytuł + textarea
- Przyciski Edytuj / Usuń przy każdym wpisie

**Sekcja: Leady**
- Tabela: imię, telefon, data
- Przycisk "Zobacz rozmowę" → modal z historią wiadomości

**Sekcja: Ustawienia bota**
- Link strony zakupowej (domyślnie `https://nobooking.eu/zamow`)
- Przełącznik włącz/wyłącz bota

---

## 7. Zmienne środowiskowe (nowe)

```
FACEBOOK_PAGE_ACCESS_TOKEN   # Token strony FB (z Meta Developer Console)
FACEBOOK_APP_SECRET          # Do weryfikacji podpisu webhook
FACEBOOK_VERIFY_TOKEN        # Dowolny string do weryfikacji webhook
ANTHROPIC_API_KEY            # Claude API (model: claude-sonnet-4-6)
```

---

## 8. Wymagania zewnętrzne

1. **Facebook Page** dla nobooking.eu — musi istnieć przed wdrożeniem
2. **Meta Developer App** — aplikacja z uprawnieniami: `pages_messaging`, `pages_read_engagement`
3. **Webhook skonfigurowany** w Meta Developer Console → URL: `https://nobooking.eu/api/facebook/webhook`

---

## 9. Poza zakresem

- Multi-tenant (bot dla klientów nobooking) — nie w tej wersji
- Integracja z WhatsApp Business — osobny projekt
- Automatyczne posty na FB — osobny projekt
- Dashboard statystyk bota — osobny projekt
