export type Lang = 'pl' | 'en' | 'es' | 'de'

export type T = { pl: string; en: string; es: string; de: string }

export interface ApartmentPhoto {
  url: string
  alt: string
  /** optional video URL (YouTube embed) */
  videoUrl?: string
}

export interface ApartmentAmenity {
  icon: string
  label: T
}

export interface ApartmentPriceTier {
  pricePerNight: number
  minNights: number
  label: T
  months: string // e.g. "Oct–Apr"
}

export interface ApartmentReview {
  text: T
  author: string
  location: string
  score: number
  date: string
}

export interface ApartmentNearby {
  icon: string
  name: T
  distance: string
}

export interface ApartmentConfig {
  /** Unique slug used in URL path */
  slug: string

  /** Apartment name (can be same in all languages) */
  name: string

  /** Short tagline */
  tagline: T

  /** City/region */
  location: string

  /** Full address */
  address: string

  specs: {
    bedrooms: number
    guests: number
    sqm: number
    bathrooms: number
  }

  description: T

  photos: ApartmentPhoto[]

  amenities: ApartmentAmenity[]

  pricing: {
    currency: 'EUR' | 'PLN'
    cleaningFee: number
    tiers: {
      low: ApartmentPriceTier
      mid: ApartmentPriceTier
      high: ApartmentPriceTier
    }
  }

  /** Dates that are already booked, format YYYY-MM-DD */
  bookedDates: string[]

  reviews: {
    score: number
    count: number
    items: ApartmentReview[]
  }

  map: {
    embedUrl: string
    nearby: ApartmentNearby[]
  }

  contact: {
    email: string
    phone?: string
    instagram?: string
    facebook?: string
  }

  /** Optional video section */
  videos?: {
    embedUrl: string   // YouTube embed URL
    title: T
    thumbnail?: string // optional preview image URL
  }[]

  /** Optional color overrides */
  theme?: {
    primary?: string   // default #1A5276
    accent?: string    // default #E67E22
  }
}
