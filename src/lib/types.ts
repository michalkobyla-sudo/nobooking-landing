export type OrderStatus = 'new' | 'contacted' | 'onboarding_sent' | 'building' | 'completed'

export interface Order {
  id: string
  created_at: string
  plan: 'basic' | 'pro'
  currency: 'pln' | 'eur'
  status: OrderStatus
  stripe_session_id: string | null
  stripe_paid: boolean
  onboarding_token: string
  onboarding_submitted: boolean
  first_name: string
  last_name: string
  email: string
  phone: string
  invoice_company: string | null
  invoice_nip: string | null
  invoice_address: string | null
  apartment_name: string
  apartment_location: string
  notes: string | null

  // ─── Onboarding — opis i specyfikacja ───────────────────────────────────────
  ob_description: string | null
  ob_tagline: string | null
  ob_address: string | null
  ob_bedrooms: number | null
  ob_bathrooms: number | null
  ob_sqm: number | null

  // ─── Onboarding — zdjęcia i media ───────────────────────────────────────────
  ob_photos_link: string | null
  ob_video_link: string | null

  // ─── Onboarding — cennik ────────────────────────────────────────────────────
  ob_price_per_night: number | null
  ob_currency: 'pln' | 'eur' | null
  ob_max_guests: number | null
  ob_seasons: string | null     // JSON: Season[]

  // ─── Onboarding — zasady i udogodnienia ─────────────────────────────────────
  ob_checkin_time: string | null
  ob_checkout_time: string | null
  ob_amenities: string | null
  ob_rules: string | null

  // ─── Onboarding — kontakt i domena ──────────────────────────────────────────
  ob_contact_email: string | null
  ob_contact_phone: string | null
  ob_domain: string | null      // własna domena lub "brak"
  ob_instagram: string | null
  ob_facebook: string | null
  ob_color: string | null       // preferowany kolor, np. "#1A5276"

  // ─── Onboarding — tylko Pro ─────────────────────────────────────────────────
  ob_sms_phone: string | null   // numer do powiadomień SMS
  ob_checkin_fields: string | null  // JSON: dodatkowe pola online check-in

  // ─── Wygenerowana strona ─────────────────────────────────────────────────────
  site_slug: string | null
  generated_config: string | null  // JSON: ApartmentConfig
  site_generated_at: string | null

  // ─── Runda poprawek (max 4) ───────────────────────────────────────────────────
  revision_token: string
  revision_count: number           // 0–4
  revision_notes: string | null    // ostatnie uwagi klienta
}

// ─── SITE ─────────────────────────────────────────────────────────────────────

export interface Site {
  id: string
  created_at: string
  order_id: string
  slug: string
  plan: 'basic' | 'pro'
  active: boolean
  config: Record<string, unknown>  // ApartmentConfig JSON
  owner_email: string
  owner_user_id: string | null
  stripe_account_id: string | null
  stripe_onboarded: boolean
}

// ─── BOOKING ──────────────────────────────────────────────────────────────────

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed'

export interface Booking {
  id: string
  created_at: string
  site_id: string
  guest_name: string
  guest_email: string
  guest_phone: string
  check_in: string        // YYYY-MM-DD
  check_out: string       // YYYY-MM-DD
  nights: number
  guests_count: number
  total_price: number
  currency: string
  stripe_session_id: string | null
  stripe_payment_id: string | null
  stripe_paid: boolean
  status: BookingStatus
  token: string
  discount_code: string | null
  discount_pct: number
  notes: string | null
  checkin_sent: boolean
  checkin_submitted: boolean
}

// ─── BLOCKED DATE ─────────────────────────────────────────────────────────────

export interface BlockedDate {
  id: string
  site_id: string
  date: string    // YYYY-MM-DD
  reason: string | null
}

// ─── REVIEW ───────────────────────────────────────────────────────────────────

export interface Review {
  id: string
  created_at: string
  site_id: string
  booking_id: string | null
  guest_name: string
  score: number
  text: string
  published: boolean
}

// ─── DISCOUNT CODE ────────────────────────────────────────────────────────────

export interface DiscountCode {
  id: string
  created_at: string
  site_id: string
  code: string
  discount_pct: number
  max_uses: number | null
  uses_count: number
  valid_until: string | null
  active: boolean
}

// ─── CHECKIN FORM ─────────────────────────────────────────────────────────────

export interface CheckinGuest {
  name: string
  dob: string
  passport: string
  country: string
}

export interface CheckinForm {
  id: string
  created_at: string
  booking_id: string
  guests_data: CheckinGuest[]
  arrival_time: string | null
  notes: string | null
}
