import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: game } = await supabase
    .from('games')
    .select('id, host_id, current_players')
    .eq('id', params.id)
    .single()

  if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 })

  if (game.host_id === user.id) {
    return NextResponse.json({ error: 'Host cannot leave — cancel the game instead' }, { status: 400 })
  }

  const { error: deleteError } = await supabase
    .from('game_players')
    .delete()
    .eq('game_id', params.id)
    .eq('player_id', user.id)

  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })

  const newCount = Math.max(0, game.current_players - 1)
  await supabase
    .from('games')
    .update({ current_players: newCount, status: 'open' })
    .eq('id', params.id)

  return NextResponse.json({ success: true, current_players: newCount })
}
