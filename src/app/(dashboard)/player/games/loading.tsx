import { Skeleton } from '@/components/ui/skeleton'

export default function GamesLoading() {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>
      {/* Tab bar */}
      <div className="flex border-b border-border mb-4">
        <Skeleton className="flex-1 h-9 rounded-none" />
        <Skeleton className="flex-1 h-9 rounded-none" />
      </div>
      {/* Filter chips */}
      <div className="flex gap-2 mb-4">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-6 w-16 rounded-full" />
        ))}
      </div>
      {/* Date section */}
      <Skeleton className="h-4 w-20 mb-3" />
      {/* Game card skeletons */}
      <div className="flex flex-col gap-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="rounded-xl border border-border p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <Skeleton className="h-5 w-48 mb-1" />
                <Skeleton className="h-4 w-36" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-4 w-28" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
