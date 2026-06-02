import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/bookings/[id]/mark-paid — for cash bookings only
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: booking } = await supabase
    .from('bookings')
    .select('payment_method, payment_status, court:courts(owner_id)')
    .eq('id', params.id)
    .single()

  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

  const court = Array.isArray(booking.court) ? booking.court[0] : booking.court
  if ((court as { owner_id: string } | null)?.owner_id !== user.id) {
    return NextResponse.json({ error: 'Not your court' }, { status: 403 })
  }

  if (booking.payment_method !== 'cash') {
    return NextResponse.json({ error: 'Only cash bookings can be manually marked as paid' }, { status: 400 })
  }

  if (booking.payment_status === 'paid') {
    return NextResponse.json({ error: 'Already marked as paid' }, { status: 409 })
  }

  const { data: updated, error } = await supabase
    .from('bookings')
    .update({ payment_status: 'paid', booking_status: 'confirmed' })
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ booking: updated })
}
