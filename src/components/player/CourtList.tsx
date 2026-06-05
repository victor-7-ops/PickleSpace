'use client'
import { motion, useReducedMotion } from 'motion/react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { staggerContainer, staggerItem } from '@/lib/motion'

type CourtRow = {
  id: string; name: string; city: string; hourly_rate: number
  amenities: string[]; images: string[]; slotCount: number
}

interface CourtListProps {
  courts: CourtRow[]
  date: string
}

function availabilityColor(slots: number, max: number) {
  const ratio = slots / max
  if (ratio > 0.6) return 'bg-green-500'
  if (ratio > 0.3) return 'bg-amber-400'
  return 'bg-orange-400'
}

function slotTextColor(slots: number, max: number) {
  const ratio = slots / max
  if (ratio > 0.6) return 'text-green-700'
  if (ratio > 0.3) return 'text-amber-700'
  return 'text-orange-700'
}

export function CourtList({ courts, date }: CourtListProps) {
  const reduce = useReducedMotion()
  const maxSlots = courts[0]?.slotCount ?? 1

  const container = reduce ? undefined : staggerContainer
  const item      = reduce ? undefined : staggerItem

  return (
    <motion.div
      className="flex flex-col gap-3"
      variants={container}
      initial="hidden"
      animate="visible"
    >
      {courts.map(court => (
        <motion.div key={court.id} variants={item}>
          <Link href={`/courts/${court.id}?date=${date}`}>
            <Card className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer card-interactive">
              <div className={cn('h-1', availabilityColor(court.slotCount, maxSlots))} />
              <div className="flex">
                {court.images[0] ? (
                  <div className="w-24 h-24 flex-shrink-0 overflow-hidden">
                    <img src={court.images[0]} alt={court.name} className="w-full h-full object-cover" />
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
                    <p className="font-bold text-primary text-sm tabular-nums flex-shrink-0">
                      ₱{court.hourly_rate.toLocaleString()}
                      <span className="text-xs font-normal text-muted-foreground">/hr</span>
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex gap-1 flex-wrap">
                      {court.amenities.slice(0, 2).map(a => (
                        <span key={a} className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
                          {a}
                        </span>
                      ))}
                    </div>
                    <span className={cn('text-xs font-semibold', slotTextColor(court.slotCount, maxSlots))}>
                      {court.slotCount} slot{court.slotCount !== 1 ? 's' : ''} open
                    </span>
                  </div>
                </CardContent>
              </div>
            </Card>
          </Link>
        </motion.div>
      ))}
    </motion.div>
  )
}
