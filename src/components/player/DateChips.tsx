'use client'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface DateChipsProps {
  selected: string   // YYYY-MM-DD
}

function toDateStr(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function DateChips({ selected }: DateChipsProps) {
  const router = useRouter()
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

  const todayStr = toDateStr(today)
  const tomorrowStr = toDateStr(tomorrow)

  function go(date: string) {
    router.push(`/player/discover?date=${date}`)
  }

  return (
    <div className="flex gap-2 mb-6">
      {[
        { label: 'Today',    date: todayStr },
        { label: 'Tomorrow', date: tomorrowStr },
      ].map(chip => (
        <button key={chip.date} onClick={() => go(chip.date)}
          className={cn(
            'px-4 py-2 rounded-full text-sm font-medium transition-colors',
            selected === chip.date
              ? 'bg-primary text-primary-foreground'
              : 'bg-background border border-border text-muted-foreground hover:border-primary/50'
          )}>
          {chip.label}
        </button>
      ))}
      <label className={cn(
        'flex items-center px-4 py-2 rounded-full text-sm font-medium border cursor-pointer transition-colors',
        selected !== todayStr && selected !== tomorrowStr
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-background border-border text-muted-foreground hover:border-primary/50'
      )}>
        📅 Pick date
        <input type="date" className="sr-only" value={selected}
          min={todayStr}
          onChange={e => e.target.value && go(e.target.value)} />
      </label>
    </div>
  )
}
