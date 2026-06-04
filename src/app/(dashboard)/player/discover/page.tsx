import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { DateChips } from '@/components/player/DateChips'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

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

  type CourtRow = { id: string; name: string; city: string; hourly_rate: number; amenities: string[]; images: string[]; slots: { id: string }[] }
  const sorted = ((courts ?? []) as CourtRow[])
    .map(c => ({ ...c, slotCount: c.slots.length }))
    .sort((a, b) => b.slotCount - a.slotCount)

  return (
    <div>
      <h1 className="text-xl font-bold text-foreground mb-1">Find a court</h1>
      <p className="text-sm text-muted-foreground mb-4">Pick a date to see available courts</p>

      <DateChips selected={date} />

      {sorted.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🏟</p>
          <p className="font-semibold text-foreground mb-1">No courts available</p>
          <p className="text-sm text-muted-foreground">No courts have open slots on this date — try another day.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {sorted.map(court => (
            <Link key={court.id} href={`/courts/${court.id}?date=${date}`}>
              <Card className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
                {court.images[0] && (
                  <div className="h-36 overflow-hidden">
                    <img src={court.images[0]} alt={court.name} className="w-full h-full object-cover" />
                  </div>
                )}
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-foreground">{court.name}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">{court.city}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-primary tabular-nums">
                        ₱{court.hourly_rate.toLocaleString()}
                        <span className="text-xs font-normal text-muted-foreground">/hr</span>
                      </p>
                      <Badge variant="secondary" className="mt-1 text-xs">
                        {court.slotCount} slot{court.slotCount !== 1 ? 's' : ''} available
                      </Badge>
                    </div>
                  </div>
                  {court.amenities.length > 0 && (
                    <div className="flex gap-1.5 mt-3 flex-wrap">
                      {court.amenities.slice(0, 3).map(a => (
                        <Badge key={a} variant="outline" className="text-xs font-normal">
                          {a}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
