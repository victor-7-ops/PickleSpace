# Court Owner Dashboard — Design Spec
**Date:** 2026-06-02
**Status:** Approved
**Project:** PickleSpace

---

## Overview

The Court Owner Dashboard is a protected section of the PWA where court owners manage their courts, slots, bookings, and earnings. It is the first sub-project in the PickleSpace build order (Owner Dashboard → Booking Flow → Matchmaking Feed).

---

## Architecture

### Approach
Separate Next.js App Router route per tab. Enables deep-linking from notifications (e.g. booking alert → `/owner/bookings/today`). Each tab is a focused Server Component; realtime is added only where needed.

### Route Structure

```
app/
└── (dashboard)/
    └── owner/
        ├── layout.tsx          — sticky header + tab nav (shared shell)
        ├── page.tsx            — redirects to /owner/courts
        ├── courts/
        │   └── page.tsx        — court listing + add/edit court
        ├── schedule/
        │   └── page.tsx        — weekly grid slot manager
        ├── bookings/
        │   └── page.tsx        — Today / All Bookings sub-tabs
        └── earnings/
            └── page.tsx        — big total + chart + transactions
```

### Layout Shell (`owner/layout.tsx`)

- Sticky green stats header: "Good morning, [name] · X bookings today · ₱Y this week"
  - Stats are server-fetched at layout level on each navigation
- Tab bar below header: Courts · Schedule · Bookings · Earnings
- Auth guard: middleware redirects unauthenticated users to `/login`
- Role guard: layout checks `user.role === 'owner'`; players are redirected to `/player`

---

## Tab 1: Courts (`/owner/courts`)

### What it shows
- List of owner's courts — card per court: name, address, hourly rate, status badge (Active / Pending / Inactive), first image thumbnail
- Empty state with "List your first court" CTA

### Add / Edit Court
- "Add Court" button → slide-up sheet with 4 steps:
  1. Basic info: name, address, city, description
  2. Pricing: hourly rate in ₱
  3. Amenities: multi-select chips (Parking · Shower · Night Lights · Restroom · Water Station)
  4. Photos: upload up to 6 images → Supabase Storage at `courts/{court_id}/`
- Editing reuses the same sheet, pre-filled
- New courts created with `status = 'pending'`; owner sees: "We'll review and activate within 24 hours"
- Manual activation for MVP (no auto-approve)

### Data
- Server Component: `SELECT * FROM courts WHERE owner_id = auth.uid()`
- No realtime subscription needed

---

## Tab 2: Schedule (`/owner/schedule`)

### What it shows
- Week picker (← current week →), defaulting to the week containing today
- Court selector dropdown if owner has multiple courts
- Weekly grid: 7 columns (Mon–Sun), rows per hour 6am–10pm
- Cell colors: green = available, yellow = held, blue = booked, empty = no slot

### Slot Interactions
- **Empty cell tap** → slide-up sheet: date, start time, end time (defaults 1 hr), rate (pre-filled from court default, editable)
- **Available slot tap** → option to delete
- **Booked / held slot tap** → read-only: player name, booking ID
- No drag-to-extend in MVP

### Bulk Generation
- "Generate week" button → form: open hours, slot duration (1 hr / 2 hr), which days of the week
- Generates all slots for selected week; skips existing slots (idempotent via `ON CONFLICT DO NOTHING`)

### Realtime
- `useSlotRealtime(courtId, date)` subscribed for each visible day
- Slots update live when players hold or book

---

## Tab 3: Bookings (`/owner/bookings`)

### Sub-tab A: Today (default)
- Vertical timeline of confirmed/booked slots for today, ordered by start time
- Card: player name, time range, payment method + status
- **Scan QR** button: opens device camera, validates `qr_code` token via `POST /api/bookings/[id]/checkin`
  - Validation: token matches, status is `confirmed`, slot date is today
  - On success: sets `booking_status = 'completed'`
  - On fail: shows error (already scanned / wrong booking / wrong day)
- **Mark as Paid** button on cash bookings: sets `payment_status = 'paid'`

### Sub-tab B: All Bookings
- Full list across all owner's courts, newest first
- Filter chips: All · Confirmed · Pending · Completed · Cancelled
- Expanded card: player phone, booking ID, QR token (manual fallback)

### New API Route
```
POST /api/bookings/[id]/checkin
  — verifies qr_code, date, status
  — sets booking_status = 'completed'
  — returns updated booking or error
```

---

## Tab 4: Earnings (`/owner/earnings`)

### Top — Summary
- Large current-month gross earnings (₱X,XXX)
- Subtitle: net amount after 10% platform fee
- Month-over-month comparison ("↑ 12% vs last month")

### Middle — Chart
- Daily revenue bars for current month, CSS-only (no chart library)
- Week / Month toggle
- Tap bar → tooltip with day total

### Bottom — Transactions
- Individual confirmed bookings: player name, date + time, court name, payment method, gross amount
- Infinite scroll, newest first
- Court filter dropdown for multi-court owners

### Out of scope for MVP
- Payout scheduling (manual payouts for MVP)
- CSV export (v2)

### Data
- Server Component only, no realtime
- Aggregate query: `bookings JOIN courts WHERE courts.owner_id = auth.uid() AND payment_status = 'paid'`

---

## Key Constraints

- All routes under `/owner/*` require `user.role === 'owner'`
- Slot creation always goes through the `hold_slot` RPC — never direct `UPDATE` on slots table
- Platform fee is always 10%, stored in `bookings.platform_fee`, never subtracted from `bookings.amount`
- Court photos stored in Supabase Storage, URLs stored as array in `courts.images`
- New courts always start as `pending` — no auto-activation in MVP

---

## Out of Scope (this spec)

- Player booking flow (next spec)
- Matchmaking feed (third spec)
- Push notifications for new bookings
- Automated payouts / GCash disbursement
- Court analytics beyond earnings (occupancy rate, peak hours)
