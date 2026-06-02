import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/games?courtId=&status=open&skillLevel=
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = req.nextUrl

  let query = supabase
    .from('games')
    .select('*, court:courts(name,city), host:users(name,avatar_url,skill_level), game_players(count)')
    .order('created_at', { ascending: false })

  const status = searchParams.get('status')
  if (status) query = query.eq('status', status)

  const courtId = searchParams.get('courtId')
  if (courtId) query = query.eq('court_id', courtId)

  const skillLevel = searchParams.get('skillLevel')
  if (skillLevel && skillLevel !== 'open') query = query.eq('skill_level', skillLevel)

  const { data, error } = await query.limit(50)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ games: data })
}

// POST /api/games  { courtId, slotId?, title, description?, skillLevel, maxPlayers }
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { courtId, slotId, title, description, skillLevel, maxPlayers } = body

  const { data, error } = await supabase
    .from('games')
    .insert({
      court_id: courtId,
      slot_id: slotId ?? null,
      host_id: user.id,
      title,
      description,
      skill_level: skillLevel ?? 'open',
      max_players: maxPlayers ?? 4,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Host auto-joins as first player
  await supabase
    .from('game_players')
    .insert({ game_id: data.id, player_id: user.id })

  return NextResponse.json({ game: data }, { status: 201 })
}
