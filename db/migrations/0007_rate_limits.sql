-- Requests per key (route bucket and IP) in the current hour, by the
-- database's clock. In the database because a serverless function keeps no
-- memory between invocations. Rows of past hours are purged by the next hit.
CREATE TABLE rate_limits (
  key text NOT NULL,
  window_start timestamptz NOT NULL,
  hits integer NOT NULL DEFAULT 1,
  PRIMARY KEY (key, window_start)
);
