import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyWebhookSignature } from '@/lib/paymongo/client'
import { sendBookingConfirmation } from '@/lib/resend/emails'

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

  // BUG-005 FIX: PayMongo payment links store bookingId in `remarks`
  // Match booking via the remarks field we set when creating the link
  const bookingId = paymentData.attributes?.remarks
    ?? paymentData.attributes?.description?.match(/[0-9a-f-]{36}/)?.[0]

  // Fallback: try paymongo_link_id via reference_number or source id
  const linkId = paymentData.attributes?.payment_intent_id
    ?? paymentData.attributes?.source?.id
    ?? paymentData.attributes?.payment_method_used?.id

  // BUG-001 FIX: use service-role client — webhook has no auth session, RLS would block
  const supabase = createAdminClient()

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
