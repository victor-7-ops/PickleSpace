'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sheet } from '@/components/ui/bottom-sheet'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface GenerateWeekSheetProps {
  open: boolean
  onClose: () => void
  courtId: string
  weekStart: string
}

export function GenerateWeekSheet({ open, onClose, courtId, weekStart }: GenerateWeekSheetProps) {
  const router = useRouter()
  const [openFrom, setOpenFrom] = useState('00:00')
  const [openUntil, setOpenUntil] = useState('23:00')
  const [duration, setDuration] = useState(1)
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5, 6])
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState('')

  function toggleDay(d: number) {
    setDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])
  }

  const slotCount = (() => {
    const [oh] = openFrom.split(':').map(Number)
    const [ch] = openUntil.split(':').map(Number)
    const hoursOpen = ch > oh ? ch - oh : 24 - oh + ch // handles midnight wrap
    const slotsPerDay = Math.max(0, Math.floor(hoursOpen / duration))
    return slotsPerDay * days.length
  })()

  async function handleGenerate() {
    setError(''); setResult(null); setSaving(true)
    try {
      const res = await fetch('/api/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courtId, weekStart, openFrom, openUntil, durationHours: duration, days }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setResult(`Generated ${json.generated} slot${json.generated !== 1 ? 's' : ''}`)
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error generating slots')
    } finally { setSaving(false) }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Generate Week">
      <div className="flex flex-col gap-4">
        <div className="flex gap-3">
          <div className="flex-1 flex flex-col gap-1.5">
            <Label>Open from</Label>
            <input type="time" value={openFrom} onChange={e => setOpenFrom(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring" />
          </div>
          <div className="flex-1 flex flex-col gap-1.5">
            <Label>Until</Label>
            <input type="time" value={openUntil} onChange={e => setOpenUntil(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring" />
          </div>
        </div>

        <div>
          <Label className="mb-2 block">Slot duration</Label>
          <div className="flex gap-2">
            {[1, 2].map(d => (
              <button key={d} onClick={() => setDuration(d)}
                className={cn(
                  'px-4 py-1.5 rounded-lg text-sm border transition-colors',
                  duration === d
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-input text-foreground hover:border-primary/50'
                )}>
                {d} hr
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label className="mb-2 block">Days</Label>
          <div className="flex gap-1.5 flex-wrap">
            {DAY_LABELS.map((label, i) => (
              <button key={i} onClick={() => toggleDay(i)}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-sm border transition-colors',
                  days.includes(i)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-input text-foreground hover:border-primary/50'
                )}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <p className="text-xs text-muted-foreground">Will generate ~{slotCount} slots. Existing slots won&apos;t be overwritten.</p>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {result && <p className="text-sm text-primary font-medium">✓ {result}</p>}

        <Button onClick={handleGenerate} disabled={saving || days.length === 0} className="w-full">
          {saving ? 'Generating…' : `Generate ${slotCount} slots`}
        </Button>
      </div>
    </Sheet>
  )
}
