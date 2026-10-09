-- When a daily puzzle stops being today anywhere: 12:00 UTC the day after its
-- date. From then on an unfinished game is lost, so an answer seen elsewhere
-- cannot win it late and mend a streak. Free play leaves it null.
ALTER TABLE guess_games ADD COLUMN closes_at timestamptz;
