import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendGamePromotion } from '@/lib/resend/emails'

// POST /api/games/[id]/leave
//
// Uses the atomic leave_game RPC: enforces the 2-hour cutoff, marks the caller 'left'
// (paid rows → 'refund_due' for manual handling), and promotes the earliest waitlisted
// player when a 'joined' spot opens on a full game. Emails the promoted player.
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: game } = await supabase
    .from('games')
    .select('id, host_id')
    .eq('id', params.id)
    .single()

  if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 })
  if (game.host_id === user.id) {
    return NextResponse.json({ error: 'Host cannot leave — cancel the game instead' }, { status: 400 })
  }

  const { data: result, error } = await supabase.rpc('leave_game', { p_game_id: params.id })
  if (error) {
    // e.g. '2-hour cutoff', 'not an active participant'
    return NextResponse.json({ error: error.message }, { status: 409 })
  }

  // Notify a promoted waitlisted player, if any
  const promotedPlayerId = result?.promoted_player_id as string | null
  if (promotedPlayerId) {
    try {
      const admin = createAdminClient()
      const { data: promoted } = await admin
        .from('users')
        .select('email, name')
        .eq('id', promotedPlayerId)
        .single()
      const { data: gameInfo } = await admin
        .from('games')
        .select('title, price_per_head, court:courts(name), slot:slots(date, start_time)')
        .eq('id', params.id)
        .single()

      if (promoted && gameInfo) {
        await sendGamePromotion({
          to: promoted.email,
          playerName: promoted.name,
          gameTitle: gameInfo.title,
          courtName: (gameInfo.court as { name?: string } | null)?.name ?? 'the court',
          date: (gameInfo.slot as { date?: string } | null)?.date ?? '',
          startTime: (gameInfo.slot as { start_time?: string } | null)?.start_time ?? '',
          pricePerHead: gameInfo.price_per_head ?? 0,
          gameId: params.id,
        })
      }
    } catch (emailErr) {
      console.error('[leave] promotion email failed (non-fatal):', emailErr)
    }
  }

  return NextResponse.json({ success: true, promotedPlayerId: promotedPlayerId ?? null })
}
