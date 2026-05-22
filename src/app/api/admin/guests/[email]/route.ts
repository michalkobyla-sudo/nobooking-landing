import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, requireAdmin } from '@/lib/supabase'
import crypto from 'crypto'

interface Params {
  params: Promise<{ email: string }>
}

/**
 * DELETE /api/admin/guests/[email]
 *
 * GDPR: anonymise all guest data for a given email address.
 * Replaces PII in bookings with non-reversible placeholders.
 * Does NOT delete the booking record (preserves financial history).
 *
 * Protected by requireAdmin — Michał's admin only.
 */
export async function DELETE(request: NextRequest, { params }: Params) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  const { email: rawEmail } = await params
  const email = decodeURIComponent(rawEmail).toLowerCase().trim()

  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'invalid_email' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Find all bookings for this guest
  const { data: bookings, error: findError } = await supabase
    .from('bookings')
    .select('id')
    .eq('guest_email', email)

  if (findError) {
    return NextResponse.json({ error: findError.message }, { status: 500 })
  }

  if (!bookings || bookings.length === 0) {
    return NextResponse.json({ error: 'not_found', message: 'No bookings found for this email' }, { status: 404 })
  }

  // Anonymise: replace PII with non-reversible values
  const emailHash = crypto.createHash('sha256').update(email).digest('hex').slice(0, 12)
  const anonymisedEmail = `deleted-${emailHash}@gdpr.nobooking.eu`

  const { error: updateError } = await supabase
    .from('bookings')
    .update({
      guest_name: 'USUNIĘTO (RODO)',
      guest_email: anonymisedEmail,
      guest_phone: 'USUNIĘTO',
      notes: null,
    })
    .eq('guest_email', email)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Also anonymise orders table if email matches
  await supabase
    .from('orders')
    .update({
      first_name: 'USUNIĘTO',
      last_name: '(RODO)',
      email: anonymisedEmail,
      phone: 'USUNIĘTO',
      invoice_company: null,
      invoice_nip: null,
      invoice_address: null,
      notes: null,
    })
    .eq('email', email)

  return NextResponse.json({
    ok: true,
    anonymised_bookings: bookings.length,
    message: `Dane gościa ${email} zostały zanonimizowane (RODO). Zanonimizowano ${bookings.length} rezerwację/rezerwacji.`,
  })
}

/**
 * GET /api/admin/guests/[email]
 * Returns a summary of all bookings for a guest (useful before deletion).
 */
export async function GET(request: NextRequest, { params }: Params) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  const { email: rawEmail } = await params
  const email = decodeURIComponent(rawEmail).toLowerCase().trim()

  const supabase = createServiceClient()
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('id, check_in, check_out, total_price, currency, status, created_at, site_id')
    .eq('guest_email', email)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    email,
    bookings_count: bookings?.length ?? 0,
    bookings: bookings ?? [],
  })
}
