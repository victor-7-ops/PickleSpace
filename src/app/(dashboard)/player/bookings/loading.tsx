import { Skeleton } from '@/components/ui/skeleton'

export default function BookingsLoading() {
  return (
    <div>
      <Skeleton className="h-7 w-32 mb-4" />
      {/* Tab bar skeleton */}
      <div className="flex border-b border-border mb-4">
        <Skeleton className="flex-1 h-9 rounded-none" />
        <Skeleton className="flex-1 h-9 rounded-none" />
      </div>
      {/* Booking card skeletons */}
      <div className="flex flex-col gap-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="rounded-xl border border-border p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <Skeleton className="h-5 w-40 mb-1" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-8 w-20 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
