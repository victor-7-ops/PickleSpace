import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { GameCard } from '@/components/player/GameCard'
import { GamesFilter } from '@/components/player/GamesFilter'
import { GamesFeed } from '@/components/player/GamesFeed'
import type { Game } from '@/types'

interface Props {
  searchParams: { tab?: string; filter?: string }
}

export default async function PlayerGamesPage({ searchParams }: Props) {
  const tab = searchParams.tab === 'mine' ? 'mine' : 'discover'
  const filter = searchParams.filter ?? 'all'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('users')
    .select('skill_level')
    .eq('id', user!.id)
    .single()

  const playerSkillLevel = (profile?.skill_level as string) ?? 'open'

  // Fetch open games with slot + court + host info for Discover tab
  const { data: openGames } = await supabase
    .from('games')
    .select('*, slot:slots(date, start_time, end_time), court:courts(name, city), host:users(name)')
    .eq('status', 'open')
    .order('created_at', { ascending: true })
    .limit(100)

  // Fetch player's own game memberships for My Games tab
  const { data: myGamePlayers } = await supabase
    .from('game_players')
    .select('game_id, status, game:games(*, slot:slots(date, start_time, end_time), court:courts(name), host:users(name))')
    .eq('player_id', user!.id)

  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  const myGames = (myGamePlayers ?? [])
    .map(gp => {
      const game = (Array.isArray(gp.game) ? gp.game[0] : gp.game) as Game | null
      if (!game || game.status === 'cancelled') return null
      const role = game.host_id === user!.id ? 'hosting' as const : 'joined' as const
      return { game, role }
    })
    .filter((item): item is { game: Game; role: 'hosting' | 'joined' } => item !== null)

  const upcoming = myGames
    .filter(({ game }) => ((game.slot as { date?: string } | null)?.date ?? '') >= today)
    .sort((a, b) =>
      ((a.game.slot as { date?: string } | null)?.date ?? '').localeCompare(
        (b.game.slot as { date?: string } | null)?.date ?? ''
      )
    )

  const past = myGames
    .filter(({ game }) => ((game.slot as { date?: string } | null)?.date ?? '') < today)
    .sort((a, b) =>
      ((b.game.slot as { date?: string } | null)?.date ?? '').localeCompare(
        (a.game.slot as { date?: string } | null)?.date ?? ''
      )
    )

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">Games</h1>
        {tab === 'discover' && (
          <Link href="/games/new"
            className="bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-green-700 transition-colors">
            + Post Game
          </Link>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-4">
        {[
          { key: 'discover', label: 'Discover' },
          { key: 'mine',     label: 'My Games' },
        ].map(t => (
          <a key={t.key} href={`/player/games?tab=${t.key}`}
            className={`flex-1 py-2 text-center text-sm font-medium transition-colors ${
              tab === t.key
                ? 'text-green-700 border-b-2 border-green-600'
                : 'text-gray-400 hover:text-gray-600'
            }`}>
            {t.label}
          </a>
        ))}
      </div>

      {tab === 'discover' ? (
        <>
          <GamesFilter playerSkillLevel={playerSkillLevel} />
          <GamesFeed
            initialGames={(openGames ?? []) as Game[]}
            filter={filter}
            playerSkillLevel={playerSkillLevel}
          />
        </>
      ) : (
        <div className="flex flex-col gap-6">
          {myGames.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-4xl mb-3">🏓</p>
              <p className="font-medium text-gray-600 mb-1">No games yet</p>
              <p className="text-sm mb-4">Browse Discover to find a game to join.</p>
              <a href="/player/games?tab=discover"
                className="bg-green-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-green-700">
                Browse games
              </a>
            </div>
          ) : (
            <>
              {upcoming.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Upcoming</p>
                  <div className="flex flex-col gap-3">
                    {upcoming.map(({ game, role }) => (
                      <GameCard key={game.id} game={game} showRole={role} />
                    ))}
                  </div>
                </div>
              )}
              {past.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Past</p>
                  <div className="flex flex-col gap-3">
                    {past.map(({ game, role }) => (
                      <GameCard key={game.id} game={game} showRole={role} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
