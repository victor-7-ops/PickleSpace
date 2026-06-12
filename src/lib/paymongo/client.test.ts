import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createPaymentLink, GAME_PLAYER_REMARK_PREFIX } from './client'

// These tests lock the webhook routing contract: PayMongo `remarks` is the single
// field the webhook branches on. Booking payments MUST keep a bare UUID in remarks
// (existing path), and game payments MUST carry the `gp:` prefix. If this invariant
// breaks, the webhook misroutes payments — exactly the regression Step 26 guards against.

const BOOKING_ID = '11111111-1111-4111-8111-111111111111'
const GAME_PLAYER_ID = '22222222-2222-4222-8222-222222222222'

function mockFetchOk() {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      data: { id: 'link_abc', attributes: { checkout_url: 'https://pay.test/abc' } },
    }),
  })
}

function lastFetchBody(fetchMock: ReturnType<typeof vi.fn>) {
  const [, init] = fetchMock.mock.calls[0]
  return JSON.parse(init.body).data.attributes
}

describe('createPaymentLink — webhook routing contract', () => {
  beforeEach(() => { vi.stubGlobal('fetch', mockFetchOk()) })
  afterEach(() => { vi.unstubAllGlobals() })

  it('booking payment encodes a bare UUID in remarks (existing path unchanged)', async () => {
    await createPaymentLink({ bookingId: BOOKING_ID, amount: 500, description: 'Court A' })
    const attrs = lastFetchBody(fetch as unknown as ReturnType<typeof vi.fn>)

    expect(attrs.remarks).toBe(BOOKING_ID)
    expect(attrs.remarks.startsWith(GAME_PLAYER_REMARK_PREFIX)).toBe(false)
    expect(attrs.amount).toBe(50000) // 500 PHP → centavos
  })

  it('game payment encodes the gp: prefix so the webhook takes the game branch', async () => {
    await createPaymentLink({
      gamePlayerId: GAME_PLAYER_ID,
      amountCentavos: 15000,
      description: 'Open Play',
    })
    const attrs = lastFetchBody(fetch as unknown as ReturnType<typeof vi.fn>)

    expect(attrs.remarks).toBe(`${GAME_PLAYER_REMARK_PREFIX}${GAME_PLAYER_ID}`)
    expect(attrs.remarks.startsWith(GAME_PLAYER_REMARK_PREFIX)).toBe(true)
    expect(attrs.amount).toBe(15000) // exact centavos, no float round-trip
  })

  it('rejects a zero / negative amount', async () => {
    await expect(
      createPaymentLink({ bookingId: BOOKING_ID, amount: 0, description: 'x' })
    ).rejects.toThrow(/amount must be > 0/)
  })

  it('rejects when neither bookingId nor gamePlayerId is given', async () => {
    await expect(
      createPaymentLink({ amountCentavos: 100, description: 'x' })
    ).rejects.toThrow(/bookingId or gamePlayerId is required/)
  })
})

describe('webhook branch predicate', () => {
  // Mirrors the check in api/payments/webhook/route.ts
  const isGamePayment = (remarks: string) => remarks.startsWith(GAME_PLAYER_REMARK_PREFIX)

  it('routes a bare booking UUID to the booking path', () => {
    expect(isGamePayment(BOOKING_ID)).toBe(false)
  })

  it('routes a gp:-prefixed remark to the game path', () => {
    expect(isGamePayment(`${GAME_PLAYER_REMARK_PREFIX}${GAME_PLAYER_ID}`)).toBe(true)
  })

  it('treats empty remarks as a booking (falls through to description match)', () => {
    expect(isGamePayment('')).toBe(false)
  })
})
