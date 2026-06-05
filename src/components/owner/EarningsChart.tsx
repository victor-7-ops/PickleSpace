'use client'
import { useState } from 'react'
import { cn } from '@/lib/utils'

interface DailyRevenue { date: string; amount: number }

interface EarningsChartProps {
  data: DailyRevenue[]
  view: 'week' | 'month'
}

export function EarningsChart({ data, view: initialView }: EarningsChartProps) {
  const [view, setView] = useState(initialView)
  const [tooltip, setTooltip] = useState<{ date: string; amount: number } | null>(null)

  const today = new Date()
  const filtered = view === 'week'
    ? data.filter(d => {
        const date = new Date(d.date)
        const weekAgo = new Date(today)
        weekAgo.setDate(today.getDate() - 6)
        return date >= weekAgo
      })
    : data

  const max = Math.max(...filtered.map(d => d.amount), 1)

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-foreground">Revenue</p>
        <div className="flex gap-1">
          {(['week', 'month'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={cn(
                'px-3 py-1 rounded-lg text-xs font-medium capitalize transition-colors',
                view === v ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              )}>
              {v}
            </button>
          ))}
        </div>
      </div>

      {tooltip && (
        <div className="text-center mb-2">
          <span className="text-xs text-muted-foreground">{new Date(tooltip.date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}</span>
          <span className="ml-2 text-sm font-semibold text-primary">₱{tooltip.amount.toLocaleString()}</span>
        </div>
      )}

      <div className="flex items-end gap-1 h-24">
        {filtered.map(d => {
          const heightPct = max > 0 ? (d.amount / max) * 100 : 0
          const isToday = d.date === today.toISOString().split('T')[0]
          return (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-0.5 cursor-pointer"
              onMouseEnter={() => setTooltip(d)}
              onMouseLeave={() => setTooltip(null)}
              onClick={() => setTooltip(tooltip?.date === d.date ? null : d)}>
              <div
                className={cn(
                  'w-full rounded-t transition-colors',
                  isToday ? 'bg-primary' : d.amount > 0 ? 'bg-primary/40' : 'bg-muted'
                )}
                style={{ height: `${Math.max(heightPct, d.amount > 0 ? 8 : 4)}%` }}
              />
            </div>
          )
        })}
      </div>

      <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
        {filtered.length > 0 && (
          <>
            <span>{new Date(filtered[0].date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}</span>
            <span>{new Date(filtered[filtered.length - 1].date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}</span>
          </>
        )}
      </div>
    </div>
  )
}
