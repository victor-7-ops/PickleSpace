import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Game } from '@/types'

interface GameCardProps {
  game: Game
  showRole?: 'hosting' | 'joined'
}

export function GameCard({ game, showRole }: GameCardProps) {
  const spotsLeft = game.max_players - game.current_players
  const isFull = game.status === 'full' || spotsLeft <= 0
  const isCancelled = game.status === 'cancelled'

  const host = game.host as { name?: string } | null
  const court = game.court as { name?: string } | null
  const slot = game.slot as { start_time?: string } | null

  return (
    <Link href={`/games/${game.id}`}>
      <Card className={`hover:shadow-md transition-shadow cursor-pointer card-interactive ${isCancelled ? 'opacity-50' : ''}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground truncate">{game.title}</p>
              <p className="text-sm text-muted-foreground mt-0.5 truncate">
                {court?.name}{slot?.start_time ? ` · ${slot.start_time}` : ''}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
              {isCancelled ? (
                <Badge variant="destructive">Cancelled</Badge>
              ) : isFull ? (
                <Badge variant="destructive">Full</Badge>
              ) : spotsLeft === 1 ? (
                <Badge variant="outline">1 spot</Badge>
              ) : (
                <Badge variant="secondary">{spotsLeft} spots</Badge>
              )}
              {showRole && (
                <Badge
                  variant={showRole === 'hosting' ? 'secondary' : 'outline'}
                  className="capitalize"
                >
                  {showRole}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="capitalize text-xs">
              {game.skill_level}
            </Badge>
            <span className="text-xs text-muted-foreground">Hosted by {host?.name ?? 'Player'}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
