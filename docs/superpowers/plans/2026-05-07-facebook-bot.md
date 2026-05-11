# Facebook Bot — nobooking.eu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bot AI na Facebook Page nobooking.eu — odpowiada na pytania potencjalnych klientów przez Messenger i komentarze, kieruje na stronę zakupową i zbiera leady.

**Architecture:** Webhook `/api/facebook/webhook` odbiera eventy z FB, wywołuje Claude API (claude-sonnet-4-6) z bazą wiedzy z Supabase, odpowiada przez Facebook Graph API. Panel admina `/admin/bot` umożliwia edycję bazy wiedzy i przegląd leadów.

**Tech Stack:** Next.js 16 App Router, TypeScript, Supabase (PostgreSQL), `@anthropic-ai/sdk`, Facebook Graph API v21.0, Vercel

---

## Mapa plików

**Nowe pliki:**
- `src/lib/claude-bot.ts` — budowanie promptu + wywołanie Claude API + parsowanie odpowiedzi
- `src/lib/facebook.ts` — wysyłanie wiadomości/odpowiedzi przez Facebook Graph API
- `src/app/api/facebook/webhook/route.ts` — GET (weryfikacja) + POST (obsługa eventów)
- `src/app/api/admin/bot/knowledge/route.ts` — GET lista + POST nowy wpis
- `src/app/api/admin/bot/knowledge/[id]/route.ts` — PATCH edycja + DELETE usunięcie
- `src/app/api/admin/bot/leads/route.ts` — GET lista leadów
- `src/app/api/admin/bot/settings/route.ts` — GET + PUT ustawienia bota
- `src/app/admin/bot/page.tsx` — panel admina: baza wiedzy + leady + ustawienia

**Modyfikowane pliki:**
- `package.json` — dodanie `@anthropic-ai/sdk`

---

## Task 1: Instalacja @anthropic-ai/sdk

**Files:**
- Modify: `package.json`

- [ ] **Krok 1: Zainstaluj SDK**

```bash
cd "/Users/michalkobylinski/Library/Mobile Documents/com~apple~CloudDocs/Projekty AI/Mieszkanie - Torrevieja/nobooking-landing"
npm install @anthropic-ai/sdk
```

Expected output: `added 1 package` (lub podobne), brak błędów.

- [ ] **Krok 2: Zweryfikuj instalację**

```bash
node -e "require('@anthropic-ai/sdk'); console.log('OK')"
```

Expected: `OK`

- [ ] **Krok 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add @anthropic-ai/sdk dependency"
```

---

## Task 2: Tabele Supabase

**Files:**
- Brak plików — SQL wykonywany w Supabase Dashboard → SQL Editor

- [ ] **Krok 1: Utwórz tabele w Supabase SQL Editor**

Wejdź na https://supabase.com/dashboard → projekt nobooking → SQL Editor → New query i wykonaj:

```sql
-- Baza wiedzy bota
create table if not exists bot_knowledge (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Leady zebrane przez bota
create table if not exists bot_leads (
  id uuid primary key default gen_random_uuid(),
  name text,
  phone text,
  email text,
  fb_user_id text not null,
  conversation jsonb not null default '[]',
  created_at timestamptz not null default now()
);

-- Cache historii rozmów (kontekst dla Claude)
create table if not exists bot_conversations (
  fb_user_id text primary key,
  messages jsonb not null default '[]',
  updated_at timestamptz not null default now()
);

-- Ustawienia bota (jeden wiersz)
create table if not exists bot_settings (
  id text primary key default 'default',
  purchase_url text not null default 'https://nobooking.eu/zamow',
  enabled boolean not null default true
);

-- Wstaw domyślne ustawienia
insert into bot_settings (id) values ('default')
on conflict (id) do nothing;
```

- [ ] **Krok 2: Wyłącz RLS dla tabel bota (używamy service role)**

```sql
alter table bot_knowledge disable row level security;
alter table bot_leads disable row level security;
alter table bot_conversations disable row level security;
alter table bot_settings disable row level security;
```

- [ ] **Krok 3: Zweryfikuj tabele**

```sql
select table_name from information_schema.tables
where table_schema = 'public'
and table_name like 'bot_%';
```

Expected: 4 wiersze: `bot_conversations`, `bot_knowledge`, `bot_leads`, `bot_settings`

- [ ] **Krok 4: Dodaj przykładowy wpis do bazy wiedzy**

```sql
insert into bot_knowledge (title, content) values
('Czym jest nobooking.eu',
'nobooking.eu to usługa tworzenia profesjonalnych stron internetowych dla właścicieli apartamentów na wynajem krótkoterminowy. Strona zawiera system rezerwacji, galerię zdjęć, kalendarz dostępności i obsługę płatności. Właściciel nie płaci prowizji od rezerwacji — tylko jednorazową opłatę za stworzenie strony.'),
('Cennik',
'Plan Basic: 997 zł jednorazowo — strona z galerią, kalendarzem i formularzem kontaktowym. Plan Pro: 1997 zł jednorazowo — wszystko z Basic plus system płatności online (zaliczka przez Stripe), wielojęzyczność (PL/EN/ES), portal gościa z czatem. Brak miesięcznych opłat ani prowizji.'),
('Jak wygląda proces',
'1. Zamawiasz na nobooking.eu/zamow i wypełniasz formularz z danymi apartamentu. 2. Wysyłamy formularz onboardingowy — opisujesz mieszkanie, wgrywasz zdjęcia. 3. W 7 dni roboczych oddajemy gotową stronę pod Twoją domeną. 4. Pomagamy z konfiguracją domeny i SSL.'),
('Co zawiera strona',
'Galeria zdjęć i filmów, opis apartamentu, kalendarz dostępności, formularz rezerwacji, integracja z Airbnb/Booking.com (synchronizacja kalendarza), obsługa płatności Stripe (opcjonalnie), wersje językowe, SEO, SSL, hosting przez 1 rok w cenie.');
```

- [ ] **Krok 5: Commit (notatka w planie — brak pliku do commitowania)**

```bash
git commit --allow-empty -m "feat: create bot Supabase tables (SQL in docs)"
```

---

## Task 3: Zmienna środowiskowa

**Files:**
- Modify: `.env.local` (lokalnie — NIE commitować)
- Vercel Dashboard — dodać zmienne produkcyjne

- [ ] **Krok 1: Dodaj zmienne do .env.local**

Otwórz `.env.local` i dopisz na końcu:

```
FACEBOOK_PAGE_ACCESS_TOKEN=tu_wklej_token_strony_fb
FACEBOOK_APP_SECRET=tu_wklej_app_secret
FACEBOOK_VERIFY_TOKEN=nobooking_webhook_2026
ANTHROPIC_API_KEY=tu_wklej_klucz_anthropic
```

> **Skąd wziąć wartości:**
> - `FACEBOOK_PAGE_ACCESS_TOKEN` i `FACEBOOK_APP_SECRET`: Meta Developer Console → Twoja app → Messenger → Settings (krok opisany w Task 10)
> - `FACEBOOK_VERIFY_TOKEN`: dowolny string — zapamiętaj go, wpisujesz go też w Meta Developer Console
> - `ANTHROPIC_API_KEY`: https://console.anthropic.com → API Keys

- [ ] **Krok 2: Dodaj zmienne na Vercel**

Vercel Dashboard → nobooking-landing → Settings → Environment Variables → dodaj te same 4 zmienne.

---

## Task 4: Biblioteka Claude Bot

**Files:**
- Create: `src/lib/claude-bot.ts`

- [ ] **Krok 1: Utwórz plik**

```typescript
// src/lib/claude-bot.ts
import Anthropic from '@anthropic-ai/sdk'
import { createServiceClient } from '@/lib/supabase'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export type BotMessage = { role: 'user' | 'assistant'; content: string }

export type BotResponse =
  | { type: 'answer'; message: string }
  | { type: 'collect_lead'; message: string }
  | { type: 'save_lead'; message: string; name: string; phone: string }

export async function getKnowledgeBase(): Promise<string> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('bot_knowledge')
    .select('title, content')
    .order('created_at', { ascending: true })
  if (!data || data.length === 0) return 'Brak danych w bazie wiedzy.'
  return data.map((k) => `## ${k.title}\n${k.content}`).join('\n\n')
}

export async function getPurchaseUrl(): Promise<string> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('bot_settings')
    .select('purchase_url')
    .eq('id', 'default')
    .single()
  return data?.purchase_url ?? 'https://nobooking.eu/zamow'
}

export async function isBotEnabled(): Promise<boolean> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('bot_settings')
    .select('enabled')
    .eq('id', 'default')
    .single()
  return data?.enabled ?? true
}

function buildSystemPrompt(knowledge: string, purchaseUrl: string): string {
  return `Jesteś asystentem sprzedaży nobooking.eu — usługi tworzenia stron internetowych dla właścicieli apartamentów na wynajem krótkoterminowy.

BAZA WIEDZY:
${knowledge}

ZASADY:
1. Odpowiadaj TYLKO na podstawie bazy wiedzy. Nie wymyślaj informacji.
2. Każdą odpowiedź kończ linkiem do strony zakupowej: ${purchaseUrl}
3. Odpowiadaj w języku użytkownika (PL/EN/DE). Wykryj język z jego wiadomości.
4. Odpowiedzi są krótkie — max 3-4 zdania. To Messenger, nie email.
5. Bądź pomocny, profesjonalny i konkretny.

FORMAT ODPOWIEDZI (JSON, tylko to — bez żadnego dodatkowego tekstu):

Gdy odpowiadasz na pytanie:
{"type":"answer","message":"Twoja odpowiedź tutaj."}

Gdy użytkownik chce porozmawiać z człowiekiem, mówi że chce zadzwonić, pyta o więcej szczegółów których nie masz w bazie, lub wyraźnie jest zainteresowany zakupem:
{"type":"collect_lead","message":"Chętnie się odezwiemy! Podaj swoje imię i numer telefonu, a skontaktujemy się w ciągu 24 godzin. 📞"}

Gdy w rozmowie pojawia się imię I numer telefonu (użytkownik je podał):
{"type":"save_lead","name":"Jan Kowalski","phone":"+48 600 100 200","message":"Dziękujemy, Jan! Odezwiemy się do Ciebie na numer +48 600 100 200 w ciągu 24 godzin. Do usłyszenia! 😊"}

WAŻNE: Zwracaj TYLKO poprawny JSON. Zero tekstu przed ani po.`
}

export async function askClaude(
  history: BotMessage[],
  userMessage: string,
  knowledge: string,
  purchaseUrl: string
): Promise<BotResponse> {
  const messages: Anthropic.MessageParam[] = [
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: userMessage },
  ]

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    system: buildSystemPrompt(knowledge, purchaseUrl),
    messages,
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''

  try {
    const parsed = JSON.parse(text.trim()) as BotResponse
    return parsed
  } catch {
    return { type: 'answer', message: text.trim() || 'Przepraszam, spróbuj ponownie.' }
  }
}
```

- [ ] **Krok 2: Sprawdź że TypeScript nie ma błędów**

```bash
cd "/Users/michalkobylinski/Library/Mobile Documents/com~apple~CloudDocs/Projekty AI/Mieszkanie - Torrevieja/nobooking-landing"
npx tsc --noEmit 2>&1 | head -20
```

Expected: brak błędów (lub tylko istniejące błędy sprzed tej zmiany).

- [ ] **Krok 3: Commit**

```bash
git add src/lib/claude-bot.ts
git commit -m "feat: add Claude bot helper with knowledge base and lead detection"
```

---

## Task 5: Biblioteka Facebook Graph API

**Files:**
- Create: `src/lib/facebook.ts`

- [ ] **Krok 1: Utwórz plik**

```typescript
// src/lib/facebook.ts
const GRAPH_API = 'https://graph.facebook.com/v21.0'

async function graphPost(path: string, body: Record<string, unknown>): Promise<void> {
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN
  const res = await fetch(`${GRAPH_API}${path}?access_token=${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.text()
    console.error('[facebook] Graph API error:', err)
  }
}

export async function sendMessengerMessage(recipientId: string, text: string): Promise<void> {
  await graphPost('/me/messages', {
    recipient: { id: recipientId },
    message: { text },
    messaging_type: 'RESPONSE',
  })
}

export async function replyToComment(commentId: string, text: string): Promise<void> {
  await graphPost(`/${commentId}/comments`, { message: text })
}
```

- [ ] **Krok 2: Sprawdź TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: brak nowych błędów.

- [ ] **Krok 3: Commit**

```bash
git add src/lib/facebook.ts
git commit -m "feat: add Facebook Graph API helper"
```

---

## Task 6: Webhook Facebook — GET (weryfikacja)

**Files:**
- Create: `src/app/api/facebook/webhook/route.ts`

- [ ] **Krok 1: Utwórz plik z handlerem GET**

```typescript
// src/app/api/facebook/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createServiceClient } from '@/lib/supabase'
import { askClaude, getKnowledgeBase, getPurchaseUrl, isBotEnabled, BotMessage } from '@/lib/claude-bot'
import { sendMessengerMessage, replyToComment } from '@/lib/facebook'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.FACEBOOK_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 })
  }
  return NextResponse.json({ error: 'forbidden' }, { status: 403 })
}
```

- [ ] **Krok 2: Sprawdź TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: brak nowych błędów.

---

## Task 7: Webhook Facebook — POST (obsługa eventów)

**Files:**
- Modify: `src/app/api/facebook/webhook/route.ts` (dodaj handler POST)

- [ ] **Krok 1: Dodaj funkcje pomocnicze i handler POST do pliku**

Zastąp całą zawartość `src/app/api/facebook/webhook/route.ts`:

```typescript
// src/app/api/facebook/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createServiceClient } from '@/lib/supabase'
import { askClaude, getKnowledgeBase, getPurchaseUrl, isBotEnabled, BotMessage } from '@/lib/claude-bot'
import { sendMessengerMessage, replyToComment } from '@/lib/facebook'

// ── GET: weryfikacja webhook przez Meta ─────────────────────────────────────
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.FACEBOOK_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 })
  }
  return NextResponse.json({ error: 'forbidden' }, { status: 403 })
}

// ── Weryfikacja podpisu Meta ─────────────────────────────────────────────────
function verifySignature(body: string, signature: string | null): boolean {
  if (!signature) return false
  const expected = 'sha256=' + crypto
    .createHmac('sha256', process.env.FACEBOOK_APP_SECRET!)
    .update(body)
    .digest('hex')
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
}

// ── Obsługa wiadomości Messenger ─────────────────────────────────────────────
async function handleMessage(senderId: string, text: string): Promise<void> {
  const supabase = createServiceClient()

  // Pobierz historię rozmowy
  const { data: convRow } = await supabase
    .from('bot_conversations')
    .select('messages')
    .eq('fb_user_id', senderId)
    .single()

  const history: BotMessage[] = convRow?.messages ?? []

  // Pobierz bazę wiedzy i ustawienia
  const [knowledge, purchaseUrl] = await Promise.all([
    getKnowledgeBase(),
    getPurchaseUrl(),
  ])

  // Zapytaj Claude
  const botResponse = await askClaude(history, text, knowledge, purchaseUrl)

  // Aktualizuj historię (max 10 wiadomości)
  const updatedHistory: BotMessage[] = [
    ...history,
    { role: 'user', content: text },
    { role: 'assistant', content: botResponse.message },
  ].slice(-10)

  await supabase.from('bot_conversations').upsert({
    fb_user_id: senderId,
    messages: updatedHistory,
    updated_at: new Date().toISOString(),
  })

  // Jeśli to lead — zapisz do bot_leads
  if (botResponse.type === 'save_lead') {
    await supabase.from('bot_leads').insert({
      fb_user_id: senderId,
      name: botResponse.name,
      phone: botResponse.phone,
      conversation: updatedHistory,
    })
  }

  // Wyślij odpowiedź
  await sendMessengerMessage(senderId, botResponse.message)
}

// ── Obsługa komentarzy pod postami ──────────────────────────────────────────
async function handleComment(commentId: string, commentText: string): Promise<void> {
  const [knowledge, purchaseUrl] = await Promise.all([
    getKnowledgeBase(),
    getPurchaseUrl(),
  ])

  const botResponse = await askClaude(
    [],
    `Krótko odpowiedz na komentarz pod postem i zaproś do wiadomości prywatnej po szczegóły. Komentarz: "${commentText}"`,
    knowledge,
    purchaseUrl,
  )

  await replyToComment(commentId, botResponse.message)
}

// ── POST: obsługa eventów z Facebooka ───────────────────────────────────────
export async function POST(request: NextRequest): Promise<NextResponse> {
  const rawBody = await request.text()
  const signature = request.headers.get('x-hub-signature-256')

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 })
  }

  const enabled = await isBotEnabled()
  if (!enabled) {
    return NextResponse.json({ status: 'disabled' })
  }

  let body: Record<string, unknown>
  try {
    body = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  if (body.object !== 'page') {
    return NextResponse.json({ status: 'ignored' })
  }

  const entries = (body.entry as Array<Record<string, unknown>>) ?? []

  for (const entry of entries) {
    // Wiadomości Messenger
    const messaging = (entry.messaging as Array<Record<string, unknown>>) ?? []
    for (const event of messaging) {
      const sender = (event.sender as { id: string })?.id
      const messageObj = event.message as { text?: string; is_echo?: boolean } | undefined
      if (!sender || !messageObj?.text || messageObj.is_echo) continue
      await handleMessage(sender, messageObj.text)
    }

    // Komentarze pod postami
    const changes = (entry.changes as Array<{ field: string; value: Record<string, unknown> }>) ?? []
    for (const change of changes) {
      if (change.field !== 'feed') continue
      const val = change.value
      if (val.item !== 'comment' || val.verb !== 'add') continue
      const commentId = val.comment_id as string
      const commentText = val.message as string
      const fromId = (val.from as { id: string })?.id
      // Nie odpowiadaj na własne komentarze
      const pageId = (entry.id as string)
      if (fromId === pageId || !commentId || !commentText) continue
      await handleComment(commentId, commentText)
    }
  }

  return NextResponse.json({ status: 'ok' })
}
```

- [ ] **Krok 2: Sprawdź TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: brak nowych błędów.

- [ ] **Krok 3: Commit**

```bash
git add src/app/api/facebook/webhook/route.ts
git commit -m "feat: add Facebook webhook handler with Messenger and comments support"
```

---

## Task 8: Admin API — baza wiedzy

**Files:**
- Create: `src/app/api/admin/bot/knowledge/route.ts`
- Create: `src/app/api/admin/bot/knowledge/[id]/route.ts`

- [ ] **Krok 1: Utwórz route dla listy i tworzenia wpisów**

```typescript
// src/app/api/admin/bot/knowledge/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, requireAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('bot_knowledge')
    .select('id, title, content, created_at, updated_at')
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: 'db_error' }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  const { title, content } = await request.json() as { title: string; content: string }
  if (!title?.trim() || !content?.trim()) {
    return NextResponse.json({ error: 'title and content required' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('bot_knowledge')
    .insert({ title: title.trim(), content: content.trim() })
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'db_error' }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
```

- [ ] **Krok 2: Utwórz route dla edycji i usuwania wpisów**

```typescript
// src/app/api/admin/bot/knowledge/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, requireAdmin } from '@/lib/supabase'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  const { id } = await params
  const { title, content } = await request.json() as { title?: string; content?: string }

  const updates: Record<string, string> = { updated_at: new Date().toISOString() }
  if (title?.trim()) updates.title = title.trim()
  if (content?.trim()) updates.content = content.trim()

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('bot_knowledge')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'db_error' }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  const { id } = await params
  const supabase = createServiceClient()
  const { error } = await supabase.from('bot_knowledge').delete().eq('id', id)

  if (error) return NextResponse.json({ error: 'db_error' }, { status: 500 })
  return NextResponse.json({ deleted: true })
}
```

- [ ] **Krok 3: Sprawdź TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Krok 4: Commit**

```bash
git add src/app/api/admin/bot/
git commit -m "feat: add admin API for bot knowledge base CRUD"
```

---

## Task 9: Admin API — leady i ustawienia

**Files:**
- Create: `src/app/api/admin/bot/leads/route.ts`
- Create: `src/app/api/admin/bot/settings/route.ts`

- [ ] **Krok 1: Utwórz route dla leadów**

```typescript
// src/app/api/admin/bot/leads/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, requireAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('bot_leads')
    .select('id, name, phone, email, fb_user_id, conversation, created_at')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: 'db_error' }, { status: 500 })
  return NextResponse.json(data)
}
```

- [ ] **Krok 2: Utwórz route dla ustawień**

```typescript
// src/app/api/admin/bot/settings/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, requireAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('bot_settings')
    .select('purchase_url, enabled')
    .eq('id', 'default')
    .single()

  if (error) return NextResponse.json({ error: 'db_error' }, { status: 500 })
  return NextResponse.json(data)
}

export async function PUT(request: NextRequest) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  const { purchase_url, enabled } = await request.json() as {
    purchase_url?: string
    enabled?: boolean
  }

  const updates: Record<string, unknown> = {}
  if (purchase_url !== undefined) updates.purchase_url = purchase_url
  if (enabled !== undefined) updates.enabled = enabled

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('bot_settings')
    .update(updates)
    .eq('id', 'default')
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'db_error' }, { status: 500 })
  return NextResponse.json(data)
}
```

- [ ] **Krok 3: Sprawdź TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Krok 4: Commit**

```bash
git add src/app/api/admin/bot/leads/ src/app/api/admin/bot/settings/
git commit -m "feat: add admin API for bot leads and settings"
```

---

## Task 10: Panel admina /admin/bot

**Files:**
- Create: `src/app/admin/bot/page.tsx`

- [ ] **Krok 1: Utwórz stronę admina**

```typescript
// src/app/admin/bot/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface KnowledgeEntry {
  id: string
  title: string
  content: string
  created_at: string
}

interface Lead {
  id: string
  name: string | null
  phone: string | null
  email: string | null
  fb_user_id: string
  conversation: Array<{ role: string; content: string }>
  created_at: string
}

interface BotSettings {
  purchase_url: string
  enabled: boolean
}

type Modal =
  | { type: 'add' }
  | { type: 'edit'; entry: KnowledgeEntry }
  | { type: 'lead'; lead: Lead }
  | null

export default function AdminBotPage() {
  const router = useRouter()
  const [knowledge, setKnowledge] = useState<KnowledgeEntry[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [settings, setSettings] = useState<BotSettings>({ purchase_url: '', enabled: true })
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<Modal>(null)
  const [formTitle, setFormTitle] = useState('')
  const [formContent, setFormContent] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      const [kRes, lRes, sRes] = await Promise.all([
        fetch('/api/admin/bot/knowledge'),
        fetch('/api/admin/bot/leads'),
        fetch('/api/admin/bot/settings'),
      ])
      if (kRes.status === 401) { router.push('/admin/login'); return }
      setKnowledge(await kRes.json())
      setLeads(await lRes.json())
      setSettings(await sRes.json())
      setLoading(false)
    }
    load()
  }, [router])

  function openAdd() {
    setFormTitle('')
    setFormContent('')
    setModal({ type: 'add' })
  }

  function openEdit(entry: KnowledgeEntry) {
    setFormTitle(entry.title)
    setFormContent(entry.content)
    setModal({ type: 'edit', entry })
  }

  async function handleSaveEntry() {
    if (!formTitle.trim() || !formContent.trim()) return
    setSaving(true)
    if (modal?.type === 'add') {
      const res = await fetch('/api/admin/bot/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: formTitle, content: formContent }),
      })
      const entry = await res.json() as KnowledgeEntry
      setKnowledge(prev => [...prev, entry])
    } else if (modal?.type === 'edit') {
      const res = await fetch(`/api/admin/bot/knowledge/${modal.entry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: formTitle, content: formContent }),
      })
      const updated = await res.json() as KnowledgeEntry
      setKnowledge(prev => prev.map(k => k.id === updated.id ? updated : k))
    }
    setSaving(false)
    setModal(null)
  }

  async function handleDelete(id: string) {
    if (!confirm('Usunąć ten wpis?')) return
    await fetch(`/api/admin/bot/knowledge/${id}`, { method: 'DELETE' })
    setKnowledge(prev => prev.filter(k => k.id !== id))
  }

  async function handleToggleBot() {
    const newEnabled = !settings.enabled
    setSettings(prev => ({ ...prev, enabled: newEnabled }))
    await fetch('/api/admin/bot/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: newEnabled }),
    })
  }

  async function handleSavePurchaseUrl() {
    await fetch('/api/admin/bot/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ purchase_url: settings.purchase_url }),
    })
    alert('Zapisano!')
  }

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: '#6B7280' }}>
        Ładowanie...
      </div>
    )
  }

  return (
    <div>
      {/* Top nav */}
      <div style={{ background: 'white', borderBottom: '1px solid #E5E7EB', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '1.1rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
          <span style={{ color: 'var(--color-accent)' }}>No</span>booking Admin
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <a href="/admin/zamowienia" style={{ fontSize: '0.875rem', color: '#6B7280', textDecoration: 'none' }}>Zamówienia</a>
          <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#111827' }}>Bot FB</span>
        </div>
      </div>

      <div style={{ padding: '2rem', maxWidth: '900px' }}>

        {/* Ustawienia */}
        <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: '#111827' }}>Ustawienia bota</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.875rem', color: '#374151' }}>Status:</span>
            <button
              onClick={handleToggleBot}
              style={{
                padding: '0.4rem 1rem', borderRadius: '20px', border: 'none',
                fontFamily: 'inherit', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
                background: settings.enabled ? '#D1FAE5' : '#FEE2E2',
                color: settings.enabled ? '#065F46' : '#991B1B',
              }}
            >
              {settings.enabled ? '✅ Włączony' : '❌ Wyłączony'}
            </button>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.875rem', color: '#374151', whiteSpace: 'nowrap' }}>URL zakupu:</span>
            <input
              value={settings.purchase_url}
              onChange={e => setSettings(prev => ({ ...prev, purchase_url: e.target.value }))}
              style={{ flex: 1, padding: '0.4rem 0.75rem', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '0.875rem', fontFamily: 'inherit' }}
            />
            <button
              onClick={handleSavePurchaseUrl}
              style={{ padding: '0.4rem 1rem', borderRadius: '8px', border: 'none', background: '#111827', color: 'white', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
            >
              Zapisz
            </button>
          </div>
        </div>

        {/* Baza wiedzy */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827' }}>Baza wiedzy</h2>
            <button
              onClick={openAdd}
              style={{ padding: '0.5rem 1.25rem', borderRadius: '8px', border: 'none', background: '#111827', color: 'white', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              + Dodaj wpis
            </button>
          </div>

          {knowledge.length === 0 ? (
            <p style={{ color: '#9CA3AF', fontSize: '0.875rem' }}>Brak wpisów. Dodaj pierwszy wpis bazy wiedzy.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {knowledge.map(entry => (
                <div key={entry.id} style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#111827', marginBottom: '0.25rem' }}>{entry.title}</div>
                    <div style={{ fontSize: '0.8rem', color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.content}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                    <button onClick={() => openEdit(entry)} style={{ padding: '0.35rem 0.75rem', border: '1px solid #D1D5DB', borderRadius: '6px', background: 'white', fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'inherit' }}>Edytuj</button>
                    <button onClick={() => handleDelete(entry.id)} style={{ padding: '0.35rem 0.75rem', border: '1px solid #FCA5A5', borderRadius: '6px', background: '#FEF2F2', color: '#DC2626', fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'inherit' }}>Usuń</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Leady */}
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', marginBottom: '1rem' }}>
            Leady z bota <span style={{ fontSize: '0.875rem', fontWeight: 400, color: '#6B7280' }}>({leads.length})</span>
          </h2>

          {leads.length === 0 ? (
            <p style={{ color: '#9CA3AF', fontSize: '0.875rem' }}>Brak leadów. Bot zbiera je automatycznie gdy ktoś podaje dane kontaktowe.</p>
          ) : (
            <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: '12px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #E5E7EB', background: '#F9FAFB' }}>
                    {['Imię', 'Telefon', 'Data', ''].map(h => (
                      <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead, i) => (
                    <tr key={lead.id} style={{ borderBottom: i < leads.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
                      <td style={{ padding: '0.875rem 1rem', fontSize: '0.875rem', fontWeight: 600, color: '#111827' }}>{lead.name ?? '—'}</td>
                      <td style={{ padding: '0.875rem 1rem', fontSize: '0.875rem', color: '#374151' }}>{lead.phone ?? '—'}</td>
                      <td style={{ padding: '0.875rem 1rem', fontSize: '0.8rem', color: '#6B7280' }}>{new Date(lead.created_at).toLocaleDateString('pl-PL')}</td>
                      <td style={{ padding: '0.875rem 1rem' }}>
                        <button
                          onClick={() => setModal({ type: 'lead', lead })}
                          style={{ padding: '0.3rem 0.75rem', border: '1px solid #D1D5DB', borderRadius: '6px', background: 'white', fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'inherit' }}
                        >
                          Rozmowa
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal: dodaj/edytuj wpis */}
      {(modal?.type === 'add' || modal?.type === 'edit') && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '2rem', width: '100%', maxWidth: '560px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1.25rem', color: '#111827' }}>
              {modal.type === 'add' ? 'Nowy wpis' : 'Edytuj wpis'}
            </h3>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '0.375rem' }}>Tytuł</label>
              <input
                value={formTitle}
                onChange={e => setFormTitle(e.target.value)}
                placeholder="np. Cennik"
                style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '0.875rem', fontFamily: 'inherit', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '0.375rem' }}>Treść</label>
              <textarea
                value={formContent}
                onChange={e => setFormContent(e.target.value)}
                rows={6}
                placeholder="Informacje które bot ma znać na ten temat..."
                style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '0.875rem', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setModal(null)} style={{ padding: '0.5rem 1.25rem', border: '1px solid #D1D5DB', borderRadius: '8px', background: 'white', fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'inherit' }}>Anuluj</button>
              <button onClick={handleSaveEntry} disabled={saving} style={{ padding: '0.5rem 1.25rem', border: 'none', borderRadius: '8px', background: '#111827', color: 'white', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                {saving ? 'Zapisywanie...' : 'Zapisz'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: rozmowa leada */}
      {modal?.type === 'lead' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
          <div style={{ background: 'white', borderRadius: '16px', padding: '2rem', width: '100%', maxWidth: '560px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#111827' }}>
                Rozmowa — {modal.lead.name ?? 'Anonim'}
              </h3>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#6B7280' }}>✕</button>
            </div>
            <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {modal.lead.conversation.map((msg, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-start' : 'flex-end' }}>
                  <div style={{
                    padding: '0.5rem 0.875rem', borderRadius: '12px', maxWidth: '80%',
                    background: msg.role === 'user' ? '#F3F4F6' : '#111827',
                    color: msg.role === 'user' ? '#111827' : 'white',
                    fontSize: '0.8rem', lineHeight: '1.4',
                  }}>
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Krok 2: Sprawdź TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: brak nowych błędów.

- [ ] **Krok 3: Commit**

```bash
git add src/app/admin/bot/page.tsx
git commit -m "feat: add admin bot panel with knowledge base, leads, and settings"
```

---

## Task 11: Test lokalny i deploy

**Files:** brak

- [ ] **Krok 1: Uruchom dev server**

```bash
npm run dev
```

Otwórz http://localhost:3000/admin/bot — zaloguj się do admina. Sprawdź:
- Lista wpisów bazy wiedzy (powinny być 4 przykładowe z Task 2)
- Modal "Dodaj wpis" otwiera się i zapisuje
- Edycja i usuwanie wpisów działa
- Zakładka leadów (pusta na razie)
- Przełącznik włącz/wyłącz bota

- [ ] **Krok 2: Test weryfikacji webhooka (lokalnie z ngrok)**

```bash
# W osobnym terminalu
npx ngrok http 3000
```

Skopiuj URL ngrok (np. `https://abc123.ngrok.io`) i przetestuj:

```bash
curl "https://abc123.ngrok.io/api/facebook/webhook?hub.mode=subscribe&hub.verify_token=nobooking_webhook_2026&hub.challenge=TEST123"
```

Expected: `TEST123`

- [ ] **Krok 3: Deploy na Vercel**

```bash
vercel --prod
```

- [ ] **Krok 4: Konfiguracja Meta Developer Console**

> **Ważne:** Ten krok wymaga aktywnej Facebook Page dla nobooking.eu.

1. Wejdź na https://developers.facebook.com
2. Utwórz nową aplikację → typ "Business"
3. Dodaj produkt "Messenger"
4. W Messenger Settings:
   - Webhook URL: `https://nobooking.eu/api/facebook/webhook`
   - Verify Token: `nobooking_webhook_2026`
   - Subskrybowane eventy: `messages`, `messaging_postbacks`, `feed`
5. Skopiuj **Page Access Token** → wklej do zmiennej `FACEBOOK_PAGE_ACCESS_TOKEN` na Vercel
6. Skopiuj **App Secret** → wklej do `FACEBOOK_APP_SECRET` na Vercel
7. Zrób redeploy: `vercel --prod`

- [ ] **Krok 5: Test końcowy**

Wyślij wiadomość na Facebook Page nobooking.eu: "Ile kosztuje strona?"

Expected: Bot odpowiada w ciągu kilku sekund z ceną i linkiem do nobooking.eu/zamow.

---

## Notatka: Potencjalne problemy

**Timeout webhooka:** Facebook wymaga odpowiedzi 200 w ciągu 20s. Claude zwykle odpowiada w 2-5s, więc jest OK. Przy przeciążeniu Vercel Functions możliwy timeout — w razie problemów dodaj kolejkę (Upstash Queue).

**Echo prevention:** Bot ignoruje wiadomości z `is_echo: true` — zabezpieczenie przed odpowiadaniem na własne wiadomości.

**Komentarze:** Bot odpowiada na komentarze pod WSZYSTKIMI postami strony. Jeśli chcesz ograniczyć do wybranych postów — dodaj filtrowanie po `entry.id` (post ID).
