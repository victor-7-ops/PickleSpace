# Player Booking Flow — Design Spec
**Date:** 2026-06-03
**Status:** Approved
**Project:** PickleSpace

---

## Overview

The Player Booking Flow is the second sub-project in the PickleSpace build order. It covers everything a player experiences from finding a court to holding a QR code — plus the bridge into matchmaking via the post-booking "Post Open Game" prompt.

---

## Architecture

### Approach
Separate Next.js App Router route per step (Option 1). Each step is a focused Server Component with its own URL. This is the only approach that handles PayMongo's external redirect cleanly — the player leaves the app to pay on GCash, comes back to `/bookings/[id]/confirmed`, and the page resolves state server-side without reconstructing any client flow.

### Route Structure

```
app/
├── (dashboard)/player/
│   ├── layout.tsx          — player shell with tab nav
│   ├── discover/
│   │   └── page.tsx        — date-first court discovery
│   └── bookings/
│       └── page.tsx        — player's booking history + QR codes
├── courts/
│   └── [id]/
│       ├── page.tsx        — court detail (slots-first, public)
│       └── book/
│           └── page.tsx    — checkout page
└── bookings/
    └── [id]/
        └── confirmed/
            └── page.tsx    — post-payment confirmation + QR + open game prompt
```

### Auth Rules
- `/player/*` — requires `user.role === 'player'`; owners redirected to `/owner`
- `/courts/[id]` — **public** — no login required to browse
- `/courts/[id]/book` — requires login; unauthenticated users redirected to `/login?next=/courts/[id]/book?slot=[slot_id]`
- `/bookings/[id]/confirmed` — requires login; booking's `player_id` must match `auth.uid()`

### PayMongo Return Flow
1. Player confirms GCash/card payment → app calls `POST /api/bookings` → gets checkout URL → redirects to PayMongo
2. Player pays on PayMongo → PayMongo redirects to `/bookings/[id]/confirmed?payment=success`
3. PayMongo webhook independently fires → `confirm_booking` RPC → `booking_status = 'confirmed'`
4. Confirmation page reads `booking.payment_status` server-side — shows confirmed if paid, pending if webhook hasn't fired yet

---

## Page 1: Discovery (`/player/discover`)

### What it shows
- Three date chips: **Today · Tomorrow · Pick a date** (date picker on tap)
- Selected date highlighted green, defaults to Today
- List of courts with at least one available slot on selected date
- Each card: photo, name, city, hourly rate, available slot count, amenity icons
- Courts with zero slots on selected date are hidden (not greyed out)
- Empty state: "No courts available on [date] — try another day"

### Sorting
- Courts sorted by available slot count (most first)

### Data
- Server Component
- `?date=YYYY-MM-DD` in URL — shareable, Back button works
- Date chip selection navigates to `?date=YYYY-MM-DD` (no client state)
- Single join query: courts + count of available slots for selected date

### Out of scope for MVP
- Price filter
- Distance / map view
- Skill level filter

---

## Page 2: Court Detail (`/courts/[id]`)

### Layout — slots-first
- Sticky top bar: court name + back button (public page, no player dashboard header)
- **Slot grid is the hero** — visible without scrolling
  - Date tabs: selected date from discovery + ±3 days, swipeable
  - Available slots: green tappable chips showing time range + price (e.g. "8:00–9:00am · ₱500")
  - Held slots: greyed out "Unavailable"
  - Booked slots: hidden
  - Real-time updates via `useSlotRealtime`
- **"About this court"** collapsible section below grid:
  - Photos (horizontal scroll)
  - Description
  - Amenity chips
  - Address

### Slot tap behaviour
- Not logged in → redirect to `/login?next=/courts/[id]/book?slot=[slot_id]`
- Logged in → navigate to `/courts/[id]/book?slot=[slot_id]`
- `POST /api/slots/hold` called on navigation (10-min hold starts immediately)

### Out of scope for MVP
- Court reviews / ratings
- Directions / map embed

---

## Page 3: Checkout (`/courts/[id]/book`)

### What it shows
- Header: "Checkout" + back button + **hold timer countdown** (10:00 → 0:00, red under 2 min)
- Timer expired state: "Your hold expired — go back and pick another slot" + back button
- Booking summary card: court name, date, time range, total amount
  - Platform fee is **not shown as a line item** — player sees total only; split is internal
- Payment method picker: **GCash · Card · Cash** (GCash pre-selected)
- Optional notes field: "Message to court owner (optional)"
- "Confirm & Pay ₱X →" CTA (disabled while hold is being placed)

### On confirm
- **Cash** → `POST /api/bookings` with `payment_method: 'cash'` → navigate to `/bookings/[id]/confirmed`
- **GCash / Card** → `POST /api/bookings` → get PayMongo checkout URL → redirect player to PayMongo → PayMongo redirects back to `/bookings/[id]/confirmed?payment=success`

### Server-side guard
- Page fetches slot + court on load
- If slot is not held by this user (expired or taken) → redirect to `/courts/[id]` with error message

### Out of scope for MVP
- Coupon / promo codes
- Booking for someone else

---

## Page 4: Confirmation (`/bookings/[id]/confirmed`)

### Confirmed state (payment_status = 'paid' or cash booking)
- Large green ✓ animation
- "Booking Confirmed!" heading
- Booking summary: court name, date, time, amount, payment method
- **QR code rendered on screen** from `booking.qr_code` token (using `qrcode` npm package)
- Label: "Show this at the court for check-in"
- QR also sent to email via Resend (backup)

### Open Game prompt (below QR)
- Card: 🏓 "Need a playing partner?"
- "Post this slot to the matchmaking feed — other players can request to join"
- **Post Open Game** (green) → navigates to `/games/new?slot=[slot_id]&court=[court_id]` pre-filled
- **Skip** (grey) → navigates to `/player/bookings`

### Pending state (cash or webhook not yet fired)
- Yellow ✓, "Booking Received"
- "Payment pending — pay at the court on arrival"
- QR still shown (owner marks paid on their dashboard)

### Error state (payment failed)
- Red ✗, "Payment unsuccessful"
- "Try again" button → back to checkout

### Out of scope for MVP
- Add to Apple / Google Wallet
- Share booking with a friend

---

## Page 5: Player Bookings List (`/player/bookings`)

### What it shows
- Two tabs: **Upcoming** (default) · **Past**
- Booking cards: court name, date, time, status badge, QR button, amount + payment method
- Upcoming: sorted by slot date ascending (soonest first)
- Past: sorted by slot date descending (most recent first)
- Empty state: "No bookings yet — find a court to play"

### QR full-screen view
- Slide-up Sheet component (already built)
- QR large and centered, white background
- Booking details below it

### Out of scope for MVP
- Cancel booking / refund request
- Rebooking (book same court again)
- Booking receipt download

---

## New API Routes Needed

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/courts/[id]/slots` | GET | Fetch available slots for a court + date range |
| `/api/bookings` | POST | Already exists — create booking + PayMongo link |

No new routes needed beyond these — the slot hold (`/api/slots/hold`) and booking creation (`/api/bookings`) already exist from the scaffold.

---

## Key Constraints

- Platform fee never shown to player — total price only
- `hold_slot` RPC must be called before navigating to checkout — never skip this
- `/courts/[id]` must remain public (no auth required) — players browse without accounts
- Confirmation page must handle three states: confirmed, pending, error
- QR code rendered with `qrcode` package (already in package.json) — not an image from storage
- Post Open Game prompt appears on ALL confirmed bookings regardless of skill level

---

## Out of Scope (this spec)
- Matchmaking feed and game joining (third spec)
- Player profile / skill level setup
- Court search by name
- Push notifications
