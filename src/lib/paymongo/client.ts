const PAYMONGO_SECRET = process.env.PAYMONGO_SECRET_KEY!
const BASE_URL = 'https://api.paymongo.com/v1'
const PLATFORM_FEE_RATE = 0.10

function authHeader() {
  return 'Basic ' + Buffer.from(PAYMONGO_SECRET + ':').toString('base64')
}

// Prefix used in PayMongo `remarks` to route per-head game payments through the
// webhook's game branch. Booking payments keep a bare UUID in remarks.
export const GAME_PLAYER_REMARK_PREFIX = 'gp:'

export interface CreatePaymentLinkOptions {
  bookingId?: string      // for whole-court booking payments
  gamePlayerId?: string   // for per-head open-play / game payments
  amount?: number         // in PHP (booking path)
  amountCentavos?: number // exact centavos (game path — price_per_head is centavos)
  description: string
  currency?: string
}

export async function createPaymentLink(opts: CreatePaymentLinkOptions) {
  const amountCentavos = opts.amountCentavos ?? Math.round((opts.amount ?? 0) * 100)
  if (amountCentavos <= 0) {
    throw new Error('createPaymentLink: amount must be > 0')
  }

  // Route the webhook: game payments get a prefixed game_player_id, bookings get a bare UUID.
  const remarks = opts.gamePlayerId
    ? `${GAME_PLAYER_REMARK_PREFIX}${opts.gamePlayerId}`
    : opts.bookingId
  if (!remarks) {
    throw new Error('createPaymentLink: bookingId or gamePlayerId is required')
  }

  const res = await fetch(`${BASE_URL}/links`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader(),
    },
    body: JSON.stringify({
      data: {
        attributes: {
          amount: amountCentavos,
          currency: opts.currency ?? 'PHP',
          description: opts.description,
          remarks,
        },
      },
    }),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(`PayMongo error: ${JSON.stringify(err)}`)
  }

  const json = await res.json()
  return {
    id: json.data.id as string,
    checkoutUrl: json.data.attributes.checkout_url as string,
  }
}

export function calculateFees(hourlyRate: number, hours: number) {
  const subtotal = hourlyRate * hours
  const platformFee = Math.round(subtotal * PLATFORM_FEE_RATE * 100) / 100
  return { subtotal, platformFee, total: subtotal }
}

export async function verifyWebhookSignature(
  payload: string,
  sigHeader: string
): Promise<boolean> {
  const webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET!
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(webhookSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  )
  const sig = Buffer.from(sigHeader, 'hex')
  return crypto.subtle.verify('HMAC', key, sig, encoder.encode(payload))
}
