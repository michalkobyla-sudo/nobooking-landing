import type { Order } from './types'
import type { ApartmentConfig } from './apartmentTypes'

// ─── Slug ────────────────────────────────────────────────────────────────────

export function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // remove diacritics
    .replace(/ł/g, 'l')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60)
}

// ─── Placeholder photos (replaced when client uploads real ones) ─────────────

const PLACEHOLDER_PHOTOS = [
  { url: 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=1600&q=80', alt: 'Apartament' },
  { url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=900&q=80', alt: 'Salon' },
  { url: 'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=900&q=80', alt: 'Sypialnia' },
  { url: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=900&q=80', alt: 'Kuchnia' },
  { url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=900&q=80', alt: 'Basen' },
  { url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=900&q=80', alt: 'Okolica' },
]

// ─── Prompt builder ───────────────────────────────────────────────────────────

function buildPrompt(order: Order): string {
  const address = order.ob_address || order.apartment_location

  let seasonsText = '(nie podano)'
  if (order.ob_seasons) {
    try {
      const parsed = JSON.parse(order.ob_seasons) as Array<{
        label: string; from: string; to: string; price: string; minNights: string
      }>
      seasonsText = parsed
        .map(s => `  - ${s.label}: ${s.from} → ${s.to}, ${s.price} ${order.ob_currency?.toUpperCase() ?? 'EUR'}/noc, min ${s.minNights} noce`)
        .join('\n')
    } catch { /* ignore */ }
  }

  return `Generate a vacation apartment website config as a JSON object.

CRITICAL: Output ONLY the raw JSON object. No markdown fences, no \`\`\`json, no explanation.

Required output structure — every field is mandatory:
{
  "slug": "apartment-name-slug",
  "name": "Apartment Name",
  "tagline": { "pl": "...", "en": "...", "es": "...", "de": "..." },
  "location": "City, Region",
  "address": "Full address",
  "specs": { "bedrooms": 2, "guests": 4, "sqm": 65, "bathrooms": 1 },
  "description": { "pl": "...", "en": "...", "es": "...", "de": "..." },
  "photos": [],
  "amenities": [
    { "icon": "📶", "label": { "pl": "WiFi", "en": "WiFi", "es": "WiFi", "de": "WLAN" } }
  ],
  "pricing": {
    "currency": "EUR",
    "cleaningFee": 60,
    "tiers": {
      "low":  { "pricePerNight": 80,  "minNights": 3, "label": { "pl": "Niski sezon",  "en": "Low season",  "es": "Temporada baja",  "de": "Nebensaison"    }, "months": "paź–kwi / Oct–Apr" },
      "mid":  { "pricePerNight": 110, "minNights": 5, "label": { "pl": "Średni sezon", "en": "Mid season",  "es": "Temporada media", "de": "Zwischensaison" }, "months": "maj–cze / May–Jun" },
      "high": { "pricePerNight": 150, "minNights": 7, "label": { "pl": "Wysoki sezon", "en": "High season", "es": "Temporada alta",  "de": "Hochsaison"    }, "months": "lip–wrz / Jul–Sep" }
    }
  },
  "bookedDates": [],
  "reviews": { "score": 5.0, "count": 0, "items": [] },
  "map": {
    "embedUrl": "https://maps.google.com/maps?q=ENCODED_ADDRESS&output=embed&zoom=15",
    "nearby": [
      { "icon": "🏖️", "name": { "pl": "Plaża", "en": "Beach", "es": "Playa", "de": "Strand" }, "distance": "300 m" }
    ]
  },
  "contact": { "email": "...", "phone": "...", "instagram": "...", "facebook": "..." },
  "theme": { "primary": "#1A5276", "accent": "#E67E22" }
}

APARTMENT DATA:
Name: ${order.apartment_name}
Location: ${order.apartment_location}
Address: ${address}
Bedrooms: ${order.ob_bedrooms ?? '(nie podano)'}
Bathrooms: ${order.ob_bathrooms ?? '(nie podano)'}
Size: ${order.ob_sqm ?? '(nie podano)'} m²
Max guests: ${order.ob_max_guests ?? '(nie podano)'}
Description (Polish): ${order.ob_description ?? '(nie podano)'}
Tagline hint (Polish): ${order.ob_tagline ?? '(nie podano)'}
Amenities: ${order.ob_amenities ?? '(nie podano)'}
House rules: ${order.ob_rules ?? '(nie podano)'}
Check-in time: ${order.ob_checkin_time ?? '15:00'}
Check-out time: ${order.ob_checkout_time ?? '10:00'}
Contact email: ${order.ob_contact_email ?? order.email}
Contact phone: ${order.ob_contact_phone ?? order.phone ?? '(nie podano)'}
Instagram: ${order.ob_instagram ?? '(nie podano)'}
Facebook: ${order.ob_facebook ?? '(nie podano)'}
Preferred primary color: ${order.ob_color ?? '#1A5276'}
Base price per night: ${order.ob_price_per_night ?? '(nie podano)'} ${order.ob_currency?.toUpperCase() ?? 'EUR'}
Seasons pricing data:
${seasonsText}

INSTRUCTIONS:
1. description: Expand the Polish description to 3–5 engaging sentences. Translate faithfully to en, es, de.
2. tagline: Create a catchy 6–10 word phrase based on the tagline hint (or description if no hint). Translate to all 4 languages.
3. amenities: Convert the amenities list to objects with emoji icons and all 4 language labels. Add check-in/check-out times as extra items (e.g. icon "🔑", pl "Check-in od ${order.ob_checkin_time ?? '15:00'}"). Use these icon mappings: WiFi→📶, Klimatyzacja→❄️, Parking→🅿️, Basen→🏊, Balkon/Taras→🌅, Widok na morze→🌊, Kuchnia/Aneks→🍳, Zmywarka→🍽️, Pralka→👕, Smart TV→📺, Łóżeczko dziecięce→👶, Krzesełko→🍼, Winda→🛗, Ogród→🌿, Grill→🍖, Jacuzzi→🛁, Siłownia→💪, Rowerki→🚲, Zwierzęta→🐾, Samodzielny check-in→🔑.
4. pricing: If seasons data provided, map to low/mid/high tiers by price ascending. cleaningFee = ~50% of low-season price, rounded to nearest 10. If no seasons, derive low=base*0.75, mid=base, high=base*1.5 with minNights 3/5/7.
5. map.embedUrl: Use exact format https://maps.google.com/maps?q=${encodeURIComponent(address)}&output=embed&zoom=15 (replace the address with the actual encoded address).
6. map.nearby: Generate 4–5 realistic nearby attractions/services for this location with accurate distances.
7. contact: Use ob_contact fields. Omit instagram/facebook keys entirely if "(nie podano)".
8. theme.primary: Use the preferred primary color exactly. theme.accent: Choose a warm complementary accent (orange/amber/coral tones work well).
9. reviews/bookedDates/photos: Always output exactly [], [], and { "score": 5.0, "count": 0, "items": [] }.${order.revision_notes ? `

REVISION REQUEST (apply these changes to the previous version):
${order.revision_notes}

IMPORTANT: Apply ALL requested changes precisely. Do not change anything that was not mentioned.` : ''}`
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function generateSiteConfig(order: Order): Promise<ApartmentConfig> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set')

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 8000,
      system: 'You are a JSON generator for vacation apartment websites. Output ONLY valid JSON — no markdown, no code fences, no explanation. The output must be parseable by JSON.parse().',
      messages: [{ role: 'user', content: buildPrompt(order) }],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Anthropic API error ${res.status}: ${err}`)
  }

  const data = await res.json() as {
    content: Array<{ type: string; text: string }>
  }
  const raw = data.content[0]?.text ?? ''

  // Strip accidental markdown code fences if model adds them
  const jsonStr = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim()

  const config = JSON.parse(jsonStr) as ApartmentConfig

  // Always override these — never trust Claude for these fields
  config.slug = toSlug(order.apartment_name)
  config.photos = PLACEHOLDER_PHOTOS
  config.bookedDates = []
  config.reviews = { score: 5.0, count: 0, items: [] }

  return config
}
