import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { DateChips } from '@/components/player/DateChips'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

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

  const maxSlots = sorted[0]?.slotCount ?? 1

  // Availability density: green if many, amber if few
  function availabilityColor(slots: number) {
    const ratio = slots / maxSlots
    if (ratio > 0.6) return 'bg-green-500'
    if (ratio > 0.3) return 'bg-amber-400'
    return 'bg-orange-400'
  }

  const isToday = date === today

  return (
    <div>
      <h1 className="text-xl font-bold text-foreground mb-1">Find a court</h1>
      <p className="text-sm text-muted-foreground mb-4">
        {isToday ? "Today's" : 'Available'} courts in Cebu
      </p>

      <DateChips selected={date} />

      {sorted.length === 0 ? (
        <div className="text-center py-16 flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center text-3xl">
            🏟
          </div>
          <div>
            <p className="font-semibold text-foreground">No courts open {isToday ? 'today' : 'on this date'}</p>
            <p className="text-sm text-muted-foreground mt-1">
              Try a different date — courts add slots throughout the week.
            </p>
          </div>
          <Link
            href={`/player/discover?date=${today}`}
            className="text-sm font-semibold text-primary hover:underline mt-1"
          >
            ← Back to today
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {sorted.map(court => (
            <Link key={court.id} href={`/courts/${court.id}?date=${date}`}>
              <Card className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer card-interactive">
                {/* Availability density strip */}
                <div className={cn('h-1', availabilityColor(court.slotCount))} />

                <div className="flex">
                  {/* Court image or placeholder */}
                  {court.images[0] ? (
                    <div className="w-24 h-24 flex-shrink-0 overflow-hidden">
                      <img
                        src={court.images[0]}
                        alt={court.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-24 h-24 flex-shrink-0 bg-secondary flex items-center justify-center text-3xl">
                      🏓
                    </div>
                  )}

                  <CardContent className="p-3 flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground text-sm leading-tight">{court.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">📍 {court.city}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-primary text-sm tabular-nums">
                          ₱{court.hourly_rate.toLocaleString()}
                          <span className="text-xs font-normal text-muted-foreground">/hr</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <div className="flex gap-1 flex-wrap">
                        {court.amenities.slice(0, 2).map(a => (
                          <span key={a} className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
                            {a}
                          </span>
                        ))}
                      </div>
                      <span className={cn(
                        'text-xs font-semibold',
                        court.slotCount > 5 ? 'text-green-700' : court.slotCount > 2 ? 'text-amber-700' : 'text-orange-700'
                      )}>
                        {court.slotCount} slot{court.slotCount !== 1 ? 's' : ''} open
                      </span>
                    </div>
                  </CardContent>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
