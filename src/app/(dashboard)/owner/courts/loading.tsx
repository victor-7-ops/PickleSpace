import { Skeleton } from '@/components/ui/skeleton'

export default function CourtsLoading() {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-8 w-28 rounded-xl" />
      </div>
      <div className="flex flex-col gap-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="rounded-xl border border-border p-4">
            <div className="flex gap-3">
              <Skeleton className="size-16 rounded-lg flex-shrink-0" />
              <div className="flex-1">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="h-4 w-48 mb-1" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
