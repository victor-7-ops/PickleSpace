import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/slots/hold  { slotId }
// Holds a slot for 10 minutes for the authenticated user.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { slotId } = await req.json()
  if (!slotId) {
    return NextResponse.json({ error: 'slotId required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .rpc('hold_slot', { p_slot_id: slotId, p_user_id: user.id })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 409 })
  }

  return NextResponse.json({ slot: data })
}
