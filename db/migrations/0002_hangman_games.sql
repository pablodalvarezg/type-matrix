-- A free-play Hangman game. The answer lives here and nowhere the client can
-- read: the client holds the id. Status is derived from the letters, not stored.
CREATE TABLE hangman_games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES players (id),
  species_slug text NOT NULL,
  -- The guesses in order, lowercase a–z, each at most once.
  letters text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
