'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sheet } from '@/components/ui/bottom-sheet'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface GenerateWeekSheetProps {
  open: boolean
  onClose: () => void
  courtId: string
  weekStart: string
}

export function GenerateWeekSheet({ open, onClose, courtId, weekStart }: GenerateWeekSheetProps) {
  const router = useRouter()
  const [openFrom, setOpenFrom] = useState('06:00')
  const [openUntil, setOpenUntil] = useState('22:00')
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
    const slotsPerDay = Math.floor((ch - oh) / duration)
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
          <label className="flex-1 flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-700">Open from</span>
            <input type="time" value={openFrom} onChange={e => setOpenFrom(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </label>
          <label className="flex-1 flex flex-col gap-1">
            <span className="text-sm font-medium text-gray-700">Until</span>
            <input type="time" value={openUntil} onChange={e => setOpenUntil(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </label>
        </div>
        <div>
          <span className="text-sm font-medium text-gray-700">Slot duration</span>
          <div className="flex gap-2 mt-1">
            {[1, 2].map(d => (
              <button key={d} onClick={() => setDuration(d)}
                className={`px-4 py-1.5 rounded-lg text-sm border transition-colors ${
                  duration === d ? 'bg-green-600 text-white border-green-600' : 'border-gray-300 text-gray-700'
                }`}>
                {d} hr
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className="text-sm font-medium text-gray-700">Days</span>
          <div className="flex gap-1.5 mt-1 flex-wrap">
            {DAY_LABELS.map((label, i) => (
              <button key={i} onClick={() => toggleDay(i)}
                className={`px-2.5 py-1 rounded-lg text-sm border transition-colors ${
                  days.includes(i) ? 'bg-green-600 text-white border-green-600' : 'border-gray-300 text-gray-600'
                }`}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs text-gray-400">Will generate ~{slotCount} slots. Existing slots won&apos;t be overwritten.</p>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {result && <p className="text-sm text-green-700 font-medium">✓ {result}</p>}
        <button onClick={handleGenerate} disabled={saving || days.length === 0}
          className="w-full py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold disabled:opacity-40 hover:bg-green-700">
          {saving ? 'Generating…' : `Generate ${slotCount} slots`}
        </button>
      </div>
    </Sheet>
  )
}
