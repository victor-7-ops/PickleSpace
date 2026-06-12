import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/games/[id]/players/[playerId]/kick
// [playerId] is the target player's user id (not game_players.id).
// Callable by the game host or venue owner (enforced inside the RPC).
// Serves both "kick joined player" and "reject pending request" use cases.
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string; playerId: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase.rpc('host_remove_player', {
    p_game_id: params.id,
    p_player_id: params.playerId,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: error.message.includes('Only the host') ? 403 : 400 })
  }

  return NextResponse.json({ success: true })
}
