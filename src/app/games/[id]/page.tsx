import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, MapPin } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { GamePlayers } from '@/components/player/GamePlayers'
import { GameActions } from '@/components/player/GameActions'
import { QRDisplay } from '@/components/player/QRDisplay'
import { HostRosterPanel } from '@/components/player/HostRosterPanel'
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
    .in('status', ['joined', 'waitlisted'])

  const players = (gamePlayers ?? []) as GamePlayer[]
  const joinedPlayers = players.filter(p => p.status === 'joined')
  const waitlistedPlayers = players.filter(p => p.status === 'waitlisted')

  // Fetch the current user's game_players row for QR display
  let myGamePlayer: { id: string; status: string; payment_status: string; payment_method: string | null } | null = null
  if (user) {
    const { data: myRow } = await supabase
      .from('game_players')
      .select('id, status, payment_status, payment_method')
      .eq('game_id', params.id)
      .eq('player_id', user.id)
      .neq('status', 'left')
      .maybeSingle()
    myGamePlayer = myRow
  }

  const slot = Array.isArray(game.slot) ? game.slot[0] : game.slot
  const court = Array.isArray(game.court) ? game.court[0] : game.court
  const host = Array.isArray(game.host) ? game.host[0] : game.host

  // Determine CTA state
  type ActionState = 'can-join' | 'joined' | 'waitlisted' | 'pending-approval' | 'full' | 'host' | 'cancelled' | 'unauthenticated'
  let actionState: ActionState = 'can-join'
  const autoJoin: boolean = game.auto_join ?? true

  if (game.status === 'cancelled') {
    actionState = 'cancelled'
  } else if (!user) {
    actionState = 'unauthenticated'
  } else if (game.host_id === user.id) {
    actionState = 'host'
  } else if (myGamePlayer?.status === 'waitlisted' && !autoJoin) {
    actionState = 'pending-approval'
  } else if (myGamePlayer?.status === 'waitlisted') {
    actionState = 'waitlisted'
  } else if (myGamePlayer?.status === 'joined' || myGamePlayer?.status === 'attended') {
    actionState = 'joined'
  } else if (game.status === 'full' || game.current_players >= game.max_players) {
    actionState = 'full'
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky header */}
      <header className="sticky top-0 z-30 bg-card elevation-1 court-line px-4 py-3 flex items-center gap-2">
        <Link
          href="/player/games"
          aria-label="Back to games"
          className="w-11 h-11 -ml-2 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronLeft size={22} aria-hidden="true" />
        </Link>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground truncate">{game.title}</p>
          <p className="text-xs text-muted-foreground">
            {SKILL_LABELS[game.skill_level] ?? 'Open level'} · Hosted by {(host as { name?: string } | null)?.name ?? 'Player'}
          </p>
        </div>
      </header>

      <div className="px-4 py-6 flex flex-col gap-6 max-w-lg mx-auto">
        {/* Court + time */}
        <div className="bg-secondary court-line rounded-lg p-4">
          <p className="font-semibold text-foreground">{(court as { name?: string } | null)?.name}</p>
          <p className="text-sm text-muted-foreground mt-0.5">
            {(slot as { date?: string } | null)?.date} · {(slot as { start_time?: string } | null)?.start_time} – {(slot as { end_time?: string } | null)?.end_time}
          </p>
          {(court as { address?: string } | null)?.address && (
            <p className="text-xs text-muted-foreground mt-1 inline-flex items-center gap-1">
              <MapPin size={12} aria-hidden="true" /> {(court as { address: string }).address}
            </p>
          )}
        </div>

        {/* Players */}
        <GamePlayers
          gameId={game.id}
          maxPlayers={game.max_players}
          initialPlayers={joinedPlayers}
          hostId={game.host_id}
        />

        {/* Cost split (player-hosted paid games) */}
        {game.host_type === 'player' && game.price_per_head > 0 && (
          <div className="bg-secondary rounded-lg p-4">
            <p className="text-sm font-semibold text-foreground mb-2">Cost split</p>
            <div className="flex flex-col gap-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Per player</span>
                <span className="font-semibold text-primary tabular-nums">
                  ₱{(game.price_per_head / 100).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total court cost</span>
                <span className="text-foreground tabular-nums">
                  ₱{((game.price_per_head / 100) * game.max_players).toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-muted-foreground border-t border-border pt-1.5 mt-0.5">
                Host covers any unfilled spots. No platform fee.
                {!autoJoin && ' Host must approve each join request.'}
              </p>
            </div>
          </div>
        )}

        {/* Description */}
        {game.description && (
          <div>
            <p className="text-sm font-semibold text-foreground mb-1">About this game</p>
            <p className="text-sm text-muted-foreground">{game.description}</p>
          </div>
        )}

        {/* Player check-in QR */}
        {myGamePlayer && (
          myGamePlayer.status === 'waitlisted' ? (
            <div className="bg-secondary rounded-lg p-4 text-center">
              <p className="font-medium text-foreground">You're on the waitlist</p>
              <p className="text-sm text-muted-foreground mt-1">We'll email you if a spot opens up</p>
            </div>
          ) : myGamePlayer.payment_status === 'pending' ? (
            <div className="bg-secondary rounded-lg p-4 text-center">
              <p className="font-medium text-foreground">Payment pending</p>
              <p className="text-sm text-muted-foreground mt-1">Complete your GCash/card payment to confirm your spot</p>
            </div>
          ) : ['joined', 'attended'].includes(myGamePlayer.status) ? (
            <div>
              <p className="text-sm font-semibold text-foreground mb-3">
                Your check-in QR
                {myGamePlayer.status === 'attended' && (
                  <span className="ml-2 text-xs text-primary font-normal">Attended ✓</span>
                )}
              </p>
              <QRDisplay
                token={myGamePlayer.id}
                courtName={(court as { name?: string } | null)?.name ?? ''}
                date={(slot as { date?: string } | null)?.date ?? ''}
                startTime={(slot as { start_time?: string } | null)?.start_time ?? ''}
                endTime={(slot as { end_time?: string } | null)?.end_time ?? ''}
              />
              {myGamePlayer.payment_method === 'cash' && myGamePlayer.payment_status === 'unpaid' && game.price_per_head > 0 && (
                <p className="text-xs text-center text-muted-foreground mt-2">
                  Pay ₱{(game.price_per_head / 100).toLocaleString()} cash to the host at check-in
                </p>
              )}
            </div>
          ) : null
        )}

        {/* Host roster management (player-hosted games) */}
        {actionState === 'host' && game.host_type === 'player' && (
          <HostRosterPanel
            gameId={game.id}
            autoJoin={autoJoin}
            joinedPlayers={joinedPlayers as (GamePlayer & { player: { name: string } | null })[]}
            waitlistedPlayers={waitlistedPlayers as (GamePlayer & { player: { name: string } | null })[]}
          />
        )}

        {/* CTA */}
        <GameActions gameId={game.id} actionState={actionState} />
      </div>
    </div>
  )
}
