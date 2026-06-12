import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyWebhookSignature, GAME_PLAYER_REMARK_PREFIX } from '@/lib/paymongo/client'
import { sendBookingConfirmation, sendGamePlayerConfirmation } from '@/lib/resend/emails'

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const sig = req.headers.get('paymongo-signature') ?? ''

  const isValid = await verifyWebhookSignature(rawBody, sig)
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const event = JSON.parse(rawBody)
  if (event.data?.attributes?.type !== 'payment.paid') {
    return NextResponse.json({ received: true })
  }

  const paymentData = event.data.attributes.data
  const paymongoPaymentId = paymentData.id
  const remarks: string = paymentData.attributes?.remarks ?? ''

  // BUG-001 FIX: use service-role client — webhook has no auth session, RLS would block
  const supabase = createAdminClient()

  // Fallback link id (shared by both branches)
  const linkId = paymentData.attributes?.payment_intent_id
    ?? paymentData.attributes?.source?.id
    ?? paymentData.attributes?.payment_method_used?.id

  // ── Branch: per-head game payment ──────────────────────────────
  // Open-play / game joins set remarks to `gp:<game_player_id>`.
  if (remarks.startsWith(GAME_PLAYER_REMARK_PREFIX)) {
    return handleGamePayment(supabase, {
      gamePlayerId: remarks.slice(GAME_PLAYER_REMARK_PREFIX.length),
      linkId,
      amountCentavos: paymentData.attributes?.amount ?? 0,
    })
  }

  // ── Booking path (existing — unchanged) ────────────────────────
  // BUG-005 FIX: PayMongo payment links store bookingId in `remarks`
  // Match booking via the remarks field we set when creating the link
  const bookingId = remarks
    || paymentData.attributes?.description?.match(/[0-9a-f-]{36}/)?.[0]

  // Try to find booking by bookingId first (most reliable), then by linkId
  let booking = null

  if (bookingId) {
    const { data } = await supabase
      .from('bookings')
      .select('*, player:users(*), court:courts(*), slot:slots(*)')
      .eq('id', bookingId)
      .single()
    booking = data
  }

  if (!booking && linkId) {
    const { data } = await supabase
      .from('bookings')
      .select('*, player:users(*), court:courts(*), slot:slots(*)')
      .eq('paymongo_link_id', linkId)
      .single()
    booking = data
  }

  if (!booking) {
    console.error('[webhook] Booking not found. bookingId:', bookingId, 'linkId:', linkId)
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  // Confirm via stored procedure (atomic)
  const { error } = await supabase
    .rpc('confirm_booking', {
      p_booking_id: booking.id,
      p_paymongo_payment_id: paymongoPaymentId,
    })

  if (error) {
    console.error('[webhook] confirm_booking error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Send confirmation email
  try {
    await sendBookingConfirmation({
      to: booking.player.email,
      playerName: booking.player.name,
      courtName: booking.court.name,
      date: booking.slot.date,
      startTime: booking.slot.start_time,
      endTime: booking.slot.end_time,
      amount: booking.amount,
      qrCode: booking.qr_code,
      bookingId: booking.id,
    })
  } catch (emailErr) {
    console.error('[webhook] email failed (non-fatal):', emailErr)
  }

  return NextResponse.json({ received: true })
}

// ── Per-head game payment handler ────────────────────────────────
// Marks the game_players row 'paid' and emails the player their per-head QR
// (the QR is the game_players row id, scanned by the owner at check-in).
async function handleGamePayment(
  supabase: ReturnType<typeof createAdminClient>,
  opts: { gamePlayerId: string; linkId?: string; amountCentavos: number }
) {
  interface GamePlayerRow {
    id: string
    status: string
    payment_status: string
    player: { email?: string; name?: string } | null
    game: {
      title?: string
      court?: { name?: string } | null
      slot?: { date?: string; start_time?: string; end_time?: string } | null
    } | null
  }

  const selectCols =
    'id, status, payment_status, player:users(email, name), ' +
    'game:games(title, court:courts(name), slot:slots(date, start_time, end_time))'

  // Look up by id first; fall back to the stored PayMongo link reference
  let gp = (await supabase
    .from('game_players')
    .select(selectCols)
    .eq('id', opts.gamePlayerId)
    .single()).data as GamePlayerRow | null

  if (!gp && opts.linkId) {
    gp = (await supabase
      .from('game_players')
      .select(selectCols)
      .eq('paymongo_reference', opts.linkId)
      .single()).data as GamePlayerRow | null
  }

  if (!gp) {
    console.error('[webhook] game_player not found. gamePlayerId:', opts.gamePlayerId, 'linkId:', opts.linkId)
    return NextResponse.json({ error: 'Game player not found' }, { status: 404 })
  }

  // Idempotency — webhooks can be redelivered
  if (gp.payment_status === 'paid') {
    return NextResponse.json({ received: true })
  }

  const { error } = await supabase
    .from('game_players')
    .update({ payment_status: 'paid' })
    .eq('id', gp.id)
    .neq('payment_status', 'paid')

  if (error) {
    console.error('[webhook] game payment update error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Send per-head confirmation with QR (non-fatal on failure)
  try {
    const { game, player } = gp
    if (player?.email) {
      await sendGamePlayerConfirmation({
        to: player.email,
        playerName: player.name ?? 'Player',
        gameTitle: game?.title ?? 'Open Play',
        courtName: game?.court?.name ?? 'the court',
        date: game?.slot?.date ?? '',
        startTime: game?.slot?.start_time ?? '',
        endTime: game?.slot?.end_time ?? '',
        amount: opts.amountCentavos / 100,
        qrCode: gp.id,
      })
    }
  } catch (emailErr) {
    console.error('[webhook] game confirmation email failed (non-fatal):', emailErr)
  }

  return NextResponse.json({ received: true })
}
