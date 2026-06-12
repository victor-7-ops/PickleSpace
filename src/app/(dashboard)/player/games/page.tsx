import { Suspense } from 'react'
import Link from 'next/link'
import { Swords, ChevronRight } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { NavTabs } from '@/components/ui/nav-tabs'
import { createClient } from '@/lib/supabase/server'
import { GameCard } from '@/components/player/GameCard'
import { GamesFilter } from '@/components/player/GamesFilter'
import { GamesFeed } from '@/components/player/GamesFeed'
import { Skeleton } from '@/components/ui/skeleton'
import type { Game } from '@/types'

interface Props {
  searchParams: { tab?: string; filter?: string }
}

function localDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default async function PlayerGamesPage({ searchParams }: Props) {
  const tab = searchParams.tab === 'mine' ? 'mine' : 'discover'
  const filter = searchParams.filter ?? 'my-level'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('users')
    .select('skill_level')
    .eq('id', user!.id)
    .single()

  const playerSkillLevel = (profile?.skill_level as string) ?? 'open'
  const hasSkillLevel = !!profile?.skill_level

  const now = new Date()
  const today = localDateStr(now)
  const sevenDaysLater = new Date(now)
  sevenDaysLater.setDate(now.getDate() + 7)
  const endDate = localDateStr(sevenDaysLater)

  const { data: openGames } = await supabase
    .from('games')
    .select(`
      *,
      slot:slots(date, start_time, end_time),
      court:courts(name, city),
      host:users(name, avatar_url)
    `)
    .in('status', ['open', 'full'])
    .eq('visibility', 'public')
    .gte('created_at', today)
    .order('created_at', { ascending: true })
    .limit(100)

  // Fetch player's own game memberships for My Games tab
  const { data: myGamePlayers } = await supabase
    .from('game_players')
    .select('game_id, status, game:games(*, slot:slots(date, start_time, end_time), court:courts(name), host:users(name))')
    .eq('player_id', user!.id)

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
        <h1 className="text-xl font-bold text-foreground">Games</h1>
        {tab === 'discover' && (
          <Link href="/games/new" className={buttonVariants({ size: 'sm' })}>+ Post Game</Link>
        )}
      </div>

      <NavTabs
        current={tab}
        tabs={[
          { key: 'discover', label: 'Discover',  href: '/player/games?tab=discover' },
          { key: 'mine',     label: 'My Games',  href: '/player/games?tab=mine'     },
        ]}
      />

      {tab === 'discover' ? (
        <>
          {!hasSkillLevel && (
            <Link
              href="/player/onboarding"
              className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-xl px-4 py-3 mb-4 hover:bg-primary/10 transition-colors"
            >
              <div>
                <p className="text-sm font-semibold text-foreground">Set your skill level</p>
                <p className="text-xs text-muted-foreground mt-0.5">Get games matched to your level</p>
              </div>
              <ChevronRight size={16} className="text-primary shrink-0" aria-hidden="true" />
            </Link>
          )}
          <Suspense fallback={<div className="flex gap-2 mb-4"><Skeleton className="h-6 w-12 rounded-full" /><Skeleton className="h-6 w-14 rounded-full" /><Skeleton className="h-6 w-20 rounded-full" /></div>}>
            <GamesFilter playerSkillLevel={playerSkillLevel} />
          </Suspense>
          <GamesFeed
            initialGames={(openGames ?? []) as Game[]}
            filter={filter}
            playerSkillLevel={playerSkillLevel}
          />
        </>
      ) : (
        <div className="flex flex-col gap-6">
          {myGames.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-3">
                <Swords size={28} className="text-primary" aria-hidden="true" />
              </div>
              <p className="font-semibold text-foreground mb-1">No games yet</p>
              <p className="text-sm text-muted-foreground mb-4">Browse Discover to find a game to join.</p>
              <a href="/player/games?tab=discover" className={buttonVariants()}>Browse games</a>
            </div>
          ) : (
            <>
              {upcoming.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Upcoming</p>
                  <div className="flex flex-col gap-3">
                    {upcoming.map(({ game, role }) => (
                      <GameCard key={game.id} game={game} showRole={role} />
                    ))}
                  </div>
                </div>
              )}
              {past.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Past</p>
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
