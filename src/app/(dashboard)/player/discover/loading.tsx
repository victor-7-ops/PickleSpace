import { Skeleton } from '@/components/ui/skeleton'

export default function DiscoverLoading() {
  return (
    <div>
      <Skeleton className="h-7 w-32 mb-1" />
      <Skeleton className="h-4 w-48 mb-4" />

      {/* Date chips skeleton */}
      <div className="flex gap-2 mb-6">
        <Skeleton className="h-8 w-16 rounded-full" />
        <Skeleton className="h-8 w-20 rounded-full" />
        <Skeleton className="h-8 w-24 rounded-full" />
      </div>

      {/* Court card skeletons */}
      <div className="flex flex-col gap-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="rounded-xl border border-border overflow-hidden">
            <Skeleton className="h-36 w-full rounded-none" />
            <div className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <Skeleton className="h-5 w-40 mb-1" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <div className="text-right">
                  <Skeleton className="h-5 w-20 mb-1" />
                  <Skeleton className="h-5 w-24 rounded-full" />
                </div>
              </div>
              <div className="flex gap-1.5 mt-3">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
