-- Hangman's campaign and free play are two modes on the same table, each
-- with its own open game. Campaign progress and the free-play streak are
-- derived from these rows, never stored. Daily games are neither: they have
-- a puzzle.
ALTER TABLE hangman_games ADD COLUMN campaign boolean NOT NULL DEFAULT false;

-- The generations a free-play game drew from, so "Play again" keeps them.
-- Null is every species; campaign and daily games leave it null.
ALTER TABLE hangman_games ADD COLUMN gens smallint[];
