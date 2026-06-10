'use client'
import { useEffect, useState } from 'react'
import { Swords } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { GameCard } from './GameCard'
import type { Game } from '@/types'

interface GamesFeedProps {
  initialGames: Game[]
  filter: string
  playerSkillLevel: string
}

function localDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function dateLabel(dateStr: string): string {
  const now = new Date()
  const today = localDateStr(now)
  const tom = new Date(now); tom.setDate(now.getDate() + 1)
  const tomorrow = localDateStr(tom)
  if (dateStr === today) return 'Today'
  if (dateStr === tomorrow) return 'Tomorrow'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-PH', { weekday: 'long', month: 'short', day: 'numeric' })
}

export function GamesFeed({ initialGames, filter, playerSkillLevel }: GamesFeedProps) {
  const [games, setGames] = useState<Game[]>(initialGames)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('games-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'games' }, payload => {
        setGames(prev => {
          if (payload.eventType === 'INSERT') return [...prev, payload.new as Game]
          if (payload.eventType === 'UPDATE')
            return prev.map(g => g.id === payload.new.id ? { ...g, ...payload.new } : g)
          if (payload.eventType === 'DELETE')
            return prev.filter(g => g.id !== payload.old.id)
          return prev
        })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const filtered = games.filter(g => {
    if (g.status === 'cancelled') return false
    if (filter === 'open') return g.status === 'open'
    if (filter === 'my-level') return g.skill_level === playerSkillLevel || g.skill_level === 'open'
    return true
  })

  const grouped = new Map<string, Game[]>()
  for (const game of filtered) {
    const slot = game.slot as { date?: string } | null
    const dateKey = slot?.date ?? 'Unknown'
    if (!grouped.has(dateKey)) grouped.set(dateKey, [])
    grouped.get(dateKey)!.push(game)
  }

  for (const group of Array.from(grouped.values())) {
    group.sort((a: Game, b: Game) => {
      const aTime = (a.slot as { start_time?: string } | null)?.start_time ?? ''
      const bTime = (b.slot as { start_time?: string } | null)?.start_time ?? ''
      return aTime.localeCompare(bTime)
    })
  }

  const sortedDates = Array.from(grouped.keys()).sort()

  if (sortedDates.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-3">
          <Swords size={28} className="text-primary" aria-hidden="true" />
        </div>
        <p className="font-medium text-foreground mb-1">No open games</p>
        <p className="text-sm">Be the first to post one!</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {sortedDates.map(date => (
        <div key={date}>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">
            {dateLabel(date)}
          </p>
          <div className="flex flex-col gap-3">
            {grouped.get(date)!.map(game => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
