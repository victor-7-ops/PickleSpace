import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createPaymentLink } from '@/lib/paymongo/client'
import { sendPlayerApproved } from '@/lib/resend/emails'

// POST /api/games/[id]/approve  { playerId }
// Host approves a pending join request (auto_join=false game).
// For paid games: creates a per-head PayMongo link and emails the player.
// For cash/free games: marks 'joined' immediately and emails the player.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { playerId } = await req.json().catch(() => ({}))
  if (!playerId) return NextResponse.json({ error: 'playerId is required' }, { status: 400 })

  // Load game and verify caller is the host
  const { data: game } = await supabase
    .from('games')
    .select('id, host_id, title, max_players, current_players, price_per_head, status, court:courts(name), slot:slots(date, start_time, end_time)')
    .eq('id', params.id)
    .single()

  if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 })
  if (game.host_id !== user.id) {
    return NextResponse.json({ error: 'Only the host can approve join requests' }, { status: 403 })
  }
  if (game.status === 'cancelled' || game.status === 'completed') {
    return NextResponse.json({ error: 'Game is no longer active' }, { status: 409 })
  }

  // Find the waitlisted row for this player
  const { data: gp } = await supabase
    .from('game_players')
    .select('id, payment_method, payment_status')
    .eq('game_id', params.id)
    .eq('player_id', playerId)
    .eq('status', 'waitlisted')
    .single()

  if (!gp) {
    return NextResponse.json({ error: 'No pending request from this player' }, { status: 404 })
  }

  // Guard capacity
  if (game.current_players >= game.max_players) {
    return NextResponse.json({ error: 'Game is full — cannot approve more players' }, { status: 409 })
  }

  const pricePerHead = Number(game.price_per_head) // centavos
  const paymentMethod = gp.payment_method as string | null
  const needsPayment = pricePerHead > 0 && paymentMethod !== 'cash'

  // Fetch player contact for email
  const { data: player } = await supabase
    .from('users')
    .select('email, name')
    .eq('id', playerId)
    .single()

  if (needsPayment) {
    // Create per-head PayMongo link; player pays before spot is confirmed
    const court = Array.isArray(game.court) ? game.court[0] : game.court
    try {
      const { id: linkId, checkoutUrl } = await createPaymentLink({
        gamePlayerId: gp.id,
        amountCentavos: pricePerHead,
        description: `${game.title} — ${(court as { name?: string } | null)?.name ?? 'PickleSpace'}`,
      })

      await supabase
        .from('game_players')
        .update({ status: 'joined', payment_status: 'pending', paymongo_reference: linkId })
        .eq('id', gp.id)

      await supabase
        .from('games')
        .update({ current_players: game.current_players + 1 })
        .eq('id', params.id)

      // Email player with checkout URL
      try {
        const slot = Array.isArray(game.slot) ? game.slot[0] : game.slot
        if (player?.email) {
          await sendPlayerApproved({
            to: (player as { email: string }).email,
            playerName: (player as { name?: string }).name ?? 'Player',
            gameTitle: game.title,
            courtName: (court as { name?: string } | null)?.name ?? 'the court',
            date: (slot as { date?: string } | null)?.date ?? '',
            startTime: (slot as { start_time?: string } | null)?.start_time ?? '',
            checkoutUrl,
            pricePerHead: pricePerHead / 100,
          })
        }
      } catch { /* non-fatal */ }

      return NextResponse.json({ success: true, checkoutUrl })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Payment link creation failed'
      return NextResponse.json({ error: message }, { status: 502 })
    }
  }

  // Cash or free — approve immediately
  await supabase
    .from('game_players')
    .update({ status: 'joined' })
    .eq('id', gp.id)

  await supabase
    .from('games')
    .update({ current_players: game.current_players + 1 })
    .eq('id', params.id)

  try {
    const slot = Array.isArray(game.slot) ? game.slot[0] : game.slot
    const court = Array.isArray(game.court) ? game.court[0] : game.court
    if (player?.email) {
      await sendPlayerApproved({
        to: (player as { email: string }).email,
        playerName: (player as { name?: string }).name ?? 'Player',
        gameTitle: game.title,
        courtName: (court as { name?: string } | null)?.name ?? 'the court',
        date: (slot as { date?: string } | null)?.date ?? '',
        startTime: (slot as { start_time?: string } | null)?.start_time ?? '',
      })
    }
  } catch { /* non-fatal */ }

  return NextResponse.json({ success: true })
}
