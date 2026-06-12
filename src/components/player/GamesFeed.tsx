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

function matchesFilter(game: Game, filter: string, playerSkillLevel: string): boolean {
  if (game.status === 'cancelled') return false
  switch (filter) {
    case 'my-level':
      // Show user's own level + open-to-all games (default feed behavior)
      return game.skill_level === playerSkillLevel || game.skill_level === 'open'
    case 'open':
      return game.skill_level === 'open'
    case 'beginner':
      return game.skill_level === 'beginner'
    case 'intermediate':
      return game.skill_level === 'intermediate'
    case 'advanced':
      return game.skill_level === 'advanced'
    default: // 'all'
      return true
  }
}

export function GamesFeed({ initialGames, filter, playerSkillLevel }: GamesFeedProps) {
  const [games, setGames] = useState<Game[]>(initialGames)

  useEffect(() => {
    const supabase = createClient()

    // Subscribe to game row changes (status, current_players)
    const gamesChannel = supabase
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

    // Subscribe to game_players to keep current_players in sync without waiting for game row update
    const playersChannel = supabase
      .channel('games-feed-players')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_players' }, payload => {
        const gameId = (payload.new as { game_id?: string })?.game_id
          ?? (payload.old as { game_id?: string })?.game_id
        if (!gameId) return
        // Re-fetch just this game's current_players to stay in sync
        supabase
          .from('games')
          .select('id, current_players, status')
          .eq('id', gameId)
          .single()
          .then(({ data }) => {
            if (!data) return
            setGames(prev =>
              prev.map(g => g.id === gameId ? { ...g, current_players: data.current_players, status: data.status } : g)
            )
          })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(gamesChannel)
      supabase.removeChannel(playersChannel)
    }
  }, [])

  // Default to 'my-level' if no filter set (matches server default)
  const activeFilter = filter || 'my-level'
  const filtered = games.filter(g => matchesFilter(g, activeFilter, playerSkillLevel))

  const grouped = new Map<string, Game[]>()
  for (const game of filtered) {
    const slot = game.slot as { date?: string } | null
    const dateKey = slot?.date ?? 'Unknown'
    if (!grouped.has(dateKey)) grouped.set(dateKey, [])
    grouped.get(dateKey)!.push(game)
  }

  for (const group of Array.from(grouped.values())) {
    group.sort((a, b) => {
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
        <p className="font-medium text-foreground mb-1">No games found</p>
        <p className="text-sm">Try a different skill level filter.</p>
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
