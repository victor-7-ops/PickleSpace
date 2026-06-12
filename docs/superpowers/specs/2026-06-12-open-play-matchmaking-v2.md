# Open Play & Matchmaking v2 — Delta Spec

**Date:** 2026-06-12
**Status:** Draft for approval
**Supersedes:** original Phase 3 Matchmaking Feed concept; replaces the earlier `open_sessions` draft
**Extends:** existing `games` / `game_players` tables in `supabase/schema.sql` — DO NOT create new session tables
**Depends on:** `CLAUDE.md`, Owner Dashboard spec(s), `hold_slot` / `confirm_booking` RPCs

---

## 0. For Claude Code (read first)

- This is a **delta spec**. The schema already has `games`, `game_players`, `api/games/`, and `games/[id]`. Extend them. Never create `open_sessions` or `session_players`.
- Honor existing Key Rules from CLAUDE.md/README: never update slot status directly (RPCs only), correct Supabase client per context, fee stored separately.
- Before writing any migration, READ `supabase/schema.sql` and reconcile column names with this spec. If a column proposed here already exists, skip it. If types conflict, flag it and stop.
- Skill levels stay **categorical**: `'beginner' | 'intermediate' | 'advanced' | 'open'`. No numeric ratings.

---

## 1. Strategic framing

Three session sources, one feed, one escalation ladder:

**LFG post → player-hosted game → confirmed court session → QR check-in → games_played++**

| Type | Who creates | Court? | Payment | Phase |
|---|---|---|---|---|
| Owner Open Play | Venue owner | Owner books own slot | per-head, GCash/cash | **3 (this spec)** |
| Player-Hosted Game | Player with a booking | Player's existing booking | cost-split per head | **4** |
| LFG Post | Anyone | None (convertible) | None | **5 — do not build yet** |

MVP strategy: anchor venue. Schema multi-tenant, UI single-venue.

**Fees:** whole-court booking 10% (unchanged). Owner open play **5%**. Player-hosted split **0%** (booking already took 10%; don't double-dip).

---

## 2. Schema changes (one migration file)

### 2.1 ALTER `games`

```sql
ALTER TABLE games
  ADD COLUMN IF NOT EXISTS host_type text NOT NULL DEFAULT 'player'
    CHECK (host_type IN ('owner','player')),
  ADD COLUMN IF NOT EXISTS price_per_head int NOT NULL DEFAULT 0, -- centavos
  ADD COLUMN IF NOT EXISTS platform_fee_pct numeric(4,2) NOT NULL DEFAULT 0.00,
    -- snapshot at creation: 5.00 for owner open play, 0.00 for player-hosted
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public'
    CHECK (visibility IN ('public','unlisted'));
```

If `games` lacks any of: `capacity`/`max_players`, `status`, `skill_level`, `booking_id` FK — reconcile with what exists; the README implies max player count and skill filter already exist. `status` must support: `open`, `full`, `cancelled`, `completed`.

### 2.2 ALTER `game_players`

```sql
ALTER TABLE game_players
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid','pending','paid','refund_due')),
  ADD COLUMN IF NOT EXISTS payment_method text
    CHECK (payment_method IN ('gcash','card','cash')),
  ADD COLUMN IF NOT EXISTS paymongo_reference text; -- link webhook → player row
```

`game_players.status` must support: `joined`, `waitlisted`, `left`, `attended`, `no_show`. Add values / convert to CHECK as needed. UNIQUE (game_id, player_id) if not already present.

### 2.3 ALTER `users`

```sql
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS skill_level text DEFAULT NULL
    CHECK (skill_level IN ('beginner','intermediate','advanced')),
  ADD COLUMN IF NOT EXISTS games_played int NOT NULL DEFAULT 0;
```

Skill set during onboarding (skippable; feed prompts until set). Used to default-filter the feed to the player's level + `open` games.

### 2.4 RPC `join_game(p_game_id uuid, p_payment_method text)`

Atomic, same philosophy as `hold_slot`:
1. `SELECT ... FOR UPDATE` on the game row
2. Count `game_players` with status `joined`
3. count < capacity → insert caller as `joined`; else insert `waitlisted`
4. If newly at capacity → set game status `full`
5. Returns assigned status + (if paid game) data needed to create the PayMongo link

Caller must not already have a row with status `joined`/`waitlisted` (raise).

### 2.5 RPC `leave_game(p_game_id uuid)`

1. Reject if `now() > start_time - interval '2 hours'`
2. Set caller's row → `left`; if `paid` → `refund_due` (manual handling, MVP)
3. If game was `full` → promote earliest `waitlisted` (by joined_at) → `joined`, set game `open` if below capacity
4. Return promoted player id or null (API layer sends Resend email: "You're in — confirm payment")

### 2.6 RLS additions

- `games`: owner of venue can insert with `host_type='owner'` for own courts; players can insert `host_type='player'` only where `booking_id` belongs to them (Phase 4 — write policy now, gate in UI)
- `game_players`: players insert/update own rows only via RPCs; game host + venue owner can read roster; host can remove a player (Phase 4)

---

## 3. Flows

### 3.1 Owner creates open play (Phase 3)

Owner dashboard → Schedule → empty slot → "New open play": skill level, capacity (4–8), ₱/head. Internally:
1. Venue books its own slot via existing `hold_slot` → `confirm_booking` path (booking owned by venue; amount 0 or internal — decide in implementation, flag in PR)
2. Insert `games` row: `host_type='owner'`, `platform_fee_pct=5.00`, `booking_id` → that booking

The slot grid therefore shows open play as an occupied slot. No parallel reservation system.

### 3.2 Player feed (Phase 3)

- `player/games` feed: next 7 days, default filter = user's `skill_level` + `open`-level games; manual override chips for all levels
- Card: venue, court, time, skill badge, ₱/head, joined/capacity (realtime via subscription on `game_players`), avatars
- Realtime: extend `useSlotRealtime.ts` pattern — `useGameRealtime.ts`

### 3.3 Join + per-head payment (Phase 3) — **the biggest new engineering**

Current system: one booking = one payment. Games: N small charges against one booking.

- Join (GCash/card): `join_game` RPC → create PayMongo link for `price_per_head` with metadata `{game_id, game_player_id}` → set `payment_status='pending'`
- **Webhook change:** `api/payments/webhook` must branch — if metadata has `game_player_id`, mark that `game_players` row `paid` and email per-head QR; else existing booking path. Do not break the existing booking webhook.
- Join (cash): row `joined` + `payment_status='unpaid'`, `payment_method='cash'`; owner marks paid at check-in (reuse cash-only gating rule from Owner Dashboard)
- Unpaid `pending` GCash joins auto-release after 10 min (reuse hold-expiry cron pattern) → status `left`, waitlist promotion runs

### 3.4 Check-in & completion (Phase 3)

- Per-player QR (one per `game_players` row), scanned by owner → status `attended` (+ mark cash paid)
- Owner "Complete session" button (no cron): game → `completed`; remaining `joined` → `no_show`; `attended` players get `games_played + 1`

### 3.5 Player-hosted games (Phase 4 — spec'd, not built in Phase 3)

- Player's booking detail → toggle "Open this game to players": capacity, skill level
- per_head = booking gross ÷ capacity (auto); host's effective cost shrinks as joiners pay; UI must state at creation: "If only N join, you cover the rest"
- `platform_fee_pct = 0`. Joiner payments flow via same per-head webhook branch
- Optional `auto_join boolean` (default true); false = host approves joiners

### 3.6 LFG posts (Phase 5 — DO NOT BUILD YET)

New `lfg_posts` table (player, area, date window, skill, status, `converted_game_id`) + realtime interest thread. Build only after real users exist. Listed here so schema naming stays consistent.

---

## 4. Owner Dashboard amendments

- Open Play is a **section, not a 5th tab** (mobile tab-bar crowding finding from v2 audit)
- Schedule grid: open-play slots get pattern/badge treatment, not color-only (colorblind rule)
- Bookings tab: game rows expand to roster — per-player payment status, check-in state, "mark cash paid"
- Earnings: "Open Play" line/chip; net-first; per-head gross × attendees − 5% fee
- Desktop: responsive expansion of owner route group (JamSpace pattern), not a separate app

---

## 5. Explicit cuts

| Cut | Reason |
|---|---|
| Player-hosted UI | Phase 4; RLS written now, UI gated |
| LFG posts | Phase 5; empty forum worse than nothing |
| Numeric/DUPR skill | Categorical is friendlier for MVP |
| In-app chat | Game detail + roster suffices; PH uses Messenger |
| Automated refunds | `refund_due` status + manual handling |
| Push notifications | Resend email only |
| Cron session completion | Manual owner button |
| Multi-venue discovery UI | Schema supports; anchor venue only |

---

## 6. Claude Code prompt sequence (Phase 3 = Steps 22–28)

Run in order; each step = one session/PR. Every prompt: "Read CLAUDE.md and docs/superpowers/specs/2026-06-12-open-play-matchmaking-v2.md first."

22. **Migration**: §2.1–2.3 ALTERs + status value reconciliation + RLS (§2.6). Must first read schema.sql and report any conflicts before writing SQL.
23. **RPCs**: `join_game`, `leave_game` + race-condition tests (concurrent joins at capacity-1; leave/promote interleaving)
24. **Owner UI**: create open play from Schedule + roster view in Bookings + "Complete session"
25. **Player feed**: `player/games` with skill filtering + `useGameRealtime.ts`
26. **Join/pay flow**: per-head PayMongo link + webhook branch (do not regress booking webhook — add a test that the existing path still passes) + cash join + 10-min pending release
27. **Check-in + earnings**: per-player QR scan, cash mark-paid, Earnings open-play line
28. **Onboarding**: skill-level step for new players + feed prompt for unset skill

Phase 4 (player-hosted) = Steps 29–31, prompts written after Phase 3 ships.
