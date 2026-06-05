import { createClient } from '@/lib/supabase/server'
import { WeeklyGrid } from '@/components/owner/WeeklyGrid'
import { redirect } from 'next/navigation'
import type { Booking } from '@/types'

export default async function SchedulePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: courts } = await supabase
    .from('courts')
    .select('*')
    .eq('owner_id', user!.id)
    .order('created_at')

  if (!courts || courts.length === 0) {
    redirect('/owner/courts')
  }

  const court = courts[0]

  const today = new Date().toISOString().split('T')[0]
  const twoWeeksLater = new Date()
  twoWeeksLater.setDate(twoWeeksLater.getDate() + 14)
  const endDate = twoWeeksLater.toISOString().split('T')[0]

  const { data: slots } = await supabase
    .from('slots')
    .select('*')
    .eq('court_id', court.id)
    .gte('date', today)
    .lte('date', endDate)
    .order('date')
    .order('start_time')

  const bookedSlotIds = (slots ?? [])
    .filter(s => s.status === 'booked')
    .map(s => s.id)

  let bookingsBySlotId: Record<string, Booking> = {}
  if (bookedSlotIds.length > 0) {
    const { data: bookings } = await supabase
      .from('bookings')
      .select('*, player:users(name, phone)')
      .in('slot_id', bookedSlotIds)
      .eq('booking_status', 'confirmed')

    bookingsBySlotId = Object.fromEntries(
      (bookings ?? []).map(b => [b.slot_id, b])
    )
  }

  return (
    <>
      <h1 className="text-lg font-semibold text-foreground mb-1">{court.name}</h1>
      <p className="text-sm text-muted-foreground mb-4">Tap an empty cell to add a slot · tap a slot to view or delete</p>
      <WeeklyGrid
        court={court}
        initialSlots={slots ?? []}
        bookingsBySlotId={bookingsBySlotId}
      />
    </>
  )
}
