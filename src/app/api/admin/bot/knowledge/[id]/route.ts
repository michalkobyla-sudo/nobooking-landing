import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, requireAdmin } from '@/lib/supabase'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  const { id } = await params
  const { title, content } = (await request.json()) as { title?: string; content?: string }

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
