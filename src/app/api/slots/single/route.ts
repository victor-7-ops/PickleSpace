import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { courtId, date, start_time, end_time } = await req.json()

  const { data: court } = await supabase
    .from('courts')
    .select('owner_id')
    .eq('id', courtId)
    .single()

  if (!court || (court as { owner_id: string }).owner_id !== user.id) {
    return NextResponse.json({ error: 'Court not found' }, { status: 404 })
  }

  const { data, error } = await supabase
    .from('slots')
    .insert({ court_id: courtId, date, start_time, end_time })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ slot: data }, { status: 201 })
}
