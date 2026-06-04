'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'

interface GamesFilterProps {
  playerSkillLevel: string
}

export function GamesFilter({ playerSkillLevel }: GamesFilterProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const current = searchParams.get('filter') ?? 'all'

  function setFilter(f: string) {
    router.push(`/player/games?filter=${f}`)
  }

  const filters = [
    { key: 'all',      label: 'All' },
    { key: 'open',     label: 'Open' },
    { key: 'my-level', label: 'My level' },
  ]

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 mb-4">
      {filters.map(f => (
        <button key={f.key} onClick={() => setFilter(f.key)}
          className={cn(
            'flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors',
            current === f.key
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
          )}>
          {f.label}
        </button>
      ))}
    </div>
  )
}
