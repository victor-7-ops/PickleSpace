'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { GamePlayer } from '@/types'

interface HostRosterPanelProps {
  gameId: string
  autoJoin: boolean
  joinedPlayers: (GamePlayer & { player: { name: string } | null })[]
  waitlistedPlayers: (GamePlayer & { player: { name: string } | null })[]
}

const PAYMENT_LABEL: Record<string, string> = {
  unpaid: 'cash — unpaid',
  pending: 'payment pending',
  paid: 'paid ✓',
  refund_due: 'refund due',
}

export function HostRosterPanel({ gameId, autoJoin, joinedPlayers, waitlistedPlayers }: HostRosterPanelProps) {
  const router = useRouter()
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set())
  const [error, setError] = useState('')

  function setLoading(id: string, on: boolean) {
    setLoadingIds(prev => {
      const next = new Set(prev)
      on ? next.add(id) : next.delete(id)
      return next
    })
  }

  async function handleApprove(playerId: string) {
    setLoading(playerId, true)
    setError('')
    try {
      const res = await fetch(`/api/games/${gameId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Approval failed'); return }
      router.refresh()
    } finally {
      setLoading(playerId, false)
    }
  }

  async function handleKick(playerId: string) {
    setLoading(playerId, true)
    setError('')
    try {
      const res = await fetch(`/api/games/${gameId}/players/${playerId}/kick`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Failed'); return }
      router.refresh()
    } finally {
      setLoading(playerId, false)
    }
  }

  const pendingRequests = autoJoin ? [] : waitlistedPlayers

  if (joinedPlayers.length === 0 && pendingRequests.length === 0) return null

  return (
    <div className="flex flex-col gap-4">
      {/* Pending approval requests */}
      {pendingRequests.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-foreground mb-2">
            Join requests{' '}
            <span className="ml-1 text-xs bg-primary/10 text-primary rounded-full px-1.5 py-0.5 tabular-nums">
              {pendingRequests.length}
            </span>
          </p>
          <div className="flex flex-col gap-2">
            {pendingRequests.map(gp => (
              <div key={gp.id} className="flex items-center justify-between gap-2 bg-secondary rounded-xl px-3 py-2.5">
                <p className="text-sm font-medium text-foreground truncate">{gp.player?.name ?? 'Player'}</p>
                <div className="flex gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={loadingIds.has(gp.player_id)}
                    onClick={() => handleKick(gp.player_id)}
                    className="text-destructive border-destructive/30 hover:bg-destructive/5"
                  >
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    disabled={loadingIds.has(gp.player_id)}
                    onClick={() => handleApprove(gp.player_id)}
                  >
                    {loadingIds.has(gp.player_id) ? '…' : 'Approve'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Joined players with kick */}
      {joinedPlayers.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-foreground mb-2">Players</p>
          <div className="flex flex-col gap-1.5">
            {joinedPlayers.map(gp => {
              const payLabel = PAYMENT_LABEL[gp.payment_status] ?? gp.payment_status
              return (
                <div key={gp.id} className="flex items-center justify-between gap-2 py-1.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{gp.player?.name ?? 'Player'}</p>
                    <p className={cn(
                      'text-xs',
                      gp.payment_status === 'paid' ? 'text-primary' : 'text-muted-foreground'
                    )}>
                      {payLabel}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={loadingIds.has(gp.player_id)}
                    onClick={() => handleKick(gp.player_id)}
                    className="text-destructive hover:bg-destructive/5 shrink-0"
                  >
                    Remove
                  </Button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
