import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  // Vercel Cron sends Authorization: Bearer <CRON_SECRET>
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = createServiceClient()
  const today = new Date().toISOString().slice(0, 10)

  // Fetch all sites
  const { data: sites, error: sitesError } = await db
    .from('sites')
    .select('id, slug')
    .order('created_at', { ascending: true })

  if (sitesError) {
    console.error('[backup-bookings] sites fetch error:', sitesError.message)
    return NextResponse.json({ error: sitesError.message }, { status: 500 })
  }

  // Fetch all bookings + blocked_dates across all sites
  const [bookingsRes, blockedRes, ordersRes] = await Promise.all([
    db.from('bookings').select('*').order('check_in', { ascending: true }),
    db.from('blocked_dates').select('*').order('date', { ascending: true }),
    db.from('orders').select('id, customer_email, customer_name, status, created_at'),
  ])

  const backup = {
    exported_at: new Date().toISOString(),
    sites: sites ?? [],
    bookings_count: bookingsRes.data?.length ?? 0,
    bookings: bookingsRes.data ?? [],
    blocked_dates_count: blockedRes.data?.length ?? 0,
    blocked_dates: blockedRes.data ?? [],
    orders_count: ordersRes.data?.length ?? 0,
    orders: ordersRes.data ?? [],
  }

  const json = JSON.stringify(backup, null, 2)
  const blob = new Blob([json], { type: 'application/json' })

  // Save dated file + latest
  const filename = `backups/nobooking_backup_${today}.json`
  const filenameLatest = 'backups/nobooking_backup_latest.json'

  const [uploadDated, uploadLatest] = await Promise.all([
    db.storage.from('app-data').upload(filename, blob, { upsert: true, contentType: 'application/json' }),
    db.storage.from('app-data').upload(filenameLatest, blob, { upsert: true, contentType: 'application/json' }),
  ])

  if (uploadDated.error) {
    console.error('[backup-bookings] upload error:', uploadDated.error.message)
    return NextResponse.json({ error: uploadDated.error.message }, { status: 500 })
  }

  console.log(`[backup-bookings] saved ${backup.bookings_count} bookings across ${sites?.length} sites → ${filename}`)
  return NextResponse.json({
    ok: true,
    file: filename,
    sites: sites?.length ?? 0,
    bookings: backup.bookings_count,
    orders: backup.orders_count,
    date: today,
  })
}
