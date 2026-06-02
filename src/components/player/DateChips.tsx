'use client'
import { useRouter } from 'next/navigation'

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
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            selected === chip.date
              ? 'bg-green-600 text-white'
              : 'bg-white border border-gray-200 text-gray-600 hover:border-green-400'
          }`}>
          {chip.label}
        </button>
      ))}
      <label className={`flex items-center px-4 py-2 rounded-full text-sm font-medium border cursor-pointer transition-colors ${
        selected !== todayStr && selected !== tomorrowStr
          ? 'bg-green-600 text-white border-green-600'
          : 'bg-white border-gray-200 text-gray-600 hover:border-green-400'
      }`}>
        📅 Pick date
        <input type="date" className="sr-only" value={selected}
          min={todayStr}
          onChange={e => e.target.value && go(e.target.value)} />
      </label>
    </div>
  )
}
