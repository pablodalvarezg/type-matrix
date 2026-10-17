-- A Battler tournament: the draft so far, and the seed that draws every
-- offer, rival and battle. The offers, the bracket and its result are all
-- derived from these columns, never stored.
CREATE TABLE battler_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES players (id),
  difficulty text NOT NULL CHECK (difficulty IN ('easy', 'hard', 'nuzlocke')),
  -- Never leaves the server: with it, the offers to come can be worked out.
  seed uuid NOT NULL DEFAULT gen_random_uuid(),
  -- Species slugs, in pick order until the team is ordered.
  picks text[] NOT NULL DEFAULT '{}',
  rerolls smallint NOT NULL DEFAULT 0,
  -- Set once the team's order is final: the bracket is played from then on.
  ordered boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
