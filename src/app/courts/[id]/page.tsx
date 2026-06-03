import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { SlotGrid } from '@/components/player/SlotGrid'
import { CourtAbout } from '@/components/player/CourtAbout'
import type { Slot } from '@/types'

interface Props {
  params: { id: string }
  searchParams: { date?: string }
}

export default async function CourtDetailPage({ params, searchParams }: Props) {
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const selectedDate = searchParams.date ?? today

  const supabase = await createClient()

  const { data: rawCourt } = await supabase
    .from('courts')
    .select('*')
    .eq('id', params.id)
    .eq('status', 'active')
    .single()

  if (!rawCourt) notFound()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const court = rawCourt as any

  // Fetch slots for selected date ± 3 days
  const from = new Date(selectedDate + 'T00:00:00')
  from.setDate(from.getDate() - 3)
  const to = new Date(selectedDate + 'T00:00:00')
  to.setDate(to.getDate() + 3)

  function localDateStr(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  const { data: slots } = await supabase
    .from('slots')
    .select('id, date, start_time, end_time, status, hold_expires_at')
    .eq('court_id', params.id)
    .gte('date', localDateStr(from))
    .lte('date', localDateStr(to))
    .order('date')
    .order('start_time')

  // Build date tabs: selectedDate ± 3 days
  const dateTabs = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(selectedDate + 'T00:00:00')
    d.setDate(d.getDate() - 3 + i)
    return localDateStr(d)
  })

  return (
    <div className="min-h-screen bg-white">
      {/* Sticky top bar */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <Link href={`/player/discover?date=${selectedDate}`} className="text-gray-400 hover:text-gray-600 text-lg">
          ←
        </Link>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">{court.name}</p>
          <p className="text-xs text-green-700 font-medium">₱{court.hourly_rate.toLocaleString()}/hr</p>
        </div>
      </header>

      <div className="px-4 py-4">
        {/* Date tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
          {dateTabs.map(d => {
            const dateObj = new Date(d + 'T00:00:00')
            const label = d === today
              ? 'Today'
              : (() => {
                  const tom = new Date(today + 'T00:00:00')
                  tom.setDate(tom.getDate() + 1)
                  return localDateStr(tom) === d ? 'Tomorrow'
                    : dateObj.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' })
                })()
            return (
              <Link key={d} href={`/courts/${params.id}?date=${d}`}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  d === selectedDate
                    ? 'bg-green-600 text-white border-green-600'
                    : 'border-gray-200 text-gray-600 hover:border-green-400'
                }`}>
                {label}
              </Link>
            )
          })}
        </div>

        {/* Slot grid — hero */}
        <SlotGrid
          courtId={court.id}
          courtSlug={params.id}
          initialSlots={(slots ?? []) as Slot[]}
          selectedDate={selectedDate}
          hourlyRate={court.hourly_rate}
        />

        {/* Collapsible about */}
        <CourtAbout
          description={court.description ?? undefined}
          amenities={court.amenities}
          address={court.address}
          images={court.images}
        />
      </div>
    </div>
  )
}
