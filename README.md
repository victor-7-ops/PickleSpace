# PickleSpace 🏓

> Pickleball court booking + player matchmaking PWA for Cebu, Philippines.

Real-time slot availability, GCash & card payments via PayMongo, QR check-in, and a matchmaking feed where players post open games and join each other.

---

## The Plan

We're building in **3 phases**, each with its own design spec before any code is written:

| Phase | Feature | Status |
|-------|---------|--------|
| 1 | **Court Owner Dashboard** — list courts, manage slots (weekly grid), view bookings, track earnings | 🎨 Spec approved, plan next |
| 2 | **Player Booking Flow** — discover courts, pick a slot, pay via GCash/card, get QR confirmation | 📋 Brainstorm next |
| 3 | **Matchmaking Feed** — post open games, filter by skill level, join games | 📋 Brainstorm next |

Design specs live in [`docs/superpowers/specs/`](docs/superpowers/specs/).

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

## How It Works

### Two user types
- **Court Owners** — register their courts, open time slots, see who booked, track earnings
- **Players** — browse available courts, book a slot, pay online, show QR at the court

### Core mechanics
- **10-minute hold lock** — when a player taps a slot, it's held exclusively for them for 10 minutes while they pay. Prevents double booking without requiring login first.
- **10% platform commission** — PickleSpace takes 10% of every booking. The owner keeps 90%.
- **QR check-in** — every confirmed booking gets a unique QR code. Owner scans it at the court to mark the player as checked in.
- **Matchmaking feed** — players post "open games" on booked slots. Others can join up to the max player count. Filterable by skill level (beginner / intermediate / advanced / open).

### Payment flow
1. Player picks a slot → slot is held for 10 min
2. Player pays via PayMongo checkout (GCash or card)
3. PayMongo fires a webhook → booking confirmed → QR code emailed to player
4. Player shows QR at court → owner scans → done

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/              # login, register
│   ├── (dashboard)/
│   │   ├── owner/           # courts, schedule, bookings, earnings
│   │   └── player/          # discover, games
│   ├── courts/[id]/         # public court page + booking
│   ├── games/[id]/          # game detail + join
│   └── api/                 # API routes
│       ├── bookings/        # create booking + PayMongo link
│       ├── slots/hold/      # 10-min slot hold
│       ├── payments/webhook/ # PayMongo confirmation
│       └── games/           # matchmaking CRUD
├── lib/
│   ├── supabase/            # browser + server clients
│   ├── paymongo/            # payment links, fee calc, webhook verify
│   └── resend/              # transactional emails
├── hooks/
│   └── useSlotRealtime.ts   # live slot updates via Supabase Realtime
└── types/index.ts           # all shared TypeScript types
```

---

## Getting Started (local dev)

### 1. Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) project
- A [PayMongo](https://paymongo.com) account (free, Philippines)
- A [Resend](https://resend.com) account (free tier: 3,000 emails/mo)

### 2. Clone and install
```bash
git clone https://github.com/gadianavictor/picklespace.git
cd picklespace
npm install
```

### 3. Set up environment
Copy `.env.local` and fill in your keys:
```bash
cp .env.local .env.local.example  # reference copy
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

PAYMONGO_SECRET_KEY=sk_live_YOUR_KEY
PAYMONGO_PUBLIC_KEY=pk_live_YOUR_KEY
PAYMONGO_WEBHOOK_SECRET=your_webhook_secret

RESEND_API_KEY=re_YOUR_KEY

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Set up the database
Paste the contents of [`supabase/schema.sql`](supabase/schema.sql) into your Supabase project's **SQL Editor** and run it. This creates all tables, RLS policies, RPC functions, and the cron job for releasing expired slot holds.

Then generate TypeScript types:
```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_REF > src/lib/supabase/database.types.ts
```

### 5. Run
```bash
npm run dev
# → http://localhost:3000
```

---

## Key Rules (read before writing any code)

**1. Never update slot status directly.**
Always use the `hold_slot` RPC or `confirm_booking` RPC. They're atomic. Direct updates bypass the lock and cause double bookings.

```ts
// ✅ correct
await supabase.rpc('hold_slot', { p_slot_id: slotId, p_user_id: userId })

// ❌ wrong
await supabase.from('slots').update({ status: 'held' }).eq('id', slotId)
```

**2. Platform fee is always 10%, stored separately.**
`bookings.amount` = gross price the player pays. `bookings.platform_fee` = 10% of that. Never subtract the fee from amount.

**3. Use the right Supabase client.**
- Browser / Client Components → `src/lib/supabase/client.ts`
- Server Components + API routes → `src/lib/supabase/server.ts`
- Middleware only → `src/lib/supabase/middleware.ts`

**4. New courts start as `pending`.**
No auto-activation in MVP. Manual review before setting `status = 'active'`.

---

## Database Schema

Six tables: `users`, `courts`, `slots`, `bookings`, `games`, `game_players`.

Full schema with RLS policies, RPC functions, and cron config: [`supabase/schema.sql`](supabase/schema.sql)

---

## Market Context

Philippines pickleball is growing fast — 277 registered clubs, 18,000+ players as of late 2025. Existing platforms (PickleHub PH, Sparrk PH) are Metro Manila-heavy. PickleSpace goes deep in Cebu and Visayas first where they have little presence.

Competitors require manual GCash screenshots sent via Viber. PickleSpace is fully automated — book, pay, get QR, show up.

---

## Design Specs

Approved specs in [`docs/superpowers/specs/`](docs/superpowers/specs/):
- [2026-06-02 — Owner Dashboard](docs/superpowers/specs/2026-06-02-owner-dashboard-design.md)
