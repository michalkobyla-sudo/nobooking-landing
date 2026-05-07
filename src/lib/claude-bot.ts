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
