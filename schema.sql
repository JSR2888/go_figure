-- Go Figure — backend schema
-- Run this in the Supabase SQL editor (Project → SQL Editor → New query).
--
-- One row per (player, puzzle day). "player" is an anonymous client id
-- generated in the browser and stored in localStorage — no login required
-- for this v1. When real accounts arrive later, add a nullable user_id
-- column and start populating it for logged-in players without breaking
-- anything already here.

create table if not exists solves (
  id                bigint generated always as identity primary key,
  puzzle_date       date not null,              -- UTC date key, e.g. '2026-07-09'
  client_id         uuid not null,               -- anonymous id from localStorage
  time_ms           integer not null check (time_ms > 0),
  solutions_count   integer not null default 1 check (solutions_count >= 1),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  -- one row per player per puzzle day — solutions_count/time_ms get
  -- updated in place as they keep exploring, rather than inserting duplicates
  unique (puzzle_date, client_id)
);

create index if not exists solves_puzzle_date_idx on solves (puzzle_date);
create index if not exists solves_puzzle_date_time_idx on solves (puzzle_date, time_ms);

-- Row Level Security: locked down by default. The Netlify Function writes
-- using the service-role key, which bypasses RLS entirely — so this table
-- stays inaccessible to the public anon key / browser clients until you
-- deliberately open something up (e.g. a read-only policy for a public
-- leaderboard view later).
alter table solves enable row level security;

-- Example for later, once you want a public leaderboard readable directly
-- from the browser (uncomment when ready):
-- create policy "Public read access to solves"
--   on solves for select
--   using (true);


-- ---------------------------------------------------------------------
-- Handy queries once there's data:
-- ---------------------------------------------------------------------

-- Fastest times for a given day:
-- select client_id, time_ms, solutions_count
-- from solves
-- where puzzle_date = '2026-07-09'
-- order by time_ms asc
-- limit 20;

-- Note: per-player rank/percentile ("you were 3rd fastest of 8" / "top 23%
-- by speed") is computed live in netlify/functions/log-solve.js using two
-- simple COUNT queries, and returned straight to the browser after every
-- solve — no separate query needed here. This section is just for you to
-- explore the data manually in the SQL editor if you want to.

-- Top 20 by solutions found, for a given day:
-- select client_id, solutions_count, time_ms
-- from solves
-- where puzzle_date = '2026-07-09'
-- order by solutions_count desc
-- limit 20;


-- =========================================================================
-- Daily puzzles — add new rows here (via the Table Editor, no code, no
-- redeploy) to publish tomorrow's puzzle, or a whole batch of future ones
-- at once. The game checks this table first every time it loads, and only
-- falls back to the puzzles.js file shipped with the site if this table
-- has no row for today (Supabase briefly unreachable, or you just haven't
-- added today's yet). puzzles.js is now a resilience backup, not the
-- primary place you manage puzzles day-to-day.
-- =========================================================================

create table if not exists puzzles (
  puzzle_date date primary key,   -- UTC date key, e.g. '2026-07-09'
  digits jsonb not null,          -- e.g. [1, 2, 3, 4] — any length, duplicates fine
  created_at timestamptz not null default now()
);

alter table puzzles enable row level security;

-- Unlike `solves`, puzzle digits aren't sensitive — every player needs to
-- see them to play — so this table gets a public READ policy. Writing
-- still requires the Supabase dashboard (Table Editor) or the service-role
-- key; the public anon key used by the browser can only ever SELECT here.
create policy "Public read access to puzzles"
  on puzzles for select
  using (true);

-- IMPORTANT: the RLS policy above only takes effect once the underlying
-- Postgres role actually has base privileges on the table — RLS is
-- checked AFTER that, never instead of it. Without this grant, the anon
-- key gets a flat "permission denied for table puzzles" (Postgres error
-- 42501), not a policy-related error, even though the policy exists.
grant select on table public.puzzles to anon;

-- ---------------------------------------------------------------------
-- Adding a puzzle: Table Editor → puzzles → Insert row
--   puzzle_date: 2026-07-15
--   digits:      [2, 3, 5, 8]
-- That's it — live on the site within seconds, no deploy needed.
--
-- Adding many at once: click "Insert" → "Insert rows via SQL" (or just
-- use the SQL Editor directly) and run something like:
--
-- insert into puzzles (puzzle_date, digits) values
--   ('2026-07-16', '[1, 4, 5, 9]'),
--   ('2026-07-17', '[2, 2, 3, 7]'),
--   ('2026-07-18', '[1, 3, 4, 6]')
-- on conflict (puzzle_date) do update set digits = excluded.digits;
-- ---------------------------------------------------------------------
