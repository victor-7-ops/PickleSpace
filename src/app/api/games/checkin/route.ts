import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Owner scans a game player's QR code (which is the game_players.id)
// Marks player 'attended'; also marks cash payment as paid.
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { gamePlayerId } = await request.json()
  if (!gamePlayerId) return NextResponse.json({ error: 'gamePlayerId required' }, { status: 400 })

  // Verify this game belongs to a court the caller owns
  const { data: gp } = await supabase
    .from('game_players')
    .select('id, status, payment_status, payment_method, game_id, games(court_id, courts(owner_id))')
    .eq('id', gamePlayerId)
    .single() as {
      data: {
        id: string; status: string; payment_status: string; payment_method: string | null;
        game_id: string; games: { courts: { owner_id: string }[] }[] | null
      } | null
    }

  if (!gp) return NextResponse.json({ error: 'Player not found' }, { status: 404 })

  const courtOwner = gp.games?.[0]?.courts?.[0]?.owner_id

  if (courtOwner !== user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  if (gp.status === 'attended') {
    return NextResponse.json({ message: 'Already checked in' })
  }
  if (!['joined'].includes(gp.status)) {
    return NextResponse.json({ error: `Cannot check in player with status: ${gp.status}` }, { status: 400 })
  }

  const updates: Record<string, string> = { status: 'attended' }
  // Cash players get marked paid on check-in
  if (gp.payment_method === 'cash' && gp.payment_status === 'unpaid') {
    updates.payment_status = 'paid'
  }

  await supabase.from('game_players').update(updates).eq('id', gamePlayerId)

  return NextResponse.json({ success: true })
}
