'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sheet } from '@/components/ui/bottom-sheet'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import type { Slot, Booking } from '@/types'

interface SlotSheetProps {
  open: boolean
  onClose: () => void
  slot?: Slot | null
  newSlotDate?: string
  newSlotHour?: number
  courtId: string
  defaultRate: number
  booking?: Booking | null
}

export function SlotSheet({ open, onClose, slot, newSlotDate, newSlotHour, courtId, defaultRate, booking }: SlotSheetProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [startHour, setStartHour] = useState(newSlotHour ?? 6)
  const [endHour, setEndHour] = useState((newSlotHour ?? 6) + 1)

  const date = slot?.date ?? newSlotDate ?? ''
  const isReadOnly = slot && (slot.status === 'booked' || slot.status === 'held')
  const isExisting = !!slot

  async function handleCreate() {
    setError(''); setSaving(true)
    try {
      const start = `${String(startHour).padStart(2, '0')}:00`
      const end = `${String(endHour).padStart(2, '0')}:00`
      const res = await fetch('/api/slots/single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courtId, date, start_time: start, end_time: end }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      router.refresh(); onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error creating slot')
    } finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!slot) return
    setError(''); setSaving(true)
    try {
      const res = await fetch(`/api/slots/${slot.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      router.refresh(); onClose()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error deleting slot')
    } finally { setSaving(false) }
  }

  const title = isReadOnly ? 'Booking Details' : isExisting ? 'Available Slot' : 'Create Slot'

  return (
    <Sheet open={open} onClose={onClose} title={title}>
      {isReadOnly && booking ? (
        <div className="flex flex-col gap-3">
          {/* Slot status colors kept as raw per design spec */}
          <div className="bg-blue-50 rounded-xl p-4">
            <p className="font-semibold text-blue-900">{(booking.player as { name?: string } | undefined)?.name ?? 'Player'}</p>
            <p className="text-sm text-blue-700 mt-1">{slot?.start_time} – {slot?.end_time}</p>
            <p className="text-sm text-blue-600 mt-1">Booking ID: {booking.id.slice(0, 8)}…</p>
          </div>
          {slot?.status === 'held' && slot.hold_expires_at && (
            <p className="text-xs text-yellow-600 text-center">
              Hold expires at {new Date(slot.hold_expires_at).toLocaleTimeString()}
            </p>
          )}
        </div>
      ) : isExisting ? (
        <div className="flex flex-col gap-4">
          <div className="bg-ball-50 court-line rounded-lg p-4">
            <p className="text-sm text-ball-700">{date}</p>
            <p className="font-semibold text-court-700">{slot!.start_time} – {slot!.end_time}</p>
            <p className="text-sm text-ball-700 mt-1 tabular-nums">₱{defaultRate.toLocaleString()}/hr</p>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button variant="destructive" onClick={handleDelete} disabled={saving} className="w-full">
            {saving ? 'Deleting…' : 'Delete Slot'}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">{date}</p>
          <div className="flex gap-3">
            <div className="flex-1 flex flex-col gap-1.5">
              <Label>Start</Label>
              <select value={startHour} onChange={e => setStartHour(Number(e.target.value))}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
                {Array.from({ length: 16 }, (_, i) => i + 6).map(h => (
                  <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
                ))}
              </select>
            </div>
            <div className="flex-1 flex flex-col gap-1.5">
              <Label>End</Label>
              <select value={endHour} onChange={e => setEndHour(Number(e.target.value))}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring">
                {Array.from({ length: 16 }, (_, i) => i + 7).map(h => (
                  <option key={h} value={h} disabled={h <= startHour}>{String(h).padStart(2, '0')}:00</option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Rate: ₱{defaultRate.toLocaleString()}/hr (from court default)</p>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button onClick={handleCreate} disabled={saving || endHour <= startHour} className="w-full">
            {saving ? 'Creating…' : 'Create Slot'}
          </Button>
        </div>
      )}
    </Sheet>
  )
}
