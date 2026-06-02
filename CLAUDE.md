# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # start dev server (localhost:3000)
npm run build        # production build
npm run lint         # ESLint
npm run type-check   # tsc --noEmit (no test suite yet)
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

Platform fee is always **10%** of `bookings.amount`, stored separately in `bookings.platform_fee`. The `amount` column is the gross booking price — never subtract the fee from it.

### Realtime

`src/hooks/useSlotRealtime.ts` subscribes to the `slots` table for a given court + date. Realtime is also enabled on `games` and `game_players` in Supabase (set in schema). Use this hook in any UI that shows live availability.

### PayMongo Flow

1. Client calls `POST /api/bookings` → creates booking (status: `pending`) + PayMongo payment link
2. User pays via checkout URL
3. PayMongo calls `POST /api/payments/webhook` → webhook verifies signature → calls `confirm_booking` RPC → sends Resend confirmation email with QR code

Webhook signature verification is in `src/lib/paymongo/client.ts`. The `qr_code` field on a booking is the check-in token (UUID string, not an image).

### Key Files

- `supabase/schema.sql` — full DB schema, RLS policies, RPC functions, cron job, realtime config. Run in Supabase SQL Editor to set up or reset.
- `src/types/index.ts` — all shared TypeScript types. Add new types here, not inline.
- `src/lib/paymongo/client.ts` — `calculateFees()`, `createPaymentLink()`, `verifyWebhookSignature()`
- `src/lib/resend/emails.ts` — transactional email functions

### Design Decisions (from specs)

- Owner dashboard uses separate routes per tab (`/owner/courts`, `/owner/schedule`, `/owner/bookings`, `/owner/earnings`) for deep-linking from notifications
- New courts start with `status = 'pending'` — manual activation, no auto-approve
- Slot bulk generation must use `ON CONFLICT DO NOTHING` (idempotent)
- Earnings screen is informational only — no payout triggering in MVP
- CSS-only bar charts in earnings (no chart library)
- `docs/superpowers/specs/` contains approved design specs for each feature
