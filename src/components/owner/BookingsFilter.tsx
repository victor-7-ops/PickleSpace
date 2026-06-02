'use client'
import { useRouter } from 'next/navigation'

const FILTERS = ['all', 'confirmed', 'pending', 'completed', 'cancelled'] as const

export function BookingsFilter({ current }: { current: string }) {
  const router = useRouter()
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
      {FILTERS.map(f => (
        <button key={f} onClick={() => router.push(`/owner/bookings?tab=all&status=${f}`)}
          className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors ${
            current === f
              ? 'bg-green-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}>
          {f}
        </button>
      ))}
    </div>
  )
}
