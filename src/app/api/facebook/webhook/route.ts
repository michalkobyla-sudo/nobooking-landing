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
  const expected =
    'sha256=' +
    crypto
      .createHmac('sha256', process.env.FACEBOOK_APP_SECRET!)
      .update(body)
      .digest('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  } catch {
    return false
  }
}

// ── Obsługa wiadomości Messenger ─────────────────────────────────────────────
async function handleMessage(senderId: string, text: string): Promise<void> {
  const supabase = createServiceClient()

  const { data: convRow } = await supabase
    .from('bot_conversations')
    .select('messages')
    .eq('fb_user_id', senderId)
    .single()

  const history: BotMessage[] = (convRow?.messages as BotMessage[]) ?? []

  const [knowledge, purchaseUrl] = await Promise.all([getKnowledgeBase(), getPurchaseUrl()])

  const botResponse = await askClaude(history, text, knowledge, purchaseUrl)

  const updatedHistory: BotMessage[] = ([
    ...history,
    { role: 'user' as const, content: text },
    { role: 'assistant' as const, content: botResponse.message },
  ] as BotMessage[]).slice(-10)

  await supabase.from('bot_conversations').upsert({
    fb_user_id: senderId,
    messages: updatedHistory,
    updated_at: new Date().toISOString(),
  })

  if (botResponse.type === 'save_lead') {
    await supabase.from('bot_leads').insert({
      fb_user_id: senderId,
      name: botResponse.name,
      phone: botResponse.phone,
      conversation: updatedHistory,
    })
  }

  await sendMessengerMessage(senderId, botResponse.message)
}

// ── Obsługa komentarzy pod postami ──────────────────────────────────────────
async function handleComment(commentId: string, commentText: string): Promise<void> {
  const [knowledge, purchaseUrl] = await Promise.all([getKnowledgeBase(), getPurchaseUrl()])

  const botResponse = await askClaude(
    [],
    `Krótko odpowiedz na komentarz pod postem i zaproś do wiadomości prywatnej po szczegóły. Komentarz: "${commentText}"`,
    knowledge,
    purchaseUrl
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
    const changes =
      (entry.changes as Array<{ field: string; value: Record<string, unknown> }>) ?? []
    for (const change of changes) {
      if (change.field !== 'feed') continue
      const val = change.value
      if (val.item !== 'comment' || val.verb !== 'add') continue
      const commentId = val.comment_id as string
      const commentText = val.message as string
      const fromId = (val.from as { id: string })?.id
      const pageId = entry.id as string
      if (fromId === pageId || !commentId || !commentText) continue
      await handleComment(commentId, commentText)
    }
  }

  return NextResponse.json({ status: 'ok' })
}
