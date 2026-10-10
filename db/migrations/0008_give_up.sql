-- When the player gave up: the game is lost from then on and shows its answer.
-- Null for every game that ends any other way.
ALTER TABLE hangman_games ADD COLUMN given_up_at timestamptz;
ALTER TABLE guess_games ADD COLUMN given_up_at timestamptz;
