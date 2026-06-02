import { createClient } from '@/lib/supabase/server'
import { PlayerBookingCard } from '@/components/player/PlayerBookingCard'
import Link from 'next/link'
import QRCode from 'qrcode'
import type { Booking } from '@/types'

interface Props {
  searchParams: { tab?: string }
}

export default async function PlayerBookingsPage({ searchParams }: Props) {
  const tab = searchParams.tab === 'past' ? 'past' : 'upcoming'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  const { data: bookings } = await supabase
    .from('bookings')
    .select('*, court:courts(name), slot:slots(date, start_time, end_time)')
    .eq('player_id', user!.id)
    .neq('booking_status', 'cancelled')

  const all = (bookings ?? []) as unknown as Booking[]

  // Split by slot date relative to today
  const filtered = all.filter(b => {
    const slotDate = (b.slot as { date?: string } | null)?.date ?? ''
    return tab === 'upcoming' ? slotDate >= today : slotDate < today
  })

  // Sort by slot date (not created_at)
  const sorted = filtered.sort((a, b) => {
    const aDate = (a.slot as { date?: string } | null)?.date ?? ''
    const bDate = (b.slot as { date?: string } | null)?.date ?? ''
    return tab === 'upcoming'
      ? aDate.localeCompare(bDate)   // ascending: soonest first
      : bDate.localeCompare(aDate)   // descending: most recent first
  })

  // Pre-render QR codes server-side for all bookings
  const withQr = await Promise.all(
    sorted.map(async b => ({
      booking: b,
      qrDataUrl: await QRCode.toDataURL(b.qr_code, { width: 224, margin: 2 }),
    }))
  )

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-4">My Bookings</h1>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-4">
        {[
          { key: 'upcoming', label: 'Upcoming' },
          { key: 'past',     label: 'Past'     },
        ].map(t => (
          <a key={t.key} href={`/player/bookings?tab=${t.key}`}
            className={`flex-1 py-2 text-center text-sm font-medium transition-colors ${
              tab === t.key
                ? 'text-green-700 border-b-2 border-green-600'
                : 'text-gray-400 hover:text-gray-600'
            }`}>
            {t.label}
          </a>
        ))}
      </div>

      {withQr.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📅</p>
          <p className="font-medium text-gray-600 mb-1">No bookings yet</p>
          <p className="text-sm mb-4">Find a court to start playing.</p>
          <Link href="/player/discover"
            className="bg-green-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-green-700">
            Find a court
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {withQr.map(({ booking, qrDataUrl }) => (
            <PlayerBookingCard key={booking.id} booking={booking} qrDataUrl={qrDataUrl} />
          ))}
        </div>
      )}
    </div>
  )
}
