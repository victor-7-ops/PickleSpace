'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'

interface GamesFilterProps {
  playerSkillLevel: string
}

const CHIPS = [
  { key: 'my-level',     label: 'My level' },
  { key: 'open',         label: 'Open' },
  { key: 'beginner',     label: 'Beginner' },
  { key: 'intermediate', label: 'Intermediate' },
  { key: 'advanced',     label: 'Advanced' },
  { key: 'all',          label: 'All' },
]

export function GamesFilter({ playerSkillLevel }: GamesFilterProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  // Default to 'my-level' so the feed opens filtered to the player's level + open games
  const current = searchParams.get('filter') ?? 'my-level'
  const tab = searchParams.get('tab') ?? 'discover'

  function setFilter(f: string) {
    router.push(`/player/games?tab=${tab}&filter=${f}`)
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 mb-4 no-scrollbar" role="group" aria-label="Skill level filter">
      {CHIPS.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => setFilter(key)}
          className={cn(
            'flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors',
            current === key
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
          )}
          aria-pressed={current === key}
        >
          {key === 'my-level' && playerSkillLevel !== 'open'
            ? `${playerSkillLevel[0].toUpperCase()}${playerSkillLevel.slice(1)} + Open`
            : label}
        </button>
      ))}
    </div>
  )
}
