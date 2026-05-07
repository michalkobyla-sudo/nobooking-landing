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

  const { title, content } = (await request.json()) as { title: string; content: string }
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
