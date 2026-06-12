import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createPaymentLink } from '@/lib/paymongo/client'
import { sendHostJoinRequest } from '@/lib/resend/emails'

// POST /api/games/[id]/join  { paymentMethod: 'gcash' | 'card' | 'cash' }
//
// Uses the atomic join_game RPC (race-safe: SELECT FOR UPDATE on the game row).
// For paid card/gcash joins, creates a per-head PayMongo link and returns checkoutUrl.
// Cash and free joins are confirmed immediately (payment handled at check-in).
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { paymentMethod } = await req.json().catch(() => ({}))
  if (!paymentMethod || !['gcash', 'card', 'cash'].includes(paymentMethod)) {
    return NextResponse.json({ error: 'A valid paymentMethod is required' }, { status: 400 })
  }

  // Fetch game for host guard + PayMongo description (court name)
  const { data: game } = await supabase
    .from('games')
    .select('id, host_id, host_type, title, auto_join, court:courts(name)')
    .eq('id', params.id)
    .single()

  if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 })
  if (game.host_id === user.id) {
    return NextResponse.json({ error: 'You are the host of this game' }, { status: 409 })
  }

  // auto_join=false: insert a join request (waitlisted) and email the host for approval
  const autoJoin = (game as { auto_join?: boolean }).auto_join ?? true
  if (!autoJoin) {
    const { data: existing } = await supabase
      .from('game_players')
      .select('id, status')
      .eq('game_id', params.id)
      .eq('player_id', user.id)
      .neq('status', 'left')
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'You already have a pending request or are in this game' }, { status: 409 })
    }

    const { data: gpRow, error: gpError } = await supabase
      .from('game_players')
      .insert({ game_id: params.id, player_id: user.id, status: 'waitlisted', payment_status: 'unpaid', payment_method: paymentMethod })
      .select('id')
      .single()

    if (gpError) return NextResponse.json({ error: gpError.message }, { status: 500 })

    // Email host (non-fatal)
    try {
      const [{ data: host }, { data: requester }] = await Promise.all([
        supabase.from('users').select('email, name').eq('id', game.host_id).single(),
        supabase.from('users').select('name').eq('id', user.id).single(),
      ])
      if (host?.email) {
        await sendHostJoinRequest({
          to: host.email,
          hostName: (host as { name?: string }).name ?? 'Host',
          requesterName: (requester as { name?: string } | null)?.name ?? 'A player',
          gameTitle: game.title,
          gameId: params.id,
        })
      }
    } catch { /* non-fatal */ }

    return NextResponse.json({ success: true, status: 'waitlisted', gamePlayerId: gpRow.id, checkoutUrl: null, pendingApproval: true })
  }

  // Atomic join — RPC assigns 'joined' or 'waitlisted', flips game to 'full' at capacity,
  // and raises if the caller is already in the game or the game is closed.
  const { data: result, error: joinError } = await supabase.rpc('join_game', {
    p_game_id: params.id,
    p_payment_method: paymentMethod,
  })

  if (joinError) {
    // RPC raises human-readable messages (e.g. 'You are already in this game')
    return NextResponse.json({ error: joinError.message }, { status: 409 })
  }

  const gamePlayerId = result.game_player_id as string
  const assignedStatus = result.status as 'joined' | 'waitlisted'
  const requiresPayment = result.requires_payment as boolean
  const pricePerHead = result.price_per_head as number // centavos

  // Free game, cash payment, or waitlisted → no PayMongo link now
  if (!requiresPayment) {
    return NextResponse.json({
      success: true,
      status: assignedStatus,
      gamePlayerId,
      checkoutUrl: null,
    })
  }

  // Paid card/gcash join → create per-head PayMongo link
  const courtName = (game.court as { name?: string } | null)?.name ?? 'PickleSpace'
  try {
    const { id: linkId, checkoutUrl } = await createPaymentLink({
      gamePlayerId,
      amountCentavos: pricePerHead,
      description: `${game.title} — ${courtName}`,
    })

    // Store the link reference so the webhook can fall back to it if remarks are missing
    await supabase
      .from('game_players')
      .update({ paymongo_reference: linkId })
      .eq('id', gamePlayerId)

    return NextResponse.json({
      success: true,
      status: assignedStatus,
      gamePlayerId,
      checkoutUrl,
    })
  } catch (err) {
    // PayMongo failed — release the pending spot so it doesn't dangle until the cron.
    // Best-effort: leave_game enforces a 2h cutoff, so within 2h of start the row
    // simply stays 'pending' and the 10-min cron reclaims it.
    try {
      await supabase.rpc('leave_game', { p_game_id: params.id })
    } catch { /* non-fatal — cron will reclaim */ }
    const message = err instanceof Error ? err.message : 'Payment link creation failed'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
