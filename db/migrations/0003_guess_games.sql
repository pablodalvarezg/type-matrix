-- A free-play Stats & types game. Like hangman_games, the answer lives only
-- here and the client holds the id. Status is derived from the guesses.
CREATE TABLE guess_games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES players (id),
  species_slug text NOT NULL,
  -- The guessed species slugs in order, each at most once.
  guesses text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
