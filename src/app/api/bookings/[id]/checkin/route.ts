import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/bookings/[id]/checkin  body: { qrCode: string }
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { qrCode } = await req.json()
  if (!qrCode) return NextResponse.json({ error: 'qrCode required' }, { status: 400 })

  const today = new Date().toISOString().split('T')[0]

  const { data: booking } = await supabase
    .from('bookings')
    .select('*, slot:slots(date), court:courts(owner_id)')
    .eq('id', params.id)
    .single()

  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

  const court = Array.isArray(booking.court) ? booking.court[0] : booking.court
  if ((court as { owner_id: string } | null)?.owner_id !== user.id) {
    return NextResponse.json({ error: 'Not your court' }, { status: 403 })
  }

  if (booking.qr_code !== qrCode) {
    return NextResponse.json({ error: 'Invalid QR code' }, { status: 400 })
  }

  if (booking.booking_status !== 'confirmed') {
    return NextResponse.json(
      { error: `Cannot check in a booking with status: ${booking.booking_status}` },
      { status: 409 }
    )
  }

  const slot = Array.isArray(booking.slot) ? booking.slot[0] : booking.slot
  if ((slot as { date: string } | null)?.date !== today) {
    return NextResponse.json({ error: 'This booking is not for today' }, { status: 409 })
  }

  const { data: updated, error } = await supabase
    .from('bookings')
    .update({ booking_status: 'completed' })
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ booking: updated })
}
