import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { GamePlayer } from '@/types'

interface UseGameRealtimeResult {
  players: GamePlayer[]
  joinedCount: number
}

// Subscribes to game_players changes for a single game.
// Used on game detail pages to show live roster / count.
// For the feed, GamesFeed subscribes to the games table directly (current_players column).
export function useGameRealtime(gameId: string): UseGameRealtimeResult {
  const [players, setPlayers] = useState<GamePlayer[]>([])
  const supabase = createClient()

  useEffect(() => {
    // Initial fetch
    supabase
      .from('game_players')
      .select('*, player:users(name, avatar_url, skill_level)')
      .eq('game_id', gameId)
      .in('status', ['joined', 'waitlisted', 'attended'])
      .order('joined_at')
      .then(({ data }) => { if (data) setPlayers(data as GamePlayer[]) })

    const channel = supabase
      .channel(`game-players:${gameId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_players',
          filter: `game_id=eq.${gameId}`,
        },
        (payload) => {
          setPlayers(prev => {
            if (payload.eventType === 'INSERT') return [...prev, payload.new as GamePlayer]
            if (payload.eventType === 'UPDATE')
              return prev.map(p => p.id === payload.new.id ? { ...p, ...payload.new } : p)
            if (payload.eventType === 'DELETE')
              return prev.filter(p => p.id !== payload.old.id)
            return prev
          })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [gameId])

  const joinedCount = players.filter(p => p.status === 'joined' || p.status === 'attended').length

  return { players, joinedCount }
}
