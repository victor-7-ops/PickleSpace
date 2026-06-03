'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { GamePlayer } from '@/types'

interface GamePlayersProps {
  gameId: string
  maxPlayers: number
  initialPlayers: GamePlayer[]
  hostId: string
}

export function GamePlayers({ gameId, maxPlayers, initialPlayers, hostId }: GamePlayersProps) {
  const [players, setPlayers] = useState<GamePlayer[]>(initialPlayers)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`game-players-${gameId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'game_players', filter: `game_id=eq.${gameId}` },
        payload => {
          setPlayers(prev => {
            if (payload.eventType === 'INSERT') return [...prev, payload.new as GamePlayer]
            if (payload.eventType === 'DELETE')
              return prev.filter(p => p.id !== payload.old.id)
            return prev
          })
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [gameId])

  const filledCount = players.filter(p => p.status === 'joined').length
  const emptySlots = Math.max(0, maxPlayers - filledCount)

  return (
    <div className="bg-gray-50 rounded-2xl p-4">
      <p className="text-sm font-semibold text-gray-700 mb-3">
        Players ({filledCount}/{maxPlayers})
      </p>

      {/* Avatar row */}
      <div className="flex gap-2 mb-4">
        {players.filter(p => p.status === 'joined').map(p => {
          const player = p.player as { name?: string } | null
          const initials = (player?.name ?? 'P').slice(0, 1).toUpperCase()
          const isHost = p.player_id === hostId
          return (
            <div key={p.id} title={player?.name ?? 'Player'}
              className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 ${
                isHost ? 'bg-green-600 ring-2 ring-green-300' : 'bg-blue-500'
              }`}>
              {initials}
            </div>
          )
        })}
        {Array.from({ length: emptySlots }).map((_, i) => (
          <div key={`empty-${i}`}
            className="w-10 h-10 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-300 flex-shrink-0">
            +
          </div>
        ))}
      </div>

      {/* Player name list */}
      <div className="flex flex-col gap-1.5">
        {players.filter(p => p.status === 'joined').map(p => {
          const player = p.player as { name?: string } | null
          const isHost = p.player_id === hostId
          return (
            <div key={p.id} className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isHost ? 'bg-green-600' : 'bg-blue-500'}`} />
              <span className="text-sm text-gray-700">{player?.name ?? 'Player'}</span>
              {isHost && <span className="text-xs text-green-600 font-medium">(host)</span>}
            </div>
          )
        })}
        {Array.from({ length: emptySlots }).map((_, i) => (
          <div key={`empty-name-${i}`} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-gray-200 flex-shrink-0" />
            <span className="text-sm text-gray-300">Open spot</span>
          </div>
        ))}
      </div>
    </div>
  )
}
