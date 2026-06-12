import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(
  _req: Request,
  { params }: { params: { id: string; playerId: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: gp } = await supabase
    .from('game_players')
    .select('id, payment_status, payment_method, game_id, games(court_id, courts(owner_id))')
    .eq('id', params.playerId)
    .eq('game_id', params.id)
    .single() as {
      data: {
        id: string; payment_status: string; payment_method: string | null;
        game_id: string; games: { courts: { owner_id: string }[] }[] | null
      } | null
    }

  if (!gp) return NextResponse.json({ error: 'Player not found' }, { status: 404 })

  const courtOwner = gp.games?.[0]?.courts?.[0]?.owner_id
  if (courtOwner !== user.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  if (gp.payment_method !== 'cash') {
    return NextResponse.json({ error: 'Only cash payments can be manually marked paid' }, { status: 400 })
  }

  await supabase
    .from('game_players')
    .update({ payment_status: 'paid' })
    .eq('id', params.playerId)

  return NextResponse.json({ success: true })
}
