-- A daily game is a Stats & types game with a puzzle number; free play leaves
-- it null. Streaks are derived from these rows, never stored.
ALTER TABLE guess_games ADD COLUMN puzzle integer;

-- One game per player per puzzle. Nulls are distinct, so free play is not
-- limited by it.
ALTER TABLE guess_games
  ADD CONSTRAINT guess_games_daily_key UNIQUE (player_id, puzzle);
