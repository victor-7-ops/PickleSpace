'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sheet } from '@/components/ui/bottom-sheet'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { SkillLevel } from '@/types'

interface OpenGameSheetProps {
  bookingId: string
  bookingAmountPhp: number   // gross booking cost in PHP
  open: boolean
  onClose: () => void
}

const SKILL_OPTIONS: { value: SkillLevel; label: string }[] = [
  { value: 'open',         label: 'Open' },
  { value: 'beginner',     label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced',     label: 'Advanced' },
]

export function OpenGameSheet({ bookingId, bookingAmountPhp, open, onClose }: OpenGameSheetProps) {
  const router = useRouter()
  const [skillLevel, setSkillLevel] = useState<SkillLevel>('open')
  const [capacity, setCapacity] = useState(4)
  const [autoJoin, setAutoJoin] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Auto-calculated per-head price
  const perHeadPhp = bookingAmountPhp / capacity
  // How much the host pays if all non-host spots fill (capacity - 1 joiners)
  const hostEffectiveCost = Math.max(0, bookingAmountPhp - (capacity - 1) * perHeadPhp)

  async function handleSubmit() {
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/games/player-hosted', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, skillLevel, capacity, autoJoin }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Failed to create game')
        return
      }
      onClose()
      router.push(`/games/${json.gameId}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Sheet open={open} title="Open this game" onClose={onClose}>
      <div className="flex flex-col gap-5 pb-2">

        {/* Skill level */}
        <div>
          <p className="text-sm font-semibold text-foreground mb-2">Skill level</p>
          <div className="grid grid-cols-2 gap-2" role="group" aria-label="Skill level">
            {SKILL_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                aria-pressed={skillLevel === opt.value}
                onClick={() => setSkillLevel(opt.value)}
                className={cn(
                  'py-2 rounded-xl text-sm font-medium border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  skillLevel === opt.value
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border text-foreground hover:border-primary/50'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Capacity stepper */}
        <div>
          <p className="text-sm font-semibold text-foreground mb-2">Players (including you)</p>
          <div className="flex items-center gap-4">
            <button
              type="button"
              aria-label="Decrease capacity"
              disabled={capacity <= 2}
              onClick={() => setCapacity(c => Math.max(2, c - 1))}
              className="w-10 h-10 rounded-full border border-border text-xl font-medium flex items-center justify-center hover:bg-muted disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              −
            </button>
            <span className="text-2xl font-bold text-foreground tabular-nums w-6 text-center">{capacity}</span>
            <button
              type="button"
              aria-label="Increase capacity"
              disabled={capacity >= 8}
              onClick={() => setCapacity(c => Math.min(8, c + 1))}
              className="w-10 h-10 rounded-full border border-border text-xl font-medium flex items-center justify-center hover:bg-muted disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              +
            </button>
          </div>
        </div>

        {/* Cost split preview */}
        <div className="bg-secondary rounded-xl p-4 flex flex-col gap-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Your booking cost</span>
            <span className="font-semibold text-foreground tabular-nums">₱{bookingAmountPhp.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Per-head price</span>
            <span className="font-semibold text-primary tabular-nums">₱{perHeadPhp.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          </div>
          <div className="border-t border-border mt-1 pt-1.5 flex justify-between text-sm">
            <span className="text-muted-foreground">If all {capacity - 1} spots fill, you pay</span>
            <span className="font-bold text-foreground tabular-nums">
              ₱{hostEffectiveCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            If fewer join, you cover the difference. Platform takes no fee on player-hosted games.
          </p>
        </div>

        {/* Auto-join toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Anyone can join instantly</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {autoJoin ? 'Players join without your approval' : 'Players request — you approve each one'}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={autoJoin}
            onClick={() => setAutoJoin(v => !v)}
            className={cn(
              'relative w-11 h-6 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              autoJoin ? 'bg-primary' : 'bg-muted'
            )}
          >
            <span
              className={cn(
                'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform',
                autoJoin ? 'translate-x-5' : 'translate-x-0'
              )}
            />
          </button>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button
          variant="power"
          size="lg"
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full"
        >
          {submitting ? 'Opening game…' : 'Open to players'}
        </Button>
      </div>
    </Sheet>
  )
}
