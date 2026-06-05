import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/slots — bulk generate slots for a week
// Body: { courtId, weekStart, openFrom, openUntil, durationHours, days }
// days: array of day-of-week numbers (0=Sun, 1=Mon ... 6=Sat)
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { courtId, weekStart, openFrom, openUntil, durationHours, days } = await req.json()

  // Verify court ownership
  const { data: court } = await supabase
    .from('courts')
    .select('owner_id')
    .eq('id', courtId)
    .single()

  if (!court || court.owner_id !== user.id) {
    return NextResponse.json({ error: 'Court not found' }, { status: 404 })
  }

  // Generate slot rows for each selected day
  const slots: { court_id: string; date: string; start_time: string; end_time: string }[] = []
  const startDate = new Date(weekStart)

  for (let d = 0; d < 7; d++) {
    const day = new Date(startDate)
    day.setDate(startDate.getDate() + d)
    if (!days.includes(day.getDay())) continue

    const dateStr = day.toISOString().split('T')[0]
    const [openH] = (openFrom as string).split(':').map(Number)
    const [closeH] = (openUntil as string).split(':').map(Number)

    for (let h = openH; h + durationHours <= closeH; h += durationHours) {
      const start = `${String(h).padStart(2, '0')}:00`
      const end = `${String(h + durationHours).padStart(2, '0')}:00`
      slots.push({ court_id: courtId, date: dateStr, start_time: start, end_time: end })
    }
  }

  if (slots.length === 0) {
    return NextResponse.json({ error: 'No slots generated — check your time range and selected days' }, { status: 400 })
  }

  // Safety cap — prevent abuse / accidental huge generations
  if (slots.length > 500) {
    return NextResponse.json({ error: 'Too many slots (max 500 per generation)' }, { status: 400 })
  }

  // ON CONFLICT DO NOTHING — idempotent (existing slots not overwritten)
  const { error } = await supabase
    .from('slots')
    .upsert(slots, { onConflict: 'court_id,date,start_time,end_time', ignoreDuplicates: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ generated: slots.length }, { status: 201 })
}
