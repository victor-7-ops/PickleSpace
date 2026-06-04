'use client'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'

const FILTERS = ['all', 'confirmed', 'pending', 'completed', 'cancelled'] as const

export function BookingsFilter({ current }: { current: string }) {
  const router = useRouter()
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
      {FILTERS.map(f => (
        <Badge
          key={f}
          variant={current === f ? 'default' : 'secondary'}
          className="cursor-pointer capitalize flex-shrink-0"
          onClick={() => router.push(`/owner/bookings?tab=all&status=${f}`)}
        >
          {f}
        </Badge>
      ))}
    </div>
  )
}
