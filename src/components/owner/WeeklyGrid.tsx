'use client'
import { useState } from 'react'
import { useSlotRealtime } from '@/hooks/useSlotRealtime'
import { SlotSheet } from './SlotSheet'
import { GenerateWeekSheet } from './GenerateWeekSheet'
import type { Court, Slot, Booking } from '@/types'

/** Derive visible hour range from actual slot data + 1hr padding each side. Falls back to 6–22. */
function getHourRange(slots: Slot[]): number[] {
  if (slots.length === 0) return Array.from({ length: 17 }, (_, i) => i + 6) // 6am–10pm
  const hours = slots.map(s => parseInt(s.start_time.split(':')[0], 10))
  const endHours = slots.map(s => parseInt(s.end_time.split(':')[0], 10))
  const min = Math.max(0, Math.min(...hours) - 1)
  const max = Math.min(23, Math.max(...endHours))
  return Array.from({ length: max - min + 1 }, (_, i) => i + min)
}

function getWeekDates(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    return d
  })
}

function mondayOf(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  return d
}

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface WeeklyGridProps {
  court: Court
  initialSlots: Slot[]
  bookingsBySlotId: Record<string, Booking>
}

export function WeeklyGrid({ court, initialSlots, bookingsBySlotId }: WeeklyGridProps) {
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()))
  const weekDates = getWeekDates(weekStart)
  const today = new Date().toISOString().split('T')[0]

  const realtimeSlots = useSlotRealtime(court.id, weekDates[0].toISOString().split('T')[0])

  const slotMap = new Map<string, Slot>()
  initialSlots.forEach(s => slotMap.set(`${s.date}-${s.start_time}`, s))
  realtimeSlots.forEach(s => slotMap.set(`${s.date}-${s.start_time}`, s))

  // Dynamic hour range — expands to 24h for round-the-clock courts
  const allSlots = [...initialSlots, ...realtimeSlots]
  const HOURS = getHourRange(allSlots)

  const [sheetSlot, setSheetSlot] = useState<Slot | null>(null)
  const [newCell, setNewCell] = useState<{ date: string; hour: number } | null>(null)
  const [generateOpen, setGenerateOpen] = useState(false)

  // Slot status colors kept as raw per design spec
  function cellColor(status: Slot['status'] | undefined) {
    if (!status) return 'bg-muted border-border hover:bg-green-50 cursor-pointer'
    if (status === 'available') return 'bg-green-100 border-green-200 hover:bg-green-200 cursor-pointer'
    if (status === 'held')      return 'bg-yellow-100 border-yellow-200 cursor-pointer'
    if (status === 'booked')    return 'bg-blue-100 border-blue-200 cursor-pointer'
    return ''
  }

  function prevWeek() { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d) }
  function nextWeek() { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d) }

  const weekStartStr = weekDates[0].toISOString().split('T')[0]

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button onClick={prevWeek} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">◀</button>
          <span className="text-sm font-medium text-foreground">
            {weekDates[0].toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })} –{' '}
            {weekDates[6].toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
          </span>
          <button onClick={nextWeek} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">▶</button>
        </div>
        <button onClick={() => setGenerateOpen(true)}
          className="text-xs font-semibold text-primary border border-primary/30 px-3 py-1.5 rounded-lg hover:bg-primary/5">
          ⚡ Generate week
        </button>
      </div>

      <div className="flex gap-3 mb-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-100 border border-green-200 inline-block" />Available</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-100 border border-yellow-200 inline-block" />Held</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-100 border border-blue-200 inline-block" />Booked</span>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[480px]">
          {/* Day headers — sticky so they stay visible while scrolling vertically */}
          <div className="grid grid-cols-8 gap-px mb-1">
            <div />
            {weekDates.map((d, i) => {
              const ds = d.toISOString().split('T')[0]
              return (
                <div key={i} className={`text-center text-xs font-medium py-1 ${ds === today ? 'text-primary' : 'text-muted-foreground'}`}>
                  <div>{DAY_SHORT[d.getDay()]}</div>
                  <div className={ds === today ? 'font-bold text-primary' : ''}>{d.getDate()}</div>
                </div>
              )
            })}
          </div>

          {/* 12-hour visible window — scrollable for 24h courts (each row = h-8 = 32px, 12 rows = 384px) */}
          <div className="overflow-y-auto max-h-[384px] no-scrollbar">
          <div className="flex flex-col gap-px">
            {HOURS.map(hour => (
              <div key={hour} className="grid grid-cols-8 gap-px">
                <div className="text-xs text-muted-foreground pr-1 pt-1 text-right">
                  {hour === 12 ? '12pm' : hour < 12 ? `${hour}am` : `${hour - 12}pm`}
                </div>
                {weekDates.map((d, di) => {
                  const dateStr = d.toISOString().split('T')[0]
                  const timeStr = `${String(hour).padStart(2, '0')}:00`
                  const slot = slotMap.get(`${dateStr}-${timeStr}`)
                  return (
                    <div
                      key={di}
                      onClick={() => {
                        if (slot) { setSheetSlot(slot); setNewCell(null) }
                        else { setNewCell({ date: dateStr, hour }); setSheetSlot(null) }
                      }}
                      className={`h-8 rounded border text-[10px] flex items-center justify-center transition-colors ${cellColor(slot?.status)}`}
                    >
                      {slot?.status === 'booked' && '✓'}
                      {slot?.status === 'held' && '…'}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
          </div>{/* end scrollable window */}
        </div>
      </div>

      <SlotSheet
        open={!!sheetSlot || !!newCell}
        onClose={() => { setSheetSlot(null); setNewCell(null) }}
        slot={sheetSlot}
        newSlotDate={newCell?.date}
        newSlotHour={newCell?.hour}
        courtId={court.id}
        defaultRate={court.hourly_rate}
        booking={sheetSlot ? bookingsBySlotId[sheetSlot.id] : null}
      />

      <GenerateWeekSheet
        open={generateOpen}
        onClose={() => setGenerateOpen(false)}
        courtId={court.id}
        weekStart={weekStartStr}
      />
    </>
  )
}
