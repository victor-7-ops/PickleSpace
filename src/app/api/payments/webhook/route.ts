import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
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
  const linkId = paymentData.attributes.payment_intent_id ?? paymentData.attributes.source?.id

  const supabase = await createClient()

  // Find booking by paymongo_link_id
  const { data: booking } = await supabase
    .from('bookings')
    .select('*, player:users(*), court:courts(*), slot:slots(*)')
    .eq('paymongo_link_id', linkId)
    .single()

  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  // Confirm via stored procedure (atomic)
  const { error } = await supabase
    .rpc('confirm_booking', {
      p_booking_id: booking.id,
      p_paymongo_payment_id: paymongoPaymentId,
    })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Send confirmation email
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

  return NextResponse.json({ received: true })
}
