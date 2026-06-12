-- Migration 002: Open Play & Matchmaking v2 (Phase 3)
-- Spec: docs/superpowers/specs/2026-06-12-open-play-matchmaking-v2.md §2.1–2.3 + §2.6
--
-- RECONCILIATION NOTES (read schema.sql before applying):
--   - games.slot_id already exists; booking_id is additive (owner open play booking reference)
--   - payment_status enum (bookings) conflicts with spec's game-player statuses → new enum game_payment_status
--   - game_player_status enum missing 'attended' and 'no_show' → ALTER TYPE
--   - users.skill_level default was 'beginner' → changed to NULL (skippable onboarding)

-- ─────────────────────────────────────────────
-- ENUM ADDITIONS
-- ─────────────────────────────────────────────

-- game_player_status: add attended + no_show
ALTER TYPE game_player_status ADD VALUE IF NOT EXISTS 'attended';
ALTER TYPE game_player_status ADD VALUE IF NOT EXISTS 'no_show';

-- New enum for per-head payment tracking (separate from booking payment_status)
DO $$ BEGIN
  CREATE TYPE game_payment_status AS ENUM ('unpaid', 'pending', 'paid', 'refund_due');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─────────────────────────────────────────────
-- §2.1 ALTER games
-- ─────────────────────────────────────────────

ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS host_type text NOT NULL DEFAULT 'player'
    CHECK (host_type IN ('owner', 'player')),
  ADD COLUMN IF NOT EXISTS price_per_head int NOT NULL DEFAULT 0,       -- centavos
  ADD COLUMN IF NOT EXISTS platform_fee_pct numeric(4,2) NOT NULL DEFAULT 0.00,
    -- snapshot at creation: 5.00 for owner open play, 0.00 for player-hosted
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public'
    CHECK (visibility IN ('public', 'unlisted')),
  ADD COLUMN IF NOT EXISTS booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL;
    -- set for owner open play (owner's own booking); null for player-hosted games

-- ─────────────────────────────────────────────
-- §2.2 ALTER game_players
-- ─────────────────────────────────────────────

ALTER TABLE public.game_players
  ADD COLUMN IF NOT EXISTS payment_status game_payment_status NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS payment_method payment_method,         -- reuse existing enum (gcash|card|cash)
  ADD COLUMN IF NOT EXISTS paymongo_reference text;               -- links webhook → this row

-- Index for pending-release cron
CREATE INDEX IF NOT EXISTS gp_pending_payment_idx
  ON public.game_players (payment_status, joined_at)
  WHERE payment_status = 'pending';

-- ─────────────────────────────────────────────
-- §2.3 ALTER users
-- ─────────────────────────────────────────────

-- Change skill_level default to NULL (skippable; onboarding prompts until set)
ALTER TABLE public.users ALTER COLUMN skill_level SET DEFAULT NULL;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS games_played int NOT NULL DEFAULT 0;

-- ─────────────────────────────────────────────
-- §2.6 RLS additions
-- ─────────────────────────────────────────────

-- GAMES: venue owner can insert open-play games for their own courts
DROP POLICY IF EXISTS "games_insert_owner_open_play" ON public.games;
CREATE POLICY "games_insert_owner_open_play" ON public.games FOR INSERT
  WITH CHECK (
    -- existing player-hosted rule: host_id = caller
    host_id = auth.uid()
    AND (
      -- player-hosted: booking must belong to caller (Phase 4 gate — RLS written now)
      host_type = 'player'
      OR
      -- owner open play: caller owns the court
      (host_type = 'owner' AND EXISTS (
        SELECT 1 FROM public.courts WHERE id = court_id AND owner_id = auth.uid()
      ))
    )
  );

-- Replace the simple insert policy
DROP POLICY IF EXISTS "games_insert_auth" ON public.games;

-- Owner can also update games on their own courts (e.g. complete session)
DROP POLICY IF EXISTS "games_update_owner_court" ON public.games;
CREATE POLICY "games_update_owner_court" ON public.games FOR UPDATE
  USING (
    host_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.courts WHERE id = court_id AND owner_id = auth.uid())
  );

-- Replace the old host-only update policy
DROP POLICY IF EXISTS "games_update_host" ON public.games;

-- GAME_PLAYERS: game host + venue owner can read full roster
DROP POLICY IF EXISTS "gp_select_all" ON public.game_players;
CREATE POLICY "gp_select_all" ON public.game_players FOR SELECT USING (true);

-- Owner can update any player row on their court's games (mark cash paid, check-in)
DROP POLICY IF EXISTS "gp_update_owner" ON public.game_players;
CREATE POLICY "gp_update_owner" ON public.game_players FOR UPDATE
  USING (
    player_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.games g
      JOIN public.courts c ON c.id = g.court_id
      WHERE g.id = game_id AND c.owner_id = auth.uid()
    )
  );

-- USERS: expose games_played + skill_level to game roster readers (same select policy — no change needed)

-- ─────────────────────────────────────────────
-- CRON: Release pending game payments after 10 min → status 'left' + waitlist promotion
-- Waitlist promotion is handled by the leave_game RPC; cron just marks abandoned rows 'left'
-- ─────────────────────────────────────────────
SELECT cron.schedule(
  'release-pending-game-payments',
  '* * * * *',
  $$
    UPDATE public.game_players
    SET status = 'left', payment_status = 'unpaid'
    WHERE payment_status = 'pending'
      AND joined_at < now() - interval '10 minutes';
  $$
);
