'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sheet } from '@/components/ui/bottom-sheet'
import { QRScanner } from './QRScanner'
import type { Game, GamePlayer } from '@/types'

interface GameRosterCardProps {
  game: Game & { game_players: (GamePlayer & { player: { name: string; phone?: string } | null })[] }
}

const SKILL_COLORS: Record<string, string> = {
  open: 'bg-muted text-muted-foreground',
  beginner: 'bg-green-100 text-green-800',
  intermediate: 'bg-yellow-100 text-yellow-800',
  advanced: 'bg-red-100 text-red-800',
}

const PLAYER_STATUS_LABEL: Record<string, string> = {
  joined: 'Joined',
  waitlisted: 'Waitlisted',
  attended: 'Attended ✓',
  no_show: 'No-show',
  left: 'Left',
}

export function GameRosterCard({ game }: GameRosterCardProps) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)
  const [scanPlayerId, setScanPlayerId] = useState<string | null>(null)
  const [completing, setCompleting] = useState(false)
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set())
  const [error, setError] = useState('')

  const activePlayers = game.game_players.filter(p => ['joined', 'waitlisted', 'attended'].includes(p.status))
  const timeLabel = game.slot
    ? `${game.slot.start_time} – ${game.slot.end_time}`
    : ''
  const dateLabel = game.slot
    ? new Date(game.slot.date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
    : ''
  const priceLabel = game.price_per_head > 0
    ? `₱${(game.price_per_head / 100).toLocaleString()}/head`
    : 'Free'

  async function handleScan(gamePlayerId: string, qrCode: string) {
    setScanPlayerId(null)
    // The QR code IS the game_player id (owner scans player's QR)
    const res = await fetch('/api/games/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gamePlayerId: qrCode }),
    })
    if (res.ok) router.refresh()
    else {
      const json = await res.json()
      setError(json.error ?? 'Check-in failed')
    }
  }

  async function handleMarkPaid(gp: GamePlayer) {
    setLoadingIds(prev => new Set(prev).add(gp.id))
    await fetch(`/api/games/${game.id}/players/${gp.id}/mark-paid`, { method: 'POST' })
    setLoadingIds(prev => { const s = new Set(prev); s.delete(gp.id); return s })
    router.refresh()
  }

  async function handleComplete() {
    setCompleting(true); setError('')
    const res = await fetch(`/api/games/${game.id}/complete`, { method: 'POST' })
    if (res.ok) router.refresh()
    else {
      const json = await res.json()
      setError(json.error ?? 'Failed to complete')
    }
    setCompleting(false)
  }

  return (
    <>
      <Card>
        <CardContent className="p-4">
          {/* Header row */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-foreground truncate">{game.title}</p>
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded capitalize ${SKILL_COLORS[game.skill_level]}`}>
                  {game.skill_level}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">{dateLabel} · {timeLabel}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {activePlayers.length}/{game.max_players} players · {priceLabel}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge
                variant={game.status === 'open' ? 'secondary' : game.status === 'full' ? 'outline' : 'destructive'}
                className="capitalize"
              >
                {game.status}
              </Badge>
              <button
                onClick={() => setExpanded(e => !e)}
                className="p-1 rounded hover:bg-muted text-muted-foreground"
                aria-label={expanded ? 'Collapse roster' : 'Expand roster'}
              >
                {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </div>
          </div>

          {/* Roster */}
          {expanded && (
            <div className="mt-3 border-t border-border pt-3 flex flex-col gap-2">
              {game.game_players.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-2">No players yet</p>
              )}
              {game.game_players.map(gp => {
                const name = gp.player?.name ?? 'Player'
                const isCashUnpaid = gp.payment_method === 'cash' && gp.payment_status === 'unpaid'
                const canCheckin = gp.status === 'joined'
                return (
                  <div key={gp.id} className="flex items-center justify-between gap-2 py-1">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{name}</p>
                      <p className="text-xs text-muted-foreground">
                        {PLAYER_STATUS_LABEL[gp.status]} ·{' '}
                        <span className={gp.payment_status === 'paid' ? 'text-primary' : ''}>
                          {gp.payment_method ?? 'cash'} · {gp.payment_status}
                        </span>
                      </p>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      {isCashUnpaid && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMarkPaid(gp)}
                          disabled={loadingIds.has(gp.id)}
                        >
                          {loadingIds.has(gp.id) ? '…' : 'Mark Paid'}
                        </Button>
                      )}
                      {canCheckin && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setScanPlayerId(gp.id)}
                        >
                          Scan QR
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}

              {error && <p className="text-xs text-destructive mt-1">{error}</p>}

              {/* Complete session */}
              {(game.status === 'open' || game.status === 'full') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleComplete}
                  disabled={completing}
                  className="mt-2 w-full border-primary/30 text-primary hover:bg-primary/5"
                >
                  {completing ? 'Completing…' : '✓ Complete Session'}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Per-player QR scanner */}
      {scanPlayerId && (
        <Sheet open title="Scan Player QR" onClose={() => setScanPlayerId(null)}>
          <QRScanner
            onResult={qrCode => handleScan(scanPlayerId, qrCode)}
            onClose={() => setScanPlayerId(null)}
          />
        </Sheet>
      )}
    </>
  )
}
