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
  ob_description: string | null
  ob_price_per_night: number | null
  ob_max_guests: number | null
  ob_checkin_time: string | null
  ob_checkout_time: string | null
  ob_amenities: string | null
  ob_rules: string | null
  ob_seasons: string | null
  ob_photos_link: string | null
}
