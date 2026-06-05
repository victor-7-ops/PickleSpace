import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createPaymentLink, calculateFees } from '@/lib/paymongo/client'

// POST /api/bookings  { slotId, paymentMethod, notes? }
// courtId and hours are derived server-side — never trust the client for pricing
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { slotId, paymentMethod, notes } = await req.json()

  if (!slotId || !paymentMethod) {
    return NextResponse.json({ error: 'slotId and paymentMethod are required' }, { status: 400 })
  }

  // BUG-009 FIX: Verify slot is held by this user
  // BUG-003 FIX: Fetch court_id FROM the slot — never trust client-supplied courtId
  const { data: slot } = await supabase
    .from('slots')
    .select('id, court_id, date, start_time, end_time, status, held_by')
    .eq('id', slotId)
    .single()

  if (!slot) {
    return NextResponse.json({ error: 'Slot not found' }, { status: 404 })
  }

  if (slot.status !== 'held') {
    return NextResponse.json({ error: 'Slot is no longer held — please select again' }, { status: 409 })
  }

  if (slot.held_by !== user.id) {
    return NextResponse.json({ error: 'This slot is held by another user' }, { status: 409 })
  }

  // BUG-002 FIX: Calculate hours server-side from actual slot times — never trust client
  const [startH, startM] = slot.start_time.split(':').map(Number)
  const [endH, endM] = slot.end_time.split(':').map(Number)
  const hours = (endH * 60 + endM - startH * 60 - startM) / 60

  if (hours <= 0) {
    return NextResponse.json({ error: 'Invalid slot time range' }, { status: 400 })
  }

  // Fetch court rate from the slot's actual court (server-side, not client-supplied)
  const { data: court } = await supabase
    .from('courts')
    .select('hourly_rate, name')
    .eq('id', slot.court_id)
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
      court_id: slot.court_id,   // from slot, not client
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

  // Create PayMongo payment link — store bookingId in remarks for webhook lookup
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
