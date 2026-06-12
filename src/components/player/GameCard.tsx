import Link from 'next/link'
import { Crown } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Game } from '@/types'

interface GameCardProps {
  game: Game
  showRole?: 'hosting' | 'joined'
}

const SKILL_COLORS: Record<string, string> = {
  beginner:     'bg-blue-100 text-blue-800 border-blue-200',
  intermediate: 'bg-amber-100 text-amber-800 border-amber-200',
  advanced:     'bg-red-100 text-red-800 border-red-200',
  open:         'bg-secondary text-secondary-foreground border-transparent',
}

function SpotsIndicator({ current, max }: { current: number; max: number }) {
  const spotsLeft = max - current
  return (
    <div className="flex items-center gap-0.5" title={`${spotsLeft} of ${max} spots left`}>
      {Array.from({ length: max }).map((_, i) => (
        <span
          key={i}
          className={cn(
            'w-2 h-2 rounded-full',
            i < current ? 'bg-muted-foreground/30' : 'bg-primary'
          )}
        />
      ))}
    </div>
  )
}

function formatSlotDate(dateStr?: string, timeStr?: string) {
  if (!dateStr) return null
  const d = new Date(dateStr + 'T00:00:00')
  const now = new Date()
  const today = now.toISOString().split('T')[0]
  const tom = new Date(now); tom.setDate(now.getDate() + 1)
  const tomorrow = tom.toISOString().split('T')[0]

  const label = dateStr === today ? 'Today'
    : dateStr === tomorrow ? 'Tomorrow'
    : d.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' })

  const time = timeStr
    ? (() => {
        const [h] = timeStr.split(':').map(Number)
        return h === 0 ? '12am' : h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`
      })()
    : null

  return time ? `${label} · ${time}` : label
}

export function GameCard({ game, showRole }: GameCardProps) {
  const spotsLeft = game.max_players - game.current_players
  const isFull = game.status === 'full' || spotsLeft <= 0
  const isCancelled = game.status === 'cancelled'

  const host  = game.host  as { name?: string } | null
  const court = game.court as { name?: string } | null
  const slot  = game.slot  as { date?: string; start_time?: string } | null

  const dateLabel = formatSlotDate(slot?.date, slot?.start_time)

  return (
    <Link href={`/games/${game.id}`}>
      <Card className={cn(
        'hover:shadow-md transition-all cursor-pointer card-interactive overflow-hidden',
        isCancelled && 'opacity-50'
      )}>
        {/* Skill-level top strip */}
        <div className={cn(
          'h-1',
          game.skill_level === 'beginner'     && 'bg-blue-400',
          game.skill_level === 'intermediate' && 'bg-amber-400',
          game.skill_level === 'advanced'     && 'bg-red-400',
          game.skill_level === 'open'         && 'bg-accent',
        )} />

        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground truncate leading-tight">{game.title}</p>
              {/* Date + court — the most scannable info for repeat users */}
              {dateLabel && (
                <p className="text-xs font-semibold text-primary mt-0.5">{dateLabel}</p>
              )}
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {court?.name ?? 'Open venue'}
              </p>
            </div>

            <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
              {isCancelled ? (
                <Badge variant="destructive">Cancelled</Badge>
              ) : isFull ? (
                <Badge variant="destructive">Full</Badge>
              ) : (
                <SpotsIndicator current={game.current_players} max={game.max_players} />
              )}
              {showRole && (
                <Badge
                  variant={showRole === 'hosting' ? 'secondary' : 'outline'}
                  className="capitalize text-xs"
                >
                  {showRole === 'hosting' ? <><Crown aria-hidden="true" /> Hosting</> : 'Joined'}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className={cn(
              'text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize',
              SKILL_COLORS[game.skill_level] ?? SKILL_COLORS.open
            )}>
              {game.skill_level}
            </span>
            {game.host_type === 'owner' ? (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                Open Play
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">
                by {host?.name ?? 'Player'}
              </span>
            )}
            {game.price_per_head > 0 && (
              <span className="text-xs font-semibold text-foreground ml-auto">
                ₱{(game.price_per_head / 100).toLocaleString()}/head
              </span>
            )}
            {game.price_per_head === 0 && !isFull && !isCancelled && (
              <span className="text-xs text-muted-foreground ml-auto">
                {spotsLeft} spot{spotsLeft !== 1 ? 's' : ''} left
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
