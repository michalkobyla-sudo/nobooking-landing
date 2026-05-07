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
