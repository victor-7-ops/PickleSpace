import Link from 'next/link'
import { LandPlot } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { DateChips } from '@/components/player/DateChips'
import { CourtList } from '@/components/player/CourtList'

interface Props {
  searchParams: { date?: string }
}

export default async function DiscoverPage({ searchParams }: Props) {
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const date = searchParams.date ?? today

  const supabase = await createClient()

  const { data: courts } = await supabase
    .from('courts')
    .select(`id, name, city, hourly_rate, amenities, images, slots!inner(id)`)
    .eq('status', 'active')
    .eq('slots.date', date)
    .eq('slots.status', 'available')

  type CourtRow = {
    id: string; name: string; city: string; hourly_rate: number
    amenities: string[]; images: string[]; slots: { id: string }[]
  }

  const sorted = ((courts ?? []) as CourtRow[])
    .map(c => ({ ...c, slotCount: c.slots.length }))
    .sort((a, b) => b.slotCount - a.slotCount)

  const isToday = date === today

  return (
    <div>
      <h1 className="font-display text-3xl uppercase text-foreground mb-1">Find a court</h1>
      <p className="text-sm text-muted-foreground mb-4">
        {isToday ? "Today's" : 'Available'} courts in Cebu
      </p>

      <DateChips selected={date} />

      {sorted.length === 0 ? (
        <div className="text-center py-16 flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center">
            <LandPlot size={28} className="text-primary" aria-hidden="true" />
          </div>
          <div>
            <p className="font-semibold text-foreground">No courts open {isToday ? 'today' : 'on this date'}</p>
            <p className="text-sm text-muted-foreground mt-1">
              Try a different date — courts add slots throughout the week.
            </p>
          </div>
          <Link href={`/player/discover?date=${today}`}
            className="text-sm font-semibold text-primary hover:underline mt-1">
            ← Back to today
          </Link>
        </div>
      ) : (
        <CourtList courts={sorted} date={date} />
      )}
    </div>
  )
}
