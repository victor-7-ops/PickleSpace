-- Migration 003: join_game + leave_game RPCs (Phase 3)
-- Spec: docs/superpowers/specs/2026-06-12-open-play-matchmaking-v2.md §2.4–2.5
--
-- Both follow the hold_slot philosophy: SELECT FOR UPDATE first, then mutate.
-- Never update game/player state outside these RPCs.

-- ─────────────────────────────────────────────
-- RPC: join_game
--
-- Returns jsonb:
--   { game_player_id, status ('joined'|'waitlisted'), price_per_head,
--     payment_method, requires_payment (bool) }
--
-- requires_payment = true means API layer must create a PayMongo link
-- (cash joins and ₱0 games skip payment entirely)
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.join_game(
  p_game_id       uuid,
  p_payment_method text   -- 'gcash' | 'card' | 'cash'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_game         public.games;
  v_joined_count int;
  v_assigned     game_player_status;
  v_caller       uuid := auth.uid();
  v_gp_id        uuid;
BEGIN
  -- Validate payment method up front
  IF p_payment_method NOT IN ('gcash', 'card', 'cash') THEN
    RAISE EXCEPTION 'Invalid payment method: %', p_payment_method;
  END IF;

  -- Lock the game row to prevent concurrent over-enrollment
  SELECT * INTO v_game
  FROM public.games
  WHERE id = p_game_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Game not found';
  END IF;

  IF v_game.status IN ('cancelled', 'completed') THEN
    RAISE EXCEPTION 'Game is % and cannot be joined', v_game.status;
  END IF;

  -- Idempotency guard: caller must not already be active in this game
  IF EXISTS (
    SELECT 1 FROM public.game_players
    WHERE game_id = p_game_id
      AND player_id = v_caller
      AND status IN ('joined', 'waitlisted')
  ) THEN
    RAISE EXCEPTION 'You are already in this game';
  END IF;

  -- Count active (joined) players while row is locked
  SELECT COUNT(*) INTO v_joined_count
  FROM public.game_players
  WHERE game_id = p_game_id AND status = 'joined';

  -- Assign spot or waitlist
  v_assigned := CASE
    WHEN v_joined_count < v_game.max_players THEN 'joined'::game_player_status
    ELSE 'waitlisted'::game_player_status
  END;

  -- Insert player row
  INSERT INTO public.game_players (
    game_id, player_id, status, payment_method, payment_status
  ) VALUES (
    p_game_id,
    v_caller,
    v_assigned,
    p_payment_method::payment_method,
    -- Cash joins stay 'unpaid' until owner marks paid; card/gcash start 'pending'
    CASE WHEN p_payment_method = 'cash' OR v_game.price_per_head = 0
         THEN 'unpaid'::game_payment_status
         ELSE 'pending'::game_payment_status
    END
  )
  RETURNING id INTO v_gp_id;

  -- Keep current_players in sync
  UPDATE public.games
  SET current_players = current_players + 1
  WHERE id = p_game_id;

  -- Flip game to 'full' if this was the last open spot
  IF v_assigned = 'joined' AND (v_joined_count + 1) >= v_game.max_players THEN
    UPDATE public.games SET status = 'full' WHERE id = p_game_id;
  END IF;

  RETURN jsonb_build_object(
    'game_player_id',  v_gp_id,
    'status',          v_assigned,
    'price_per_head',  v_game.price_per_head,
    'payment_method',  p_payment_method,
    -- API layer creates PayMongo link when this is true
    'requires_payment', (
      v_assigned = 'joined'
      AND p_payment_method <> 'cash'
      AND v_game.price_per_head > 0
    )
  );
END;
$$;


-- ─────────────────────────────────────────────
-- RPC: leave_game
--
-- Returns jsonb:
--   { promoted_player_id uuid | null }
--
-- API layer should send Resend email to promoted player when non-null.
-- Refunds are manual (refund_due status); no PayMongo reversal in MVP.
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.leave_game(
  p_game_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_game               public.games;
  v_slot               public.slots;
  v_gp                 public.game_players;
  v_caller             uuid := auth.uid();
  v_promoted_player_id uuid := NULL;
  v_promoted_gp_id     uuid;
  v_joined_count       int;
  v_game_start         timestamptz;
BEGIN
  -- Lock game row
  SELECT * INTO v_game
  FROM public.games
  WHERE id = p_game_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Game not found';
  END IF;

  IF v_game.status IN ('cancelled', 'completed') THEN
    RAISE EXCEPTION 'Game is already %', v_game.status;
  END IF;

  -- Enforce 2-hour cutoff using the linked slot's date + start_time
  IF v_game.slot_id IS NOT NULL THEN
    SELECT * INTO v_slot FROM public.slots WHERE id = v_game.slot_id;
    IF FOUND THEN
      v_game_start := (v_slot.date + v_slot.start_time)::timestamptz;
      IF now() > v_game_start - interval '2 hours' THEN
        RAISE EXCEPTION 'Cannot leave within 2 hours of game start';
      END IF;
    END IF;
  END IF;

  -- Lock caller's player row
  SELECT * INTO v_gp
  FROM public.game_players
  WHERE game_id = p_game_id
    AND player_id = v_caller
    AND status IN ('joined', 'waitlisted')
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'You are not an active participant in this game';
  END IF;

  -- Mark caller as left; flag paid rows for manual refund
  UPDATE public.game_players
  SET
    status = 'left',
    payment_status = CASE
      WHEN payment_status = 'paid' THEN 'refund_due'::game_payment_status
      ELSE 'unpaid'::game_payment_status
    END
  WHERE id = v_gp.id;

  -- Keep current_players in sync
  UPDATE public.games
  SET current_players = GREATEST(current_players - 1, 0)
  WHERE id = p_game_id;

  -- Waitlist promotion only applies when a 'joined' spot opens on a 'full' game
  IF v_gp.status = 'joined' AND v_game.status = 'full' THEN

    -- Find earliest waitlisted player
    SELECT gp.player_id, gp.id
    INTO v_promoted_player_id, v_promoted_gp_id
    FROM public.game_players gp
    WHERE gp.game_id = p_game_id AND gp.status = 'waitlisted'
    ORDER BY gp.joined_at ASC
    LIMIT 1
    FOR UPDATE;

    IF v_promoted_player_id IS NOT NULL THEN
      UPDATE public.game_players
      SET status = 'joined'
      WHERE id = v_promoted_gp_id;
    END IF;

    -- Re-count joined to set correct game status
    SELECT COUNT(*) INTO v_joined_count
    FROM public.game_players
    WHERE game_id = p_game_id AND status = 'joined';

    UPDATE public.games
    SET status = CASE
      WHEN v_joined_count >= max_players THEN 'full'::game_status
      ELSE 'open'::game_status
    END
    WHERE id = p_game_id;

  END IF;

  RETURN jsonb_build_object(
    'promoted_player_id', v_promoted_player_id
  );
END;
$$;


-- ─────────────────────────────────────────────
-- CRON: Promote waitlisted players whose 'pending' payment slot was abandoned
--
-- The 10-min pending-release cron (migration 002) marks rows 'left'.
-- This follow-up promotes the next waitlisted player for each affected game,
-- mirroring the leave_game waitlist logic for cron-driven departures.
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.promote_after_pending_release()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  r record;
  v_promoted_id uuid;
  v_promoted_gp_id uuid;
  v_joined_count int;
BEGIN
  -- For each game that has a newly-left slot (left in the last 2 minutes to catch cron drift)
  -- and at least one waitlisted player
  FOR r IN
    SELECT DISTINCT gp.game_id
    FROM public.game_players gp
    JOIN public.games g ON g.id = gp.game_id
    WHERE gp.status = 'left'
      AND gp.joined_at > now() - interval '12 minutes'  -- slightly beyond 10-min window
      AND g.status IN ('open', 'full')
      AND EXISTS (
        SELECT 1 FROM public.game_players
        WHERE game_id = gp.game_id AND status = 'waitlisted'
      )
  LOOP
    SELECT COUNT(*) INTO v_joined_count
    FROM public.game_players
    WHERE game_id = r.game_id AND status = 'joined';

    -- Promote if there's still room
    PERFORM g.max_players FROM public.games g WHERE g.id = r.game_id;

    SELECT gp2.player_id, gp2.id
    INTO v_promoted_id, v_promoted_gp_id
    FROM public.game_players gp2
    JOIN public.games g2 ON g2.id = gp2.game_id
    WHERE gp2.game_id = r.game_id
      AND gp2.status = 'waitlisted'
      AND v_joined_count < g2.max_players
    ORDER BY gp2.joined_at ASC
    LIMIT 1;

    IF v_promoted_id IS NOT NULL THEN
      UPDATE public.game_players SET status = 'joined' WHERE id = v_promoted_gp_id;

      SELECT COUNT(*) INTO v_joined_count
      FROM public.game_players
      WHERE game_id = r.game_id AND status = 'joined';

      UPDATE public.games
      SET status = CASE
        WHEN v_joined_count >= max_players THEN 'full'::game_status
        ELSE 'open'::game_status
      END
      WHERE id = r.game_id;
    END IF;
  END LOOP;
END;
$$;

SELECT cron.schedule(
  'promote-after-pending-release',
  '* * * * *',
  $$ SELECT public.promote_after_pending_release(); $$
);
