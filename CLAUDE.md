# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # start dev server (localhost:3000)
npm run build        # production build
npm run lint         # ESLint (no .eslintrc yet — triggers interactive setup; skip)
npm run type-check   # tsc --noEmit
npm test             # vitest run (webhook routing regression suite)
```

## Architecture

**PickleSpace** is a Next.js 14 App Router PWA for pickleball court booking in Cebu, Philippines. Two user types: `owner` (lists/manages courts) and `player` (books slots, joins games).

### Route Groups

- `app/(auth)/` — login, register (unauthenticated)
- `app/(dashboard)/owner/` — court owner dashboard (role-guarded)
- `app/(dashboard)/player/` — player discovery + games (role-guarded)
- `app/courts/[id]/` — public court detail + booking flow
- `app/games/[id]/` — public game detail + join flow
- `app/api/` — API routes (slots, bookings, payments, games)

Auth is enforced at two layers: `src/middleware.ts` (redirects unauthenticated users) and inside each dashboard layout (redirects wrong role).

### Supabase Clients

Always use the right client for context — they are not interchangeable:
- `src/lib/supabase/client.ts` — browser Client Components
- `src/lib/supabase/server.ts` — Server Components and API routes
- `src/lib/supabase/middleware.ts` — middleware only

### Slot Hold Lock Pattern

**Never update `slots.status` directly.** Always use the `hold_slot` RPC for holds and `confirm_booking` RPC for confirmations. These are atomic Postgres functions that prevent race conditions. The cron job in `schema.sql` releases expired holds every minute.

```ts
// Correct
await supabase.rpc('hold_slot', { p_slot_id: slotId, p_user_id: userId })

// Wrong — bypasses the lock
await supabase.from('slots').update({ status: 'held' }).eq('id', slotId)
```

### Fees

| Context | Fee | Stored on |
|---|---|---|
| Whole-court booking | 10% | `bookings.platform_fee` |
| Owner open play (per-head) | 5% | `games.platform_fee_pct` snapshot |
| Player-hosted game (per-head) | 0% | `games.platform_fee_pct = 0` |

`bookings.amount` is gross (PHP). `games.price_per_head` is in **centavos**. Never subtract the fee from the gross amount column.

### Realtime

- `src/hooks/useSlotRealtime.ts` — subscribes to `slots` for a court + date
- `src/hooks/useGameRealtime.ts` — subscribes to `game_players` for a single game; returns `{ players, joinedCount }`

Realtime is enabled on `slots`, `games`, and `game_players` in Supabase. Use the appropriate hook in any UI showing live availability or player counts.

### Game RPCs (race-safe — use these, never raw UPDATE)

```ts
// Atomic join: assigns 'joined' or 'waitlisted', flips game to 'full' at capacity
await supabase.rpc('join_game', { p_game_id, p_payment_method })
// Returns: { game_player_id, status, price_per_head, payment_method, requires_payment }

// Atomic leave: 2h cutoff, refund_due if paid, promotes earliest waitlisted
await supabase.rpc('leave_game', { p_game_id })
// Returns: { promoted_player_id }

// Host or venue owner removes a player; handles waitlist + refund_due
await supabase.rpc('host_remove_player', { p_game_id, p_player_id })
```

**Never update `game_players.status` or `games.current_players` directly** outside these RPCs — they maintain consistency atomically.

### PayMongo Flow

**Whole-court booking:**
1. `POST /api/bookings` → booking (`pending`) + PayMongo link; `remarks = bookingId`
2. User pays → webhook → `confirm_booking` RPC → Resend email with `booking.qr_code`

**Per-head game payment:**
1. `POST /api/games/[id]/join` → `join_game` RPC → PayMongo link; `remarks = 'gp:' + gamePlayerId`
2. User pays → webhook branches on `remarks.startsWith('gp:')` → updates `game_players.payment_status = 'paid'` → Resend email with `game_players.id` as QR

The `gp:` prefix is the single routing decision — it is tested in `src/lib/paymongo/client.test.ts`. Do not change this without updating the tests.

**QR codes:**
- Booking check-in: `bookings.qr_code` (UUID)
- Game check-in: `game_players.id` (UUID) — owner scans this at the door

### Key Files

- `supabase/schema.sql` — base DB schema, RLS policies, slot RPCs, cron job, realtime config
- `supabase/migrations/` — incremental ALTERs; apply in order (002 → 003 → 004) on a fresh schema
- `src/types/index.ts` — all shared TypeScript types. Add new types here, not inline
- `src/lib/paymongo/client.ts` — `calculateFees()`, `createPaymentLink()`, `verifyWebhookSignature()`, `GAME_PLAYER_REMARK_PREFIX`
- `src/lib/resend/emails.ts` — all transactional emails (booking confirmation, game confirmation, promotion, approval, cancellation)
- `src/lib/paymongo/client.test.ts` — webhook routing regression tests (run with `npm test`)

### Game System Overview

Three session types share one `games` + `game_players` schema:

| Type | `host_type` | Who creates | Route | Phase |
|---|---|---|---|---|
| Owner Open Play | `owner` | Venue owner from Schedule | `POST /api/games/open-play` | 3 ✅ |
| Player-Hosted | `player` | Player from confirmed booking | `POST /api/games/player-hosted` | 4 ✅ |
| LFG Post | — | Anyone | not built | 5 |

**Game status flow:** `open` → `full` (at capacity) → `completed` or `cancelled`

**Game player status flow:** `waitlisted` → `joined` → `attended` / `no_show` (or `left` at any point)

**Payment status flow:** `unpaid` → `pending` (PayMongo link created) → `paid` (webhook confirmed) / `refund_due` (left after paying)

### Owner Open Play

1. Schedule grid → empty slot → "🏓 New Open Play" (`OpenPlaySheet`)
2. Internally: `hold_slot` + `confirm_booking` RPCs (amount = 0) + `games` insert
3. Slot shows hatched overlay in grid; Bookings tab shows `GameRosterCard`
4. Check-in: owner scans player's `game_players.id` QR (`POST /api/games/checkin`)
5. Completion: "Complete Session" → `POST /api/games/[id]/complete` → `joined` → `no_show`, `attended` → `games_played++`
6. Earnings page shows open-play gross/net line separate from court bookings

### Player-Hosted Games

1. My Bookings → confirmed upcoming booking → "🏓 Open game" (`OpenGameSheet`)
2. `price_per_head = Math.round(booking.amount × 100 / capacity)` — centavos
3. `auto_join=false`: join requests land as `waitlisted`; host gets email; approves via `POST /api/games/[id]/approve`
4. `HostRosterPanel` on game detail (host view only): approve/reject requests, remove joined players
5. `platform_fee_pct = 0` — host absorbs full booking cost minus what joiners pay

### Design Decisions

- Owner dashboard uses separate routes per tab (deep-linking from notifications)
- New courts start with `status = 'pending'` — manual activation, no auto-approve
- Slot bulk generation must use `ON CONFLICT DO NOTHING` (idempotent)
- Earnings screen is informational only — no payout triggering in MVP
- CSS-only bar charts in earnings (no chart library)
- Skill levels are **categorical** (`beginner` / `intermediate` / `advanced` / `open`) — no numeric ratings
- Users have `skill_level` (nullable until onboarding); games have `skill_level` including `open`
- `docs/superpowers/specs/` contains approved design specs for each feature
