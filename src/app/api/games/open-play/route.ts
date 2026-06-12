import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { courtId, slotId, date, startHour, endHour, skillLevel, maxPlayers, pricePerHead, title } =
    await request.json()

  if (!courtId || !date || !skillLevel || !maxPlayers) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (maxPlayers < 4 || maxPlayers > 8) {
    return NextResponse.json({ error: 'Capacity must be 4–8' }, { status: 400 })
  }

  // Verify caller owns this court
  const { data: court } = await supabase
    .from('courts')
    .select('id')
    .eq('id', courtId)
    .eq('owner_id', user.id)
    .single()

  if (!court) return NextResponse.json({ error: 'Court not found or unauthorized' }, { status: 403 })

  // Create the slot if one wasn't selected
  let targetSlotId = slotId as string | undefined
  if (!targetSlotId) {
    if (startHour == null || endHour == null) {
      return NextResponse.json({ error: 'startHour and endHour required when no slotId' }, { status: 400 })
    }
    const start = `${String(startHour).padStart(2, '0')}:00`
    const end = `${String(endHour).padStart(2, '0')}:00`
    const { data: newSlot, error: slotErr } = await supabase
      .from('slots')
      .insert({ court_id: courtId, date, start_time: start, end_time: end })
      .select()
      .single()
    if (slotErr) return NextResponse.json({ error: slotErr.message }, { status: 400 })
    targetSlotId = newSlot.id
  }

  // Atomically hold the slot
  const { error: holdErr } = await supabase.rpc('hold_slot', {
    p_slot_id: targetSlotId,
    p_user_id: user.id,
  })
  if (holdErr) return NextResponse.json({ error: holdErr.message }, { status: 400 })

  // Create the venue's own booking (amount=0 — no cost to the owner)
  const { data: booking, error: bookingErr } = await supabase
    .from('bookings')
    .insert({
      slot_id: targetSlotId,
      player_id: user.id,
      court_id: courtId,
      amount: 0,
      platform_fee: 0,
      payment_status: 'unpaid',
      payment_method: 'cash',
      booking_status: 'pending',
    })
    .select()
    .single()
  if (bookingErr) return NextResponse.json({ error: bookingErr.message }, { status: 400 })

  // Confirm the booking → marks slot 'booked'
  const { error: confirmErr } = await supabase.rpc('confirm_booking', {
    p_booking_id: booking.id,
    p_paymongo_payment_id: `owner-open-play-${booking.id}`,
  })
  if (confirmErr) return NextResponse.json({ error: confirmErr.message }, { status: 400 })

  // Create the game
  const gameTitle =
    title?.trim() ||
    `Open Play – ${new Date(date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}`

  const { data: game, error: gameErr } = await supabase
    .from('games')
    .insert({
      court_id: courtId,
      slot_id: targetSlotId,
      booking_id: booking.id,
      host_id: user.id,
      title: gameTitle,
      skill_level: skillLevel,
      max_players: maxPlayers,
      current_players: 0,
      host_type: 'owner',
      price_per_head: pricePerHead ?? 0,
      platform_fee_pct: 5.00,
      status: 'open',
    })
    .select()
    .single()
  if (gameErr) return NextResponse.json({ error: gameErr.message }, { status: 400 })

  return NextResponse.json({ game }, { status: 201 })
}
