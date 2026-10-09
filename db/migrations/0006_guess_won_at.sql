-- When the winning guess landed, by the database's clock. With created_at it
-- is the leaderboard's time: neither the client's clock nor the app's.
-- Null until a win, and for any game that never has one.
ALTER TABLE guess_games ADD COLUMN won_at timestamptz;
