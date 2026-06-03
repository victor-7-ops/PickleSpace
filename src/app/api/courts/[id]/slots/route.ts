import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/courts/[id]/slots?from=YYYY-MM-DD&to=YYYY-MM-DD
// Public — no auth required. Returns available + held slots for the date range.
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const { searchParams } = req.nextUrl

  const from = searchParams.get('from')
  const to = searchParams.get('to') ?? from

  if (!from) {
    return NextResponse.json({ error: 'from date required' }, { status: 400 })
  }

  // Verify court exists and is active
  const { data: court } = await supabase
    .from('courts')
    .select('id, status')
    .eq('id', params.id)
    .single()

  if (!court || court.status !== 'active') {
    return NextResponse.json({ error: 'Court not found' }, { status: 404 })
  }

  const { data: slots, error } = await supabase
    .from('slots')
    .select('id, date, start_time, end_time, status, hold_expires_at')
    .eq('court_id', params.id)
    .gte('date', from)
    .lte('date', to!)
    .order('date')
    .order('start_time')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ slots: slots ?? [] })
}
