import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Owner marks a session complete:
// - game → 'completed'
// - 'joined' players → 'no_show'
// - 'attended' players get games_played + 1
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: game } = await supabase
    .from('games')
    .select('id, status, host_id, court_id, courts(owner_id)')
    .eq('id', params.id)
    .single() as { data: { id: string; status: string; host_id: string; court_id: string; courts: { owner_id: string }[] } | null }

  if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 })

  const courtOwner = game.courts?.[0]?.owner_id
  if (courtOwner !== user.id && game.host_id !== user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  if (game.status === 'completed' || game.status === 'cancelled') {
    return NextResponse.json({ error: `Game is already ${game.status}` }, { status: 400 })
  }

  // Mark game completed
  await supabase.from('games').update({ status: 'completed' }).eq('id', params.id)

  // joined → no_show
  await supabase
    .from('game_players')
    .update({ status: 'no_show' })
    .eq('game_id', params.id)
    .eq('status', 'joined')

  // attended → increment games_played
  const { data: attended } = await supabase
    .from('game_players')
    .select('player_id')
    .eq('game_id', params.id)
    .eq('status', 'attended')

  if (attended && attended.length > 0) {
    const attendedIds = attended.map(p => p.player_id)
    // Increment one by one (Supabase doesn't support bulk increment via RLS)
    await Promise.all(
      attendedIds.map(playerId =>
        supabase.rpc('increment_games_played', { p_user_id: playerId })
      )
    )
  }

  return NextResponse.json({ success: true })
}
