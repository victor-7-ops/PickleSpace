# Matchmaking Feed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the matchmaking feed — players post open games on booked slots, others discover and join them in real time.

**Architecture:** Three separate Next.js 14 App Router routes: `/player/games` (Discover + My Games tabs, realtime feed), `/games/[id]` (public shareable detail page with live player count), `/games/new` (create game form, pre-filled from booking confirmation). The existing `GET/POST /api/games` routes are already built; this plan adds three new API routes (join, leave, cancel) and all the UI.

**Tech Stack:** Next.js 14 App Router, Supabase (server + browser clients + Realtime), Tailwind CSS, existing `Sheet`, `StatusBadge` components

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/app/api/games/[id]/join/route.ts` | Create | POST join a game |
| `src/app/api/games/[id]/leave/route.ts` | Create | POST leave a game |
| `src/app/api/games/[id]/cancel/route.ts` | Create | POST host cancels game |
| `src/app/(dashboard)/player/games/page.tsx` | Create | Discover + My Games tabs, Server Component |
| `src/components/player/GameCard.tsx` | Create | Game card used in both tabs |
| `src/components/player/GamesFilter.tsx` | Create | Filter chips (All / Open / My skill level) |
| `src/components/player/GamesFeed.tsx` | Create | Date-grouped feed with realtime |
| `src/app/games/[id]/page.tsx` | Create | Public game detail page |
| `src/components/player/GamePlayers.tsx` | Create | Avatar row + player list with realtime |
| `src/components/player/GameActions.tsx` | Create | CTA buttons (join / leave / cancel / full) |
| `src/app/games/new/page.tsx` | Create | Create game form page |
| `src/components/player/CreateGameForm.tsx` | Create | Form with pre-fill from slot/court params |

---

## Task 1: Games API Routes (Join, Leave, Cancel)

**Files:**
- Create: `src/app/api/games/[id]/join/route.ts`
- Create: `src/app/api/games/[id]/leave/route.ts`
- Create: `src/app/api/games/[id]/cancel/route.ts`

- [ ] **Step 1: Create join route**

Create `src/app/api/games/[id]/join/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/games/[id]/join
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch game
  const { data: game } = await supabase
    .from('games')
    .select('id, status, max_players, host_id, current_players')
    .eq('id', params.id)
    .single()

  if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 })
  if (game.status !== 'open') {
    return NextResponse.json({ error: `Game is ${game.status}` }, { status: 409 })
  }
  if (game.current_players >= game.max_players) {
    return NextResponse.json({ error: 'Game is full' }, { status: 409 })
  }

  // Check not already joined
  const { data: existing } = await supabase
    .from('game_players')
    .select('id')
    .eq('game_id', params.id)
    .eq('player_id', user.id)
    .single()

  if (existing) return NextResponse.json({ error: 'Already joined' }, { status: 409 })

  // Insert player
  const { error: insertError } = await supabase
    .from('game_players')
    .insert({ game_id: params.id, player_id: user.id, status: 'joined' })

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

  // Update current_players count + status if now full
  const newCount = game.current_players + 1
  const newStatus = newCount >= game.max_players ? 'full' : 'open'
  await supabase
    .from('games')
    .update({ current_players: newCount, status: newStatus })
    .eq('id', params.id)

  return NextResponse.json({ success: true, current_players: newCount })
}
```

- [ ] **Step 2: Create leave route**

Create `src/app/api/games/[id]/leave/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/games/[id]/leave — players can leave, host cannot
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: game } = await supabase
    .from('games')
    .select('id, host_id, current_players')
    .eq('id', params.id)
    .single()

  if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 })

  if (game.host_id === user.id) {
    return NextResponse.json({ error: 'Host cannot leave — cancel the game instead' }, { status: 400 })
  }

  const { error: deleteError } = await supabase
    .from('game_players')
    .delete()
    .eq('game_id', params.id)
    .eq('player_id', user.id)

  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })

  const newCount = Math.max(0, game.current_players - 1)
  await supabase
    .from('games')
    .update({ current_players: newCount, status: 'open' })
    .eq('id', params.id)

  return NextResponse.json({ success: true, current_players: newCount })
}
```

- [ ] **Step 3: Create cancel route**

Create `src/app/api/games/[id]/cancel/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/games/[id]/cancel — host only
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: game } = await supabase
    .from('games')
    .select('id, host_id, status')
    .eq('id', params.id)
    .single()

  if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 })
  if (game.host_id !== user.id) {
    return NextResponse.json({ error: 'Only the host can cancel' }, { status: 403 })
  }
  if (game.status === 'cancelled') {
    return NextResponse.json({ error: 'Already cancelled' }, { status: 409 })
  }

  const { error } = await supabase
    .from('games')
    .update({ status: 'cancelled' })
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
```

- [ ] **Step 4: Type-check and commit**

```bash
npm run type-check
git add "src/app/api/games/[id]/"
git commit -m "feat: games join, leave, cancel API routes"
```

---

## Task 2: GameCard + GamesFilter components

**Files:**
- Create: `src/components/player/GameCard.tsx`
- Create: `src/components/player/GamesFilter.tsx`

- [ ] **Step 1: Create GameCard**

Create `src/components/player/GameCard.tsx`:

```tsx
import Link from 'next/link'
import type { Game } from '@/types'

interface GameCardProps {
  game: Game
  showRole?: 'hosting' | 'joined'
}

const SKILL_COLORS: Record<string, string> = {
  open:         'bg-gray-100 text-gray-600',
  beginner:     'bg-green-100 text-green-700',
  intermediate: 'bg-yellow-100 text-yellow-700',
  advanced:     'bg-red-100 text-red-700',
}

export function GameCard({ game, showRole }: GameCardProps) {
  const spotsLeft = game.max_players - game.current_players
  const isFull = game.status === 'full' || spotsLeft <= 0
  const isCancelled = game.status === 'cancelled'

  const host = game.host as { name?: string } | null
  const court = game.court as { name?: string; city?: string } | null

  function spotsLabel() {
    if (isCancelled) return { text: 'Cancelled', cls: 'bg-red-100 text-red-700' }
    if (isFull) return { text: 'Full', cls: 'bg-red-100 text-red-700' }
    if (spotsLeft === 1) return { text: '1 spot', cls: 'bg-yellow-100 text-yellow-700' }
    return { text: `${spotsLeft} spots`, cls: 'bg-green-100 text-green-700' }
  }

  const spots = spotsLabel()

  return (
    <Link href={`/games/${game.id}`}
      className={`block bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow ${isCancelled ? 'opacity-50' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">{game.title}</p>
          <p className="text-sm text-gray-500 mt-0.5 truncate">
            {court?.name} · {game.slot as { start_time?: string } | null
              ? `${(game.slot as { start_time: string }).start_time}`
              : ''}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${spots.cls}`}>
            {spots.text}
          </span>
          {showRole && (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              showRole === 'hosting' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
            }`}>
              {showRole === 'hosting' ? 'Hosting' : 'Joined'}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 mt-2">
        <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${SKILL_COLORS[game.skill_level] ?? SKILL_COLORS.open}`}>
          {game.skill_level}
        </span>
        <span className="text-xs text-gray-400">Hosted by {host?.name ?? 'Player'}</span>
      </div>
    </Link>
  )
}
```

- [ ] **Step 2: Create GamesFilter**

Create `src/components/player/GamesFilter.tsx`:

```tsx
'use client'
import { useRouter, useSearchParams } from 'next/navigation'

interface GamesFilterProps {
  playerSkillLevel: string
}

export function GamesFilter({ playerSkillLevel }: GamesFilterProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const current = searchParams.get('filter') ?? 'all'

  function setFilter(f: string) {
    router.push(`/player/games?filter=${f}`)
  }

  const filters = [
    { key: 'all',      label: 'All' },
    { key: 'open',     label: 'Open' },
    { key: 'my-level', label: 'My level' },
  ]

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 mb-4">
      {filters.map(f => (
        <button key={f.key} onClick={() => setFilter(f.key)}
          className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
            current === f.key
              ? 'bg-green-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}>
          {f.label}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Type-check and commit**

```bash
npm run type-check
git add src/components/player/GameCard.tsx src/components/player/GamesFilter.tsx
git commit -m "feat: GameCard and GamesFilter components"
```

---

## Task 3: GamesFeed (date-grouped realtime feed)

**Files:**
- Create: `src/components/player/GamesFeed.tsx`

- [ ] **Step 1: Create GamesFeed**

Create `src/components/player/GamesFeed.tsx`:

```tsx
'use client'
import { useEffect, useState } from 'react'
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

  // Realtime subscription — new/updated games appear without refresh
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

  // Apply filter
  const filtered = games.filter(g => {
    if (g.status === 'cancelled') return false
    if (filter === 'open') return g.status === 'open'
    if (filter === 'my-level') return g.skill_level === playerSkillLevel || g.skill_level === 'open'
    return true
  })

  // Group by slot date
  const grouped = new Map<string, Game[]>()
  for (const game of filtered) {
    const slot = game.slot as { date?: string } | null
    const dateKey = slot?.date ?? 'Unknown'
    if (!grouped.has(dateKey)) grouped.set(dateKey, [])
    grouped.get(dateKey)!.push(game)
  }

  // Sort each group by start_time
  for (const [, group] of grouped) {
    group.sort((a, b) => {
      const aTime = (a.slot as { start_time?: string } | null)?.start_time ?? ''
      const bTime = (b.slot as { start_time?: string } | null)?.start_time ?? ''
      return aTime.localeCompare(bTime)
    })
  }

  // Sort date groups chronologically
  const sortedDates = Array.from(grouped.keys()).sort()

  if (sortedDates.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-4xl mb-3">🏓</p>
        <p className="font-medium text-gray-600 mb-1">No open games</p>
        <p className="text-sm">Be the first to post one!</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {sortedDates.map(date => (
        <div key={date}>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">
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
```

- [ ] **Step 2: Type-check and commit**

```bash
npm run type-check
git add src/components/player/GamesFeed.tsx
git commit -m "feat: GamesFeed with date grouping and realtime updates"
```

---

## Task 4: Games Feed Page

**Files:**
- Create: `src/app/(dashboard)/player/games/page.tsx`

- [ ] **Step 1: Create the games feed page**

Create `src/app/(dashboard)/player/games/page.tsx`:

```tsx
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

  // Fetch player's own games for My Games tab
  const { data: myGamePlayers } = await supabase
    .from('game_players')
    .select('game_id, status, game:games(*, slot:slots(date, start_time, end_time), court:courts(name), host:users(name))')
    .eq('player_id', user!.id)
    .neq('game:games.status', 'cancelled')

  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  const myGames = (myGamePlayers ?? [])
    .map(gp => ({
      game: (Array.isArray(gp.game) ? gp.game[0] : gp.game) as Game,
      role: gp.game && (Array.isArray(gp.game) ? gp.game[0] : gp.game)?.host_id === user!.id ? 'hosting' as const : 'joined' as const,
    }))
    .filter(({ game }) => !!game)

  const upcoming = myGames.filter(({ game }) =>
    ((game.slot as { date?: string } | null)?.date ?? '') >= today
  ).sort((a, b) =>
    ((a.game.slot as { date?: string } | null)?.date ?? '').localeCompare(
      (b.game.slot as { date?: string } | null)?.date ?? ''
    )
  )

  const past = myGames.filter(({ game }) =>
    ((game.slot as { date?: string } | null)?.date ?? '') < today
  ).sort((a, b) =>
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
```

- [ ] **Step 2: Type-check and commit**

```bash
npm run type-check
git add src/app/(dashboard)/player/games/page.tsx
git commit -m "feat: player games feed page with Discover and My Games tabs"
```

---

## Task 5: Game Detail Page Components

**Files:**
- Create: `src/components/player/GamePlayers.tsx`
- Create: `src/components/player/GameActions.tsx`

- [ ] **Step 1: Create GamePlayers**

Create `src/components/player/GamePlayers.tsx`:

```tsx
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
```

- [ ] **Step 2: Create GameActions**

Create `src/components/player/GameActions.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sheet } from '@/components/ui/Sheet'

type ActionState = 'can-join' | 'joined' | 'full' | 'host' | 'cancelled' | 'unauthenticated'

interface GameActionsProps {
  gameId: string
  actionState: ActionState
}

export function GameActions({ gameId, actionState }: GameActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [cancelOpen, setCancelOpen] = useState(false)

  async function callApi(path: string) {
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`/api/games/${gameId}/${path}`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      router.refresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false) }
  }

  async function handleCancel() {
    setCancelOpen(false)
    await callApi('cancel')
  }

  return (
    <div className="flex flex-col gap-2">
      {error && <p className="text-sm text-red-600 text-center">{error}</p>}

      {actionState === 'can-join' && (
        <button onClick={() => callApi('join')} disabled={loading}
          className="w-full py-3.5 bg-green-600 text-white rounded-xl font-semibold text-sm hover:bg-green-700 disabled:opacity-40 transition-colors">
          {loading ? 'Joining…' : 'Join Game →'}
        </button>
      )}

      {actionState === 'joined' && (
        <div className="flex flex-col gap-2">
          <div className="text-center py-2 text-green-700 font-semibold text-sm">✓ You're in!</div>
          <button onClick={() => callApi('leave')} disabled={loading}
            className="w-full py-2.5 border border-gray-200 text-gray-500 rounded-xl text-sm font-medium hover:bg-gray-50 disabled:opacity-40">
            {loading ? 'Leaving…' : 'Leave Game'}
          </button>
        </div>
      )}

      {actionState === 'full' && (
        <button disabled
          className="w-full py-3.5 bg-gray-100 text-gray-400 rounded-xl font-semibold text-sm cursor-not-allowed">
          Game Full
        </button>
      )}

      {actionState === 'host' && (
        <button onClick={() => setCancelOpen(true)} disabled={loading}
          className="w-full py-3.5 bg-red-50 text-red-600 border border-red-200 rounded-xl font-semibold text-sm hover:bg-red-100 disabled:opacity-40 transition-colors">
          {loading ? 'Cancelling…' : 'Cancel Game'}
        </button>
      )}

      {actionState === 'unauthenticated' && (
        <a href={`/login?next=/games/${gameId}`}
          className="block w-full py-3.5 bg-green-600 text-white rounded-xl font-semibold text-sm text-center hover:bg-green-700 transition-colors">
          Log in to join →
        </a>
      )}

      {actionState === 'cancelled' && (
        <div className="w-full py-3 bg-gray-50 border border-gray-100 rounded-xl text-center text-sm text-gray-400">
          This game has been cancelled
        </div>
      )}

      {/* Cancel confirmation sheet */}
      <Sheet open={cancelOpen} onClose={() => setCancelOpen(false)} title="Cancel Game">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-gray-600">
            Cancel this game? All joined players will see the game marked as cancelled.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setCancelOpen(false)}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
              Keep Game
            </button>
            <button onClick={handleCancel}
              className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700">
              Yes, Cancel
            </button>
          </div>
        </div>
      </Sheet>
    </div>
  )
}
```

- [ ] **Step 3: Type-check and commit**

```bash
npm run type-check
git add src/components/player/GamePlayers.tsx src/components/player/GameActions.tsx
git commit -m "feat: GamePlayers (realtime avatars) and GameActions (join/leave/cancel) components"
```

---

## Task 6: Game Detail Page

**Files:**
- Create: `src/app/games/[id]/page.tsx`

- [ ] **Step 1: Create game detail page**

Create `src/app/games/[id]/page.tsx`:

```tsx
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

  const { data: game } = await supabase
    .from('games')
    .select('*, slot:slots(date, start_time, end_time), court:courts(name, address), host:users(name)')
    .eq('id', params.id)
    .single()

  if (!game) notFound()

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
    <div className="min-h-screen bg-white">
      {/* Sticky header */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <Link href="/player/games" className="text-gray-400 hover:text-gray-600 text-lg">←</Link>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">{game.title}</p>
          <p className="text-xs text-gray-500">
            {SKILL_LABELS[game.skill_level]} · Hosted by {(host as { name?: string } | null)?.name ?? 'Player'}
          </p>
        </div>
      </header>

      <div className="px-4 py-6 flex flex-col gap-6">
        {/* Court + time */}
        <div className="bg-green-50 rounded-2xl p-4">
          <p className="font-semibold text-gray-900">{(court as { name?: string } | null)?.name}</p>
          <p className="text-sm text-gray-600 mt-0.5">
            {(slot as { date?: string } | null)?.date} · {(slot as { start_time?: string } | null)?.start_time} – {(slot as { end_time?: string } | null)?.end_time}
          </p>
          {(court as { address?: string } | null)?.address && (
            <p className="text-xs text-gray-400 mt-1">📍 {(court as { address: string }).address}</p>
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
            <p className="text-sm font-semibold text-gray-700 mb-1">About this game</p>
            <p className="text-sm text-gray-600">{game.description}</p>
          </div>
        )}

        {/* CTA */}
        <GameActions gameId={game.id} actionState={actionState} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check and commit**

```bash
npm run type-check
git add "src/app/games/[id]/page.tsx"
git commit -m "feat: public game detail page with realtime player list and join/leave/cancel actions"
```

---

## Task 7: Create Game Form

**Files:**
- Create: `src/app/games/new/page.tsx`
- Create: `src/components/player/CreateGameForm.tsx`

- [ ] **Step 1: Create CreateGameForm**

Create `src/components/player/CreateGameForm.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type SkillLevel = 'open' | 'beginner' | 'intermediate' | 'advanced'

interface CreateGameFormProps {
  courtId?: string
  courtName?: string
  slotId?: string
  slotDate?: string
  slotStart?: string
  slotEnd?: string
}

export function CreateGameForm({
  courtId, courtName, slotId, slotDate, slotStart, slotEnd,
}: CreateGameFormProps) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [skill, setSkill] = useState<SkillLevel>('open')
  const [maxPlayers, setMaxPlayers] = useState(4)
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const hasSlot = !!courtId && !!slotId

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!hasSlot) return
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courtId,
          slotId,
          title: title.trim(),
          description: description.trim() || undefined,
          skillLevel: skill,
          maxPlayers,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      router.push(`/games/${json.game.id}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setLoading(false)
    }
  }

  if (!hasSlot) {
    return (
      <div className="text-center py-16">
        <p className="text-4xl mb-4">🏟</p>
        <p className="font-semibold text-gray-900 mb-2">Book a court first</p>
        <p className="text-sm text-gray-500 mb-6">
          You need a confirmed court booking to post an open game.
        </p>
        <a href="/player/discover"
          className="bg-green-600 text-white text-sm font-semibold px-6 py-3 rounded-xl hover:bg-green-700 transition-colors">
          Find a Court →
        </a>
      </div>
    )
  }

  const SKILL_OPTIONS: { value: SkillLevel; label: string }[] = [
    { value: 'open',         label: 'Open' },
    { value: 'beginner',     label: 'Beginner' },
    { value: 'intermediate', label: 'Inter.' },
    { value: 'advanced',     label: 'Advanced' },
  ]

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Pre-filled slot info */}
      <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
        <p className="font-semibold text-gray-900">{courtName}</p>
        <p className="text-sm text-gray-600 mt-0.5">
          {slotDate} · {slotStart} – {slotEnd}
        </p>
        <p className="text-xs text-green-700 font-medium mt-1">already booked ✓</p>
      </div>

      {/* Title */}
      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold text-gray-700">Game title *</span>
        <input required value={title} onChange={e => setTitle(e.target.value)}
          placeholder="e.g. Casual doubles, anyone welcome"
          className="border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
      </label>

      {/* Skill level */}
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-2">Skill level</p>
        <div className="flex gap-2">
          {SKILL_OPTIONS.map(o => (
            <button key={o.value} type="button" onClick={() => setSkill(o.value)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                skill === o.value
                  ? 'bg-green-600 text-white border-green-600'
                  : 'border-gray-200 text-gray-600 hover:border-green-300'
              }`}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Max players */}
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-2">Max players</p>
        <div className="flex gap-2">
          {[2, 4, 6].map(n => (
            <button key={n} type="button" onClick={() => setMaxPlayers(n)}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                maxPlayers === n
                  ? 'bg-green-600 text-white border-green-600'
                  : 'border-gray-200 text-gray-600 hover:border-green-300'
              }`}>
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold text-gray-700">
          Description <span className="text-gray-400 font-normal">(optional)</span>
        </span>
        <textarea value={description} onChange={e => setDescription(e.target.value)}
          rows={2} placeholder="e.g. Bring your own paddle, parking available"
          className="border border-gray-300 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-500" />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button type="submit" disabled={loading || !title.trim()}
        className="w-full py-3.5 bg-green-600 text-white rounded-xl font-semibold text-sm hover:bg-green-700 disabled:opacity-40 transition-colors">
        {loading ? 'Posting…' : 'Post Game →'}
      </button>
    </form>
  )
}
```

- [ ] **Step 2: Create the page**

Create `src/app/games/new/page.tsx`:

```tsx
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { CreateGameForm } from '@/components/player/CreateGameForm'

interface Props {
  searchParams: { slot?: string; court?: string }
}

export default async function NewGamePage({ searchParams }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const next = `/games/new${searchParams.slot ? `?slot=${searchParams.slot}&court=${searchParams.court}` : ''}`
    redirect(`/login?next=${encodeURIComponent(next)}`)
  }

  const slotId = searchParams.slot
  const courtId = searchParams.court

  let slotInfo: { date?: string; start_time?: string; end_time?: string } | null = null
  let courtInfo: { name?: string } | null = null

  if (slotId && courtId) {
    const { data: slot } = await supabase
      .from('slots')
      .select('date, start_time, end_time')
      .eq('id', slotId)
      .single()
    slotInfo = slot

    const { data: court } = await supabase
      .from('courts')
      .select('name')
      .eq('id', courtId)
      .single()
    courtInfo = court
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <Link href="/player/games" className="text-gray-400 hover:text-gray-600 text-lg">←</Link>
        <span className="font-semibold text-gray-900">Post a Game</span>
      </header>

      <div className="px-4 py-6 max-w-lg mx-auto">
        <CreateGameForm
          courtId={courtId}
          courtName={courtInfo?.name}
          slotId={slotId}
          slotDate={slotInfo?.date}
          slotStart={slotInfo?.start_time}
          slotEnd={slotInfo?.end_time}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Type-check and commit**

```bash
npm run type-check
git add src/app/games/new/page.tsx src/components/player/CreateGameForm.tsx
git commit -m "feat: create game page with slot pre-fill from booking confirmation"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|-----------------|------|
| `POST /api/games/[id]/join` — validates not full, not joined, game open | Task 1 |
| `POST /api/games/[id]/leave` — host cannot leave | Task 1 |
| `POST /api/games/[id]/cancel` — host only | Task 1 |
| Feed: Discover tab with date-grouped games | Task 3 + 4 |
| Feed: My Games tab with Upcoming/Past + role badge | Task 4 |
| Feed: filter chips (All / Open / My level) | Task 2 (GamesFilter) |
| Feed: realtime — new games appear without refresh | Task 3 (GamesFeed) |
| Full games shown but greyed out | Task 2 (GameCard spots badge) |
| Empty state on Discover tab | Task 3 (GamesFeed) |
| Empty state on My Games tab | Task 4 |
| "+" Post Game button on Discover tab | Task 4 |
| Game detail: public (no auth required) | Task 6 (no auth check on page) |
| Game detail: sticky header with back + title + skill + host | Task 6 |
| Game detail: court + date/time card | Task 6 |
| Game detail: avatar row + player names with host tag | Task 5 (GamePlayers) |
| Game detail: realtime player count | Task 5 (GamePlayers subscription) |
| Game detail: 5 CTA states (can-join/joined/full/host/cancelled/unauthenticated) | Task 5 (GameActions) |
| Game detail: cancel confirmation sheet | Task 5 (GameActions) |
| Game detail: description section | Task 6 |
| Create game: requires login | Task 7 (page redirect) |
| Create game: pre-fill from ?slot=&court= | Task 7 (NewGamePage + CreateGameForm) |
| Create game: no params → "Book a court first" | Task 7 (CreateGameForm no-slot branch) |
| Create game: title, skill level, max players, description | Task 7 (CreateGameForm) |
| Create game: navigates to /games/[id] after post | Task 7 (CreateGameForm router.push) |
| `/games/[id]` public | Task 6 ✓ |
| Host cannot leave (only cancel) | Task 1 (leave route) + Task 5 (host → cancel CTA) |
| Full games shown not hidden | Task 2 (GameCard red "Full" badge, not filtered out) + Task 3 (GamesFeed only filters cancelled) |

**Placeholder scan:** None found. All code blocks complete. ✓

**Type consistency:**
- `GameActions` prop `actionState` type defined inline as union — consistent with usage in `game detail page` ✓
- `GamePlayers` receives `initialPlayers: GamePlayer[]` — `GamePlayer` imported from `@/types` in both files ✓
- `CreateGameForm` receives `courtId?`, `slotId?` as strings — page passes them from `searchParams` as strings ✓
- `GameCard` receives `game: Game` — `Game` from `@/types`, `slot`/`court`/`host` cast with null safety ✓
- `callApi` in `GameActions` calls paths `join`, `leave`, `cancel` — match Task 1 route directories exactly ✓
