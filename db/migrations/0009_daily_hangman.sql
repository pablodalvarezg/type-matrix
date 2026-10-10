-- The daily puzzle gets a Hangman round too, with the columns its Stats &
-- types round has (0004, 0005, 0006): the puzzle number, when it closes, and
-- when the winning letter landed, by the database's clock.
ALTER TABLE hangman_games ADD COLUMN puzzle integer;
ALTER TABLE hangman_games ADD COLUMN closes_at timestamptz;
ALTER TABLE hangman_games ADD COLUMN won_at timestamptz;

-- One game per player per puzzle; free play leaves puzzle null.
ALTER TABLE hangman_games
  ADD CONSTRAINT hangman_games_daily_key UNIQUE (player_id, puzzle);
