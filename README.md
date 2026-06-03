# PickleSpace 🏓

> Pickleball court booking + player matchmaking PWA for Cebu, Philippines.

Real-time slot availability, GCash & card payments via PayMongo, QR check-in, and a matchmaking feed where players post open games and join each other.

**Status: All 3 phases built · Running locally · Ready for Vercel deploy**

---

## Tech Stack

| Layer | Tool |
|-------|------|
| Framework | Next.js 14 (App Router) |
| Database + Auth | Supabase (Postgres + Auth + Realtime + Storage) |
| Styling | Tailwind CSS |
| Payments | PayMongo (GCash + card) |
| Email | Resend |
| Deployment | Vercel |

**Total monthly cost to run: ₱0** — all free tiers until real volume hits.

---

## What's Built

### Phase 1 — Court Owner Dashboard ✅
- List and manage courts (photos, amenities, pricing)
- Weekly slot grid with bulk generation and real-time updates
- Booking management — Today agenda, QR scanner for check-in, Mark Paid for cash
- Earnings tab — monthly revenue, MoM comparison, CSS-only bar chart, transaction list

### Phase 2 — Player Booking Flow ✅
- Date-first court discovery (Today / Tomorrow / Pick date)
- Slots-first court detail page with real-time availability
- Checkout with 10-minute hold timer, GCash/card/cash payment
- Post-payment confirmation with QR code on screen + email backup
- Player bookings history (Upcoming / Past) with QR slide-up

### Phase 3 — Matchmaking Feed ✅
- Games feed with date grouping and real-time updates
- My Games tab (hosting / joined, Upcoming / Past)
- Public shareable game detail page — join, leave, or cancel
- Create game form pre-filled from booking confirmation

---

## How It Works

**Two user types:**
- **Court Owners** — register courts, open time slots, scan QR at check-in, track earnings
- **Players** — discover courts by date, book a slot, pay online, show QR, post open games

**Core mechanics:**
- **10-minute hold lock** — slot locked when player taps it, released if payment doesn't complete. Prevents double booking. Uses an atomic Postgres RPC — never update slot status directly.
- **10% platform commission** — stored in `bookings.platform_fee`, never shown to the player.
- **QR check-in** — unique token per booking, rendered server-side with the `qrcode` package.
- **Matchmaking** — players post open games on their booked slots. Others discover and join in real time. Games must be tied to a booked slot in MVP.

---

## Getting Started

### 1. Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) project
- A [PayMongo](https://paymongo.com) account (Philippines)
- A [Resend](https://resend.com) account

### 2. Clone and install

```bash
git clone https://github.com/victor-7-ops/PickleSpace.git
cd PickleSpace
npm install
```

### 3. Set up environment variables

Copy `.env.local` and fill in your keys:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

PAYMONGO_SECRET_KEY=sk_live_...
PAYMONGO_PUBLIC_KEY=pk_live_...
PAYMONGO_WEBHOOK_SECRET=your_webhook_secret

RESEND_API_KEY=re_...

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Set up the database

In your Supabase dashboard:

1. **Database → Extensions** → enable `pg_cron`
2. **SQL Editor** → paste and run `supabase/schema.sql`
3. **SQL Editor** → paste and run `supabase/migrations/001_fix_handle_new_user_role.sql`
4. **Storage → New Bucket** → name: `court-images`, set to **Public**

### 5. Run

```bash
npm run dev
# → http://localhost:3000
```

Register as an owner → add a court → manually set its status to `active` in Supabase Table Editor → generate slots → register as a player → try booking.

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/              # login, register
│   ├── (dashboard)/
│   │   ├── owner/           # courts, schedule, bookings, earnings
│   │   └── player/          # discover, games, bookings
│   ├── courts/[id]/         # public court detail + checkout
│   ├── games/[id]/          # public game detail
│   ├── games/new/           # create game form
│   ├── bookings/[id]/       # booking confirmation
│   └── api/                 # all API routes
├── components/
│   ├── ui/                  # Sheet, StatusBadge (shared)
│   ├── owner/               # dashboard components
│   └── player/              # booking + matchmaking components
├── lib/
│   ├── supabase/            # browser + server clients + middleware
│   ├── paymongo/            # payment links, fee calc, webhook verify
│   └── resend/              # transactional emails
├── hooks/
│   └── useSlotRealtime.ts   # live slot updates via Supabase Realtime
└── types/index.ts           # all shared TypeScript types
```

---

## Key Rules

**1. Never update slot status directly**

```ts
// ✅ correct
await supabase.rpc('hold_slot', { p_slot_id: slotId, p_user_id: userId })

// ❌ wrong — bypasses the lock, causes double bookings
await supabase.from('slots').update({ status: 'held' }).eq('id', slotId)
```

**2. Platform fee is always 10%, stored separately**
`bookings.amount` = gross price the player pays. `bookings.platform_fee` = 10% of that. Never subtract.

**3. Use the right Supabase client**
- Browser / Client Components → `src/lib/supabase/client.ts`
- Server Components + API routes → `src/lib/supabase/server.ts`
- Middleware only → `src/lib/supabase/middleware.ts`

**4. New courts start as `pending`**
No auto-activation in MVP. Manually set `status = 'active'` in Supabase.

**5. Games must link to a booked slot**
Enforced at the form level — `/games/new` shows "Book a court first" if no `?slot=&court=` params.

---

## Deploying to Vercel

```bash
npx vercel --prod
```

Or connect GitHub at [vercel.com/new](https://vercel.com/new). Set all env vars in the Vercel dashboard. Update `NEXT_PUBLIC_APP_URL` to your Vercel domain, then register the PayMongo webhook:

```
https://your-domain.vercel.app/api/payments/webhook
```

Subscribe to the `payment.paid` event.

---

## Market Context

Philippines pickleball is growing fast — 277 registered clubs, 18,000+ players as of 2025. Existing platforms (PickleHub PH, Sparrk PH) are Metro Manila-heavy. PickleSpace targets Cebu and Visayas first where they have little presence.

Competitors require manual GCash screenshots via Viber. PickleSpace is fully automated — book, pay, get QR, show up.

---

## Design Specs

All approved design decisions live in [`docs/superpowers/specs/`](docs/superpowers/specs/):
- [Owner Dashboard](docs/superpowers/specs/2026-06-02-owner-dashboard-design.md)
- [Player Booking Flow](docs/superpowers/specs/2026-06-03-booking-flow-design.md)
- [Matchmaking Feed](docs/superpowers/specs/2026-06-03-matchmaking-feed-design.md)
