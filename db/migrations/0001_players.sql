-- A player is the random id in their signed cookie. The row appears the first
-- time they save something, so visitors who only look leave nothing behind.
CREATE TABLE players (
  id uuid PRIMARY KEY,
  nickname text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- One nickname per player, case aside: Ash and ash collide.
CREATE UNIQUE INDEX players_nickname_key ON players (lower(nickname));
