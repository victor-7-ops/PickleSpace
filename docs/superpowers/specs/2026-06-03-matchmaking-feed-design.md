# Matchmaking Feed — Design Spec
**Date:** 2026-06-03
**Status:** Approved
**Project:** PickleSpace

---

## Overview

The Matchmaking Feed is the third and final sub-project in the PickleSpace build order. It lets players post open games on their booked court slots and lets others join — bridging court booking into community play. The "Post Open Game" entry point already exists on the booking confirmation page, linking to `/games/new?slot=[id]&court=[id]`.

---

## Architecture

### Approach
Separate Next.js App Router routes per page (consistent with Owner Dashboard and Booking Flow). Game detail pages at `/games/[id]` must be public and shareable — players share links via Viber/Facebook Messenger group chats to recruit opponents.

### Route Structure

```
app/
├── (dashboard)/player/
│   └── games/
│       └── page.tsx        — Discover + My Games tabs
├── games/
│   ├── [id]/
│   │   └── page.tsx        — Game detail (public, shareable)
│   └── new/
│       └── page.tsx        — Create game form
```

### Auth Rules
- `/player/games` — requires `user.role === 'player'`
- `/games/[id]` — **public** — no login required to view
- `/games/new` — requires login; unauthenticated → `/login?next=/games/new?slot=[id]&court=[id]`

### Realtime
- Feed (`/player/games`) subscribes to `games` table — new games appear in the correct date group without refresh
- Game detail (`/games/[id]`) subscribes to `game_players` table — player count + avatars update live

### Existing API Routes (already built)
- `GET /api/games?status=open&courtId=&skillLevel=` — list games with filters
- `POST /api/games` — create game + auto-join host as player 1

### New API Routes Needed

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/games/[id]/join` | POST | Join a game (validates: not full, not already joined, game is open) |
| `/api/games/[id]/leave` | POST | Leave a game (host cannot leave — must cancel instead) |
| `/api/games/[id]/cancel` | POST | Host cancels game → status = 'cancelled' |

---

## Page 1: Games Feed (`/player/games`)

### Discover Tab (default)

**Layout:**
- Date-grouped sections: **Today · Tomorrow · [date headers for subsequent days]**
- Within each date: games sorted by start time ascending
- Game card: title, court name, time, skill level badge, host name, spots remaining
  - 2+ spots → green badge
  - 1 spot → yellow badge
  - Full → red "Full" badge, card slightly greyed out but still tappable
- Filter chips: **All · Open · My skill level** (filters by player's `skill_level` from users table)
- Realtime: new games appear in their date group without page refresh
- Empty state: "No open games — be the first to post one!"

**"+ Post Game" floating button:**
- Bottom-right, green
- Navigates to `/games/new` (no slot pre-fill — independent of booking)

### My Games Tab

- Two sections: **Upcoming** and **Past** (split by slot date vs today)
- Shows games player is hosting OR has joined (any `game_players` row for this user)
- Role badge: "Hosting" (green) or "Joined" (blue)
- Tapping any card opens `/games/[id]`
- Empty state: "You haven't joined any games yet — browse Discover to find one"

---

## Page 2: Game Detail (`/games/[id]`)

### Layout

**Header (sticky):**
- Back button + game title
- Court name, date, time range
- Skill level badge + "Hosted by [name]"

**Players section:**
- Avatar row: filled circles (joined players with initials/photo) + empty dashed circles (open spots)
- Player name list below avatars: host marked "(host)"
- Spot count label: "2 of 4 spots filled"
- Realtime: avatar row updates live via `game_players` subscription

**About section:**
- Description (if provided)
- Court address

**Bottom CTA — 4 states:**

| State | Who sees it | UI |
|-------|------------|-----|
| Can join | Logged-in player, not joined, game open | Green "Join Game →" button |
| Already joined | Player who joined | "You're in ✓" label + grey "Leave Game" button |
| Full | Anyone, game at max_players | Disabled "Game Full" button |
| Host | Game creator | Red "Cancel Game" button |
| Not logged in | Unauthenticated visitor | "Log in to join" → `/login?next=/games/[id]` |

**On join:** calls `POST /api/games/[id]/join` → player count updates live → button switches to "You're in ✓"

**On leave:** calls `POST /api/games/[id]/leave` → player removed, spot opens

**On cancel (host):**
- Confirmation slide-up sheet: "Cancel this game? All joined players will be notified."
- Calls `POST /api/games/[id]/cancel` → `status = 'cancelled'`
- Page shows cancelled state: "This game has been cancelled"

**Cancelled game state:**
- Grey banner: "This game has been cancelled by the host"
- Player list still shown (historical)
- All action buttons hidden

### Out of scope for MVP
- Chat between players
- Player ratings / profiles

---

## Page 3: Create Game (`/games/new`)

### Pre-filled flow (from booking confirmation)
- `?slot=[id]&court=[id]` params present
- Court + slot shown as a locked green card: court name, date, time, "already booked ✓"
- Player fills in the 4 form fields below and posts

### No params flow
- No slot/court pre-fill
- Show message: "Book a court first to post a game" + "Find a Court →" link to `/player/discover`
- This keeps MVP scope tight — games must be tied to a real booked slot

### Form Fields

1. **Game title** — text input, required (placeholder: "e.g. Casual doubles, all welcome")
2. **Skill level** — chip selector: Open · Beginner · Intermediate · Advanced (Open pre-selected)
3. **Max players** — chip selector: 2 · 4 · 6 (4 pre-selected)
4. **Description** — textarea, optional (placeholder: "e.g. Bring your own paddle, parking available")

### On Submit
- Calls `POST /api/games` with `{ courtId, slotId, title, description, skillLevel, maxPlayers }`
- Host auto-joined as player 1 (handled by existing API)
- Navigates to `/games/[id]` of newly created game
- Player sees detail page with "Hosting" badge and can copy + share the URL

---

## Key Constraints

- `/games/[id]` must be public — never require login to view game details
- Games must be tied to a booked slot in MVP — no free-form game creation without a court booking
- Host cannot leave their own game — they can only cancel it
- `game_players.status` field already supports `'waitlisted'` in the schema — waitlist UI is out of scope for MVP but schema is ready
- Full games are shown in the feed (greyed out) — they are not hidden
- The `game_players` realtime subscription drives live player count on the detail page

---

## Out of Scope (this spec)
- Waitlist (schema ready, UI deferred to post-MVP)
- Push notifications when someone joins your game
- Player-to-player chat within a game
- Player skill ratings / profiles
- Searching games by court or keyword
