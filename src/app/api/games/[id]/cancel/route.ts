import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: game } = await supabase
    .from('games')
    .select('id, host_id, status')
    .eq('id', params.id)
    .single()

  if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 })
  if (game.host_id !== user.id) {
    return NextResponse.json({ error: 'Only the host can cancel' }, { status: 403 })
  }
  if (game.status === 'cancelled') {
    return NextResponse.json({ error: 'Already cancelled' }, { status: 409 })
  }

  const { error } = await supabase
    .from('games')
    .update({ status: 'cancelled' })
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
