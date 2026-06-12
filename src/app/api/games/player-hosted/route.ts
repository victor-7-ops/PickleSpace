import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { SkillLevel } from '@/types'

// POST /api/games/player-hosted
// Creates a player-hosted game from an existing confirmed booking.
// price_per_head is auto-calculated as booking.amount / capacity (PHP → centavos).
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { bookingId, skillLevel, capacity, autoJoin = true, title, description } = body as {
    bookingId?: string
    skillLevel?: SkillLevel
    capacity?: number
    autoJoin?: boolean
    title?: string
    description?: string
  }

  if (!bookingId) return NextResponse.json({ error: 'bookingId is required' }, { status: 400 })
  if (!skillLevel || !['beginner', 'intermediate', 'advanced', 'open'].includes(skillLevel)) {
    return NextResponse.json({ error: 'A valid skillLevel is required' }, { status: 400 })
  }
  if (!capacity || capacity < 2 || capacity > 8) {
    return NextResponse.json({ error: 'Capacity must be between 2 and 8' }, { status: 400 })
  }

  // Verify booking belongs to caller and is confirmed
  const { data: booking } = await supabase
    .from('bookings')
    .select('id, court_id, slot_id, amount, booking_status, player_id')
    .eq('id', bookingId)
    .eq('player_id', user.id)
    .single()

  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  if (booking.booking_status !== 'confirmed') {
    return NextResponse.json({ error: 'Booking must be confirmed before opening a game' }, { status: 409 })
  }

  // Guard: no duplicate game for this booking
  const { data: existing } = await supabase
    .from('games')
    .select('id')
    .eq('booking_id', bookingId)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'A game is already linked to this booking', gameId: existing.id }, { status: 409 })
  }

  // price_per_head: booking.amount is in PHP; convert to centavos then divide by capacity
  const pricePerHead = Math.round((Number(booking.amount) * 100) / capacity)

  // Derive title from court + slot if caller didn't supply one
  const gameTitle = title?.trim() || 'Open Play'

  const { data: game, error } = await supabase
    .from('games')
    .insert({
      court_id: booking.court_id,
      slot_id: booking.slot_id,
      booking_id: bookingId,
      host_id: user.id,
      title: gameTitle,
      description: description?.trim() || null,
      skill_level: skillLevel,
      max_players: capacity,
      current_players: 0,
      status: 'open',
      host_type: 'player',
      price_per_head: pricePerHead,
      platform_fee_pct: 0.00,
      visibility: 'public',
      auto_join: autoJoin,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[player-hosted] insert error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ gameId: game.id }, { status: 201 })
}
