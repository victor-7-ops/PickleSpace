import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createPaymentLink, calculateFees } from '@/lib/paymongo/client'

// POST /api/bookings  { slotId, courtId, hours, paymentMethod, notes? }
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { slotId, courtId, hours, paymentMethod, notes } = await req.json()

  // Fetch court for rate
  const { data: court } = await supabase
    .from('courts')
    .select('hourly_rate, name')
    .eq('id', courtId)
    .single()

  if (!court) {
    return NextResponse.json({ error: 'Court not found' }, { status: 404 })
  }

  const { subtotal, platformFee } = calculateFees(court.hourly_rate, hours)

  // Create booking record (pending)
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .insert({
      slot_id: slotId,
      player_id: user.id,
      court_id: courtId,
      amount: subtotal,
      platform_fee: platformFee,
      payment_method: paymentMethod,
      notes,
    })
    .select()
    .single()

  if (bookingError || !booking) {
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 })
  }

  // Cash bookings skip PayMongo
  if (paymentMethod === 'cash') {
    return NextResponse.json({ booking, checkoutUrl: null })
  }

  // Create PayMongo payment link
  const { id: linkId, checkoutUrl } = await createPaymentLink({
    bookingId: booking.id,
    amount: subtotal,
    description: `PickleSpace — ${court.name}`,
  })

  // Attach link ID to booking
  await supabase
    .from('bookings')
    .update({ paymongo_link_id: linkId })
    .eq('id', booking.id)

  return NextResponse.json({ booking: { ...booking, paymongo_link_id: linkId }, checkoutUrl })
}
