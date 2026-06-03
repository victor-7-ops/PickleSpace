import Link from 'next/link'
import type { Game } from '@/types'

interface GameCardProps {
  game: Game
  showRole?: 'hosting' | 'joined'
}

const SKILL_COLORS: Record<string, string> = {
  open:         'bg-gray-100 text-gray-600',
  beginner:     'bg-green-100 text-green-700',
  intermediate: 'bg-yellow-100 text-yellow-700',
  advanced:     'bg-red-100 text-red-700',
}

export function GameCard({ game, showRole }: GameCardProps) {
  const spotsLeft = game.max_players - game.current_players
  const isFull = game.status === 'full' || spotsLeft <= 0
  const isCancelled = game.status === 'cancelled'

  const host = game.host as { name?: string } | null
  const court = game.court as { name?: string; city?: string } | null
  const slot = game.slot as { start_time?: string } | null

  function spotsLabel() {
    if (isCancelled) return { text: 'Cancelled', cls: 'bg-red-100 text-red-700' }
    if (isFull) return { text: 'Full', cls: 'bg-red-100 text-red-700' }
    if (spotsLeft === 1) return { text: '1 spot', cls: 'bg-yellow-100 text-yellow-700' }
    return { text: `${spotsLeft} spots`, cls: 'bg-green-100 text-green-700' }
  }

  const spots = spotsLabel()

  return (
    <Link href={`/games/${game.id}`}
      className={`block bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow ${isCancelled ? 'opacity-50' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">{game.title}</p>
          <p className="text-sm text-gray-500 mt-0.5 truncate">
            {court?.name}{slot?.start_time ? ` · ${slot.start_time}` : ''}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${spots.cls}`}>
            {spots.text}
          </span>
          {showRole && (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              showRole === 'hosting' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
            }`}>
              {showRole === 'hosting' ? 'Hosting' : 'Joined'}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 mt-2">
        <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${SKILL_COLORS[game.skill_level] ?? SKILL_COLORS.open}`}>
          {game.skill_level}
        </span>
        <span className="text-xs text-gray-400">Hosted by {host?.name ?? 'Player'}</span>
      </div>
    </Link>
  )
}
