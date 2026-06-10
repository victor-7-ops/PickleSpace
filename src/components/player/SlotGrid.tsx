'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'motion/react'
import { useSlotRealtime } from '@/hooks/useSlotRealtime'
import type { Slot } from '@/types'

interface SlotGridProps {
  courtId: string
  courtSlug: string        // court [id] for URL construction
  initialSlots: Slot[]
  selectedDate: string     // YYYY-MM-DD
  hourlyRate: number
}

export function SlotGrid({ courtId, courtSlug, initialSlots, selectedDate, hourlyRate }: SlotGridProps) {
  const router = useRouter()
  const [holding, setHolding] = useState<string | null>(null)
  const [error, setError] = useState('')

  // Merge initial + realtime (realtime wins on same key)
  const realtimeSlots = useSlotRealtime(courtId, selectedDate)
  const slotMap = new Map<string, Slot>()
  initialSlots.forEach(s => slotMap.set(s.id, s))
  realtimeSlots.forEach(s => slotMap.set(s.id, s))
  const slots = Array.from(slotMap.values())
    .filter(s => s.date === selectedDate)
    .sort((a, b) => a.start_time.localeCompare(b.start_time))

  const available = slots.filter(s => s.status === 'available')
  const unavailable = slots.filter(s => s.status !== 'available')

  async function handleSlotTap(slot: Slot) {
    if (slot.status !== 'available') return
    setError('')
    setHolding(slot.id)

    try {
      const res = await fetch('/api/slots/hold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slotId: slot.id }),
      })
      const json = await res.json()

      if (res.status === 401) {
        router.push(`/login?next=/courts/${courtSlug}/book?slot=${slot.id}`)
        return
      }
      if (!res.ok) {
        setError(json.error ?? 'Slot no longer available')
        setHolding(null)
        return
      }

      router.push(`/courts/${courtSlug}/book?slot=${slot.id}`)
    } catch {
      setError('Something went wrong — try again')
      setHolding(null)
    }
  }

  function formatTime(t: string) {
    const [h, m] = t.split(':').map(Number)
    const period = h < 12 ? 'am' : 'pm'
    const hour = h === 0 ? 12 : h > 12 ? h - 12 : h
    return m === 0 ? `${hour}${period}` : `${hour}:${String(m).padStart(2, '0')}${period}`
  }

  if (slots.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No slots available on this date
      </p>
    )
  }

  return (
    <div>
      {error && (
        <p role="alert" className="text-sm text-destructive mb-3 text-center">{error}</p>
      )}
      <div className="flex flex-col gap-2">
        {available.map(slot => (
          <motion.button
            key={slot.id}
            onClick={() => handleSlotTap(slot)}
            disabled={!!holding}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.1 }}
            className="w-full min-h-[48px] flex items-center justify-between bg-ball-50 border border-ball-300 rounded-lg px-4 py-3 hover:bg-ball-100 transition-colors disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <span className="font-semibold text-court-700 text-sm">
              {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-court-700 tabular-nums">₱{hourlyRate.toLocaleString()}</span>
              {holding === slot.id
                ? <span className="text-xs text-muted-foreground">Holding…</span>
                : <span className="text-xs text-ball-700 font-semibold">Book →</span>
              }
            </div>
          </motion.button>
        ))}
        {unavailable.map(slot => (
          <div key={slot.id}
            className="w-full min-h-[48px] flex items-center justify-between bg-muted border border-border rounded-lg px-4 py-3 opacity-50">
            <span className="text-sm text-muted-foreground">
              {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
            </span>
            <span className="text-xs text-muted-foreground">Unavailable</span>
          </div>
        ))}
      </div>
    </div>
  )
}
