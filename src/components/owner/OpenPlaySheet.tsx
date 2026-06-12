'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sheet } from '@/components/ui/bottom-sheet'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import type { SkillLevel } from '@/types'

interface OpenPlaySheetProps {
  open: boolean
  onClose: () => void
  courtId: string
  // Either an existing available slot or a new cell
  slotId?: string
  date?: string
  startHour?: number
  endHour?: number
}

const SKILL_LEVELS: { value: SkillLevel; label: string }[] = [
  { value: 'open',         label: 'Open (all levels)' },
  { value: 'beginner',     label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced',     label: 'Advanced' },
]

export function OpenPlaySheet({
  open, onClose, courtId, slotId, date, startHour, endHour,
}: OpenPlaySheetProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [skillLevel, setSkillLevel] = useState<SkillLevel>('open')
  const [maxPlayers, setMaxPlayers] = useState(4)
  const [pricePerHead, setPricePerHead] = useState('')   // display in pesos, send centavos

  async function handleCreate() {
    setError(''); setSaving(true)
    try {
      const res = await fetch('/api/games/open-play', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courtId,
          slotId,
          date,
          startHour,
          endHour,
          skillLevel,
          maxPlayers,
          pricePerHead: Math.round((parseFloat(pricePerHead) || 0) * 100), // pesos → centavos
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      router.refresh()
      onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create open play')
    } finally { setSaving(false) }
  }

  const dateLabel = date
    ? new Date(date).toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' })
    : ''
  const timeLabel = startHour != null && endHour != null
    ? `${String(startHour).padStart(2, '0')}:00 – ${String(endHour).padStart(2, '0')}:00`
    : ''

  return (
    <Sheet open={open} onClose={onClose} title="New Open Play">
      <div className="flex flex-col gap-4">
        {/* Time context */}
        {(dateLabel || timeLabel) && (
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-3">
            <p className="text-sm font-medium text-foreground">{dateLabel}</p>
            {timeLabel && <p className="text-xs text-muted-foreground mt-0.5">{timeLabel}</p>}
          </div>
        )}

        {/* Skill level */}
        <div className="flex flex-col gap-1.5">
          <Label>Skill level</Label>
          <div className="grid grid-cols-2 gap-2">
            {SKILL_LEVELS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setSkillLevel(value)}
                className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  skillLevel === value
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background border-border text-foreground hover:bg-muted'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Capacity */}
        <div className="flex flex-col gap-1.5">
          <Label>Capacity (4–8 players)</Label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMaxPlayers(p => Math.max(4, p - 1))}
              className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-lg hover:bg-muted disabled:opacity-40"
              disabled={maxPlayers <= 4}
            >−</button>
            <span className="text-xl font-semibold tabular-nums w-6 text-center">{maxPlayers}</span>
            <button
              onClick={() => setMaxPlayers(p => Math.min(8, p + 1))}
              className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-lg hover:bg-muted disabled:opacity-40"
              disabled={maxPlayers >= 8}
            >+</button>
          </div>
        </div>

        {/* Price per head */}
        <div className="flex flex-col gap-1.5">
          <Label>Price per player (₱)</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₱</span>
            <input
              type="number"
              min="0"
              step="10"
              value={pricePerHead}
              onChange={e => setPricePerHead(e.target.value)}
              placeholder="0"
              className="flex h-9 w-full rounded-md border border-input bg-background pl-7 pr-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <p className="text-xs text-muted-foreground">5% platform fee applies · set 0 for free entry</p>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button onClick={handleCreate} disabled={saving} className="w-full">
          {saving ? 'Creating…' : 'Create Open Play'}
        </Button>
      </div>
    </Sheet>
  )
}
