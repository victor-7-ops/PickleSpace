import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { GamePlayers } from '@/components/player/GamePlayers'
import { GameActions } from '@/components/player/GameActions'
import type { GamePlayer } from '@/types'

const SKILL_LABELS: Record<string, string> = {
  open: 'Open level', beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced',
}

interface Props {
  params: { id: string }
}

export default async function GameDetailPage({ params }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: rawGame } = await supabase
    .from('games')
    .select('*, slot:slots(date, start_time, end_time), court:courts(name, address), host:users(name)')
    .eq('id', params.id)
    .single()

  if (!rawGame) notFound()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const game = rawGame as any

  const { data: gamePlayers } = await supabase
    .from('game_players')
    .select('*, player:users(name)')
    .eq('game_id', params.id)
    .eq('status', 'joined')

  const players = (gamePlayers ?? []) as GamePlayer[]

  const slot = Array.isArray(game.slot) ? game.slot[0] : game.slot
  const court = Array.isArray(game.court) ? game.court[0] : game.court
  const host = Array.isArray(game.host) ? game.host[0] : game.host

  // Determine CTA state
  type ActionState = 'can-join' | 'joined' | 'full' | 'host' | 'cancelled' | 'unauthenticated'
  let actionState: ActionState = 'can-join'

  if (game.status === 'cancelled') {
    actionState = 'cancelled'
  } else if (!user) {
    actionState = 'unauthenticated'
  } else if (game.host_id === user.id) {
    actionState = 'host'
  } else if (players.some(p => p.player_id === user.id)) {
    actionState = 'joined'
  } else if (game.status === 'full' || game.current_players >= game.max_players) {
    actionState = 'full'
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky header */}
      <header className="sticky top-0 z-30 bg-background border-b border-border px-4 py-3 flex items-center gap-3">
        <Link href="/player/games" className="text-muted-foreground hover:text-foreground text-lg">←</Link>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground truncate">{game.title}</p>
          <p className="text-xs text-muted-foreground">
            {SKILL_LABELS[game.skill_level] ?? 'Open level'} · Hosted by {(host as { name?: string } | null)?.name ?? 'Player'}
          </p>
        </div>
      </header>

      <div className="px-4 py-6 flex flex-col gap-6 max-w-lg mx-auto">
        {/* Court + time */}
        <div className="bg-secondary rounded-2xl p-4">
          <p className="font-semibold text-foreground">{(court as { name?: string } | null)?.name}</p>
          <p className="text-sm text-muted-foreground mt-0.5">
            {(slot as { date?: string } | null)?.date} · {(slot as { start_time?: string } | null)?.start_time} – {(slot as { end_time?: string } | null)?.end_time}
          </p>
          {(court as { address?: string } | null)?.address && (
            <p className="text-xs text-muted-foreground mt-1">📍 {(court as { address: string }).address}</p>
          )}
        </div>

        {/* Players */}
        <GamePlayers
          gameId={game.id}
          maxPlayers={game.max_players}
          initialPlayers={players}
          hostId={game.host_id}
        />

        {/* Description */}
        {game.description && (
          <div>
            <p className="text-sm font-semibold text-foreground mb-1">About this game</p>
            <p className="text-sm text-muted-foreground">{game.description}</p>
          </div>
        )}

        {/* CTA */}
        <GameActions gameId={game.id} actionState={actionState} />
      </div>
    </div>
  )
}
