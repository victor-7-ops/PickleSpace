-- Phase 4: player-hosted games
-- Adds auto_join flag and the host_remove_player RPC (used in Step 31).

ALTER TABLE games
  ADD COLUMN IF NOT EXISTS auto_join boolean NOT NULL DEFAULT true;

-- RPC: host or venue owner removes a player from their game.
-- Sets status → 'left'; if paid → 'refund_due'. Promotes waitlisted if at capacity.
CREATE OR REPLACE FUNCTION host_remove_player(
  p_game_id    uuid,
  p_player_id  uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_game         record;
  v_gp           record;
  v_caller_id    uuid := auth.uid();
  v_court_owner  uuid;
  v_promoted     uuid;
BEGIN
  -- Load game + verify caller is host or venue owner
  SELECT g.*, c.owner_id AS court_owner_id
    INTO v_game
    FROM games g
    JOIN courts c ON c.id = g.court_id
   WHERE g.id = p_game_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Game not found';
  END IF;

  IF v_game.host_id <> v_caller_id AND v_game.court_owner_id <> v_caller_id THEN
    RAISE EXCEPTION 'Only the host or venue owner can remove players';
  END IF;

  -- Load the target player row
  SELECT * INTO v_gp
    FROM game_players
   WHERE game_id = p_game_id
     AND player_id = p_player_id
     AND status IN ('joined','waitlisted');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Player is not in this game';
  END IF;

  -- Mark removed
  UPDATE game_players
     SET status         = 'left',
         payment_status = CASE
                            WHEN payment_status = 'paid' THEN 'refund_due'
                            WHEN payment_status = 'pending' THEN 'refund_due'
                            ELSE payment_status
                          END
   WHERE id = v_gp.id;

  -- If the removed player was joined and game was full, promote earliest waitlisted
  IF v_gp.status = 'joined' AND v_game.status = 'full' THEN
    SELECT player_id INTO v_promoted
      FROM game_players
     WHERE game_id = p_game_id
       AND status = 'waitlisted'
     ORDER BY joined_at ASC
     LIMIT 1
       FOR UPDATE;

    IF FOUND THEN
      UPDATE game_players
         SET status = 'joined'
       WHERE game_id = p_game_id AND player_id = v_promoted;

      UPDATE games
         SET status = 'open',
             current_players = current_players  -- count stays same (removed+promoted = net 0 change in joined)
       WHERE id = p_game_id;
    ELSE
      -- No waitlist; decrement joined count
      UPDATE games
         SET status          = 'open',
             current_players = GREATEST(0, current_players - 1)
       WHERE id = p_game_id;
    END IF;
  ELSIF v_gp.status = 'joined' THEN
    UPDATE games
       SET current_players = GREATEST(0, current_players - 1)
     WHERE id = p_game_id;
  END IF;
END;
$$;
