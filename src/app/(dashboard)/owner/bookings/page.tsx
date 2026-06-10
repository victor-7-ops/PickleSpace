import { LandPlot } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { BookingCard } from '@/components/owner/BookingCard'
import { BookingsFilter } from '@/components/owner/BookingsFilter'
import { NavTabs } from '@/components/ui/nav-tabs'
import type { Booking } from '@/types'

type FilterStatus = 'all' | 'confirmed' | 'pending' | 'completed' | 'cancelled'

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: { tab?: string; status?: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const tab = searchParams.tab === 'all' ? 'all' : 'today'
  const status = (searchParams.status as FilterStatus) ?? 'all'
  const today = new Date().toISOString().split('T')[0]

  const { data: courts } = await supabase
    .from('courts')
    .select('id')
    .eq('owner_id', user!.id)

  const courtIds = (courts ?? []).map((c: { id: string }) => c.id)

  if (courtIds.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-2">
          <LandPlot size={24} className="text-primary" aria-hidden="true" />
        </div>
        <p className="text-sm">List a court first to see bookings.</p>
      </div>
    )
  }

  let bookings: Booking[] = []

  if (tab === 'today') {
    const { data: todaySlots } = await supabase
      .from('slots')
      .select('id')
      .in('court_id', courtIds)
      .eq('date', today)

    const todaySlotIds = (todaySlots ?? []).map((s: { id: string }) => s.id)

    if (todaySlotIds.length > 0) {
      const { data } = await supabase
        .from('bookings')
        .select('*, player:users(name, phone), slot:slots(date, start_time, end_time), court:courts(name)')
        .in('slot_id', todaySlotIds)
        .order('slot_id')

      bookings = (data ?? []) as unknown as Booking[]
    }
  } else {
    let query = supabase
      .from('bookings')
      .select('*, player:users(name, phone), slot:slots(date, start_time, end_time), court:courts(name)')
      .in('court_id', courtIds)
      .order('created_at', { ascending: false })
      .limit(50)

    if (status !== 'all') query = query.eq('booking_status', status)

    const { data } = await query
    bookings = (data ?? []) as unknown as Booking[]
  }

  return (
    <div>
      <NavTabs
        current={tab}
        tabs={[
          { key: 'today', label: 'Today',        href: '/owner/bookings?tab=today' },
          { key: 'all',   label: 'All Bookings', href: '/owner/bookings?tab=all'   },
        ]}
      />

      {tab === 'all' && <BookingsFilter current={status} />}

      {bookings.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-3xl mb-2">📋</p>
          <p className="text-sm">{tab === 'today' ? 'No bookings today' : 'No bookings found'}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {bookings.map(b => (
            <BookingCard key={b.id} booking={b} />
          ))}
        </div>
      )}
    </div>
  )
}
