#!/usr/bin/env node
/**
 * nobooking.eu — Data Migration Script
 * Migrates data from old shared Supabase project to new nobooking-prod project.
 *
 * Usage:
 *   OLD_URL=https://xxx.supabase.co OLD_KEY=service_role_key_old \
 *   NEW_URL=https://yyy.supabase.co NEW_KEY=service_role_key_new \
 *   node docs/supabase/migrate-data.mjs
 *
 * Prerequisites:
 *   node >= 18 (uses fetch natively)
 *   New Supabase project must already have schema applied (nobooking-prod-schema.sql)
 *
 * What it migrates (nobooking rows only — skips CasaSol data):
 *   orders → all rows (orders have no CasaSol data)
 *   sites  → all rows
 *   bookings → only rows where site_id IS NOT NULL (nobooking bookings)
 *   blocked_dates → only rows where site_id IS NOT NULL (nobooking blocked dates)
 *   reviews → all rows
 *   discount_codes → all rows
 *   checkin_forms → all rows
 */

const OLD_URL = process.env.OLD_URL
const OLD_KEY = process.env.OLD_KEY
const NEW_URL = process.env.NEW_URL
const NEW_KEY = process.env.NEW_KEY

if (!OLD_URL || !OLD_KEY || !NEW_URL || !NEW_KEY) {
  console.error('Missing env vars. Set OLD_URL, OLD_KEY, NEW_URL, NEW_KEY')
  process.exit(1)
}

// ── Supabase REST helpers ─────────────────────────────────────────────────────

async function fetchAll(baseUrl, key, table, filter = '', select = '*') {
  const url = `${baseUrl}/rest/v1/${table}?select=${select}${filter ? '&' + filter : ''}&limit=10000`
  const res = await fetch(url, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`GET ${table} failed: ${res.status} ${text}`)
  }
  return res.json()
}

async function insertBatch(baseUrl, key, table, rows) {
  if (rows.length === 0) return
  const BATCH = 500
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH)
    const res = await fetch(`${baseUrl}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal,resolution=merge-duplicates',
      },
      body: JSON.stringify(chunk),
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`INSERT ${table} batch ${i}-${i + chunk.length} failed: ${res.status} ${text}`)
    }
    console.log(`  ✓ Inserted ${table} rows ${i + 1}–${i + chunk.length}`)
  }
}

// ── Migration ─────────────────────────────────────────────────────────────────

async function migrate() {
  console.log('\n🚀 Starting nobooking data migration...\n')
  console.log(`  Source: ${OLD_URL}`)
  console.log(`  Target: ${NEW_URL}\n`)

  // 1. ORDERS — only columns that exist in new schema
  const ORDER_COLS = [
    'id','created_at','plan','currency','status','stripe_session_id','stripe_paid',
    'onboarding_token','onboarding_submitted','first_name','last_name','email','phone',
    'invoice_company','invoice_nip','invoice_address','apartment_name','apartment_location','notes',
    'ob_description','ob_tagline','ob_address','ob_bedrooms','ob_bathrooms','ob_sqm',
    'ob_photos_link','ob_video_link','ob_price_per_night','ob_currency','ob_max_guests','ob_seasons',
    'ob_checkin_time','ob_checkout_time','ob_amenities','ob_rules',
    'ob_contact_email','ob_contact_phone','ob_domain','ob_instagram','ob_facebook','ob_color',
    'ob_sms_phone','ob_checkin_fields','site_slug','generated_config','site_generated_at',
  ].join(',')

  console.log('📦 Migrating orders...')
  const orders = await fetchAll(OLD_URL, OLD_KEY, 'orders', '', ORDER_COLS)
  console.log(`  Found ${orders.length} orders`)
  await insertBatch(NEW_URL, NEW_KEY, 'orders', orders)
  console.log(`  ✅ Orders done\n`)

  // 2. SITES — only columns that exist in new schema
  const SITE_COLS = [
    'id','created_at','order_id','slug','plan','active','config',
    'owner_email','owner_user_id','stripe_account_id','stripe_onboarded','admin_password_hash',
  ].join(',')

  console.log('🏠 Migrating sites...')
  const sites = await fetchAll(OLD_URL, OLD_KEY, 'sites', '', SITE_COLS)
  console.log(`  Found ${sites.length} sites`)
  await insertBatch(NEW_URL, NEW_KEY, 'sites', sites)
  console.log(`  ✅ Sites done\n`)

  // 3. BOOKINGS — only nobooking rows (site_id IS NOT NULL)
  console.log('📅 Migrating bookings...')
  const bookings = await fetchAll(OLD_URL, OLD_KEY, 'bookings', 'site_id=not.is.null')
  console.log(`  Found ${bookings.length} bookings with site_id (nobooking bookings)`)

  // Clean up CasaSol-specific columns that don't exist in new schema
  const cleanBookings = bookings.map(b => {
    const { guest_id, adults, children, price_per_night, cleaning_fee, deposit_amount, ...rest } = b
    return rest
  })
  await insertBatch(NEW_URL, NEW_KEY, 'bookings', cleanBookings)
  console.log(`  ✅ Bookings done\n`)

  // 4. BLOCKED DATES — only nobooking rows (site_id IS NOT NULL)
  console.log('🔒 Migrating blocked_dates...')
  const blocked = await fetchAll(OLD_URL, OLD_KEY, 'blocked_dates', 'site_id=not.is.null')
  console.log(`  Found ${blocked.length} blocked_dates with site_id (nobooking dates)`)

  // Clean up CasaSol-specific columns (start_date, end_date)
  const cleanBlocked = blocked.map(b => {
    const { start_date, end_date, ...rest } = b
    return rest
  })
  await insertBatch(NEW_URL, NEW_KEY, 'blocked_dates', cleanBlocked)
  console.log(`  ✅ Blocked dates done\n`)

  // 5. REVIEWS
  console.log('⭐ Migrating reviews...')
  const reviews = await fetchAll(OLD_URL, OLD_KEY, 'reviews')
  console.log(`  Found ${reviews.length} reviews`)
  await insertBatch(NEW_URL, NEW_KEY, 'reviews', reviews)
  console.log(`  ✅ Reviews done\n`)

  // 6. DISCOUNT CODES
  console.log('🏷️  Migrating discount_codes...')
  const codes = await fetchAll(OLD_URL, OLD_KEY, 'discount_codes')
  console.log(`  Found ${codes.length} discount codes`)
  await insertBatch(NEW_URL, NEW_KEY, 'discount_codes', codes)
  console.log(`  ✅ Discount codes done\n`)

  // 7. CHECKIN FORMS
  console.log('📋 Migrating checkin_forms...')
  const forms = await fetchAll(OLD_URL, OLD_KEY, 'checkin_forms')
  console.log(`  Found ${forms.length} checkin forms`)
  await insertBatch(NEW_URL, NEW_KEY, 'checkin_forms', forms)
  console.log(`  ✅ Checkin forms done\n`)

  console.log('✅ Migration complete!\n')
  console.log('Next steps:')
  console.log('  1. Verify row counts in new project (Supabase Dashboard → Table Editor)')
  console.log('  2. Update Vercel env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  console.log('  3. Redeploy on Vercel')
  console.log('  4. Test: /zamow, /onboarding, /sites/[slug], /sites/[slug]/admin\n')
}

migrate().catch(err => {
  console.error('\n❌ Migration failed:', err.message)
  process.exit(1)
})
