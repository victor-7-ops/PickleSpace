import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { DateChips } from '@/components/player/DateChips'

interface Props {
  searchParams: { date?: string }
}

export default async function DiscoverPage({ searchParams }: Props) {
  const today = new Date().toISOString().split('T')[0]
  const date = searchParams.date ?? today

  const supabase = await createClient()

  // Fetch active courts that have at least one available slot on the selected date
  const { data: courts } = await supabase
    .from('courts')
    .select(`
      id, name, city, hourly_rate, amenities, images,
      slots!inner(id)
    `)
    .eq('status', 'active')
    .eq('slots.date', date)
    .eq('slots.status', 'available')

  // Count available slots per court and sort by count desc
  type CourtRow = { id: string; name: string; city: string; hourly_rate: number; amenities: string[]; images: string[]; slots: { id: string }[] }
  const sorted = ((courts ?? []) as CourtRow[])
    .map(c => ({ ...c, slotCount: c.slots.length }))
    .sort((a, b) => b.slotCount - a.slotCount)

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-1">Find a court</h1>
      <p className="text-sm text-gray-500 mb-4">Pick a date to see available courts</p>

      <DateChips selected={date} />

      {sorted.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🏟</p>
          <p className="font-medium text-gray-600 mb-1">No courts available</p>
          <p className="text-sm">No courts have open slots on this date — try another day.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {sorted.map(court => (
            <Link key={court.id} href={`/courts/${court.id}?date=${date}`}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              {court.images[0] && (
                <div className="h-36 overflow-hidden">
                  <img src={court.images[0]} alt={court.name}
                    className="w-full h-full object-cover" />
                </div>
              )}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-gray-900">{court.name}</p>
                    <p className="text-sm text-gray-500 mt-0.5">{court.city}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-green-700">₱{court.hourly_rate.toLocaleString()}<span className="text-xs font-normal text-gray-400">/hr</span></p>
                    <p className="text-xs text-green-600 font-medium mt-0.5">{court.slotCount} slot{court.slotCount !== 1 ? 's' : ''} today</p>
                  </div>
                </div>
                {court.amenities.length > 0 && (
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    {court.amenities.slice(0, 3).map(a => (
                      <span key={a} className="text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full">{a}</span>
                    ))}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
