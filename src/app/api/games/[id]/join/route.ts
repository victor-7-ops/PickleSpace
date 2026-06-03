import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: game } = await supabase
    .from('games')
    .select('id, status, max_players, host_id, current_players')
    .eq('id', params.id)
    .single()

  if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 })
  if (game.status !== 'open') {
    return NextResponse.json({ error: `Game is ${game.status}` }, { status: 409 })
  }
  if (game.current_players >= game.max_players) {
    return NextResponse.json({ error: 'Game is full' }, { status: 409 })
  }

  const { data: existing } = await supabase
    .from('game_players')
    .select('id')
    .eq('game_id', params.id)
    .eq('player_id', user.id)
    .single()

  if (existing) return NextResponse.json({ error: 'Already joined' }, { status: 409 })

  const { error: insertError } = await supabase
    .from('game_players')
    .insert({ game_id: params.id, player_id: user.id, status: 'joined' })

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

  const newCount = game.current_players + 1
  const newStatus = newCount >= game.max_players ? 'full' : 'open'
  await supabase
    .from('games')
    .update({ current_players: newCount, status: newStatus })
    .eq('id', params.id)

  return NextResponse.json({ success: true, current_players: newCount })
}
