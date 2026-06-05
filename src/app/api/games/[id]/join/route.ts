import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Read game first for validation (host check, status check)
  const { data: game } = await supabase
    .from('games')
    .select('id, status, max_players, host_id, current_players')
    .eq('id', params.id)
    .single()

  if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 })
  if (game.status !== 'open') {
    return NextResponse.json({ error: `Game is ${game.status}` }, { status: 409 })
  }
  if (game.host_id === user.id) {
    return NextResponse.json({ error: 'You are already the host' }, { status: 409 })
  }

  const { data: existing } = await supabase
    .from('game_players')
    .select('id')
    .eq('game_id', params.id)
    .eq('player_id', user.id)
    .single()

  if (existing) return NextResponse.json({ error: 'Already joined' }, { status: 409 })

  // BUG-004 FIX: Atomic increment — use conditional UPDATE that only succeeds if
  // current_players < max_players, preventing race conditions
  const { data: updated, error: updateError } = await supabase
    .from('games')
    .update({
      current_players: game.current_players + 1,
    })
    .eq('id', params.id)
    .eq('current_players', game.current_players)  // optimistic lock — fails if changed
    .lt('current_players', game.max_players)       // only if not full
    .eq('status', 'open')                          // only if still open
    .select('current_players, max_players')
    .single()

  if (updateError || !updated) {
    return NextResponse.json({ error: 'Game is full or no longer available' }, { status: 409 })
  }

  // Insert player — unique constraint prevents double-join
  const { error: insertError } = await supabase
    .from('game_players')
    .insert({ game_id: params.id, player_id: user.id, status: 'joined' })

  if (insertError) {
    // Rollback the count increment
    await supabase
      .from('games')
      .update({ current_players: game.current_players })
      .eq('id', params.id)
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  // Mark full if needed
  if (updated.current_players >= updated.max_players) {
    await supabase.from('games').update({ status: 'full' }).eq('id', params.id)
  }

  return NextResponse.json({ success: true, current_players: updated.current_players })
}
