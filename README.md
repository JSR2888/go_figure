# Go Figure

A daily arithmetic puzzle. Build a true equation using every number tile
you're given, then check it.

## Files

- `index.html` — page structure
- `style.css` — all visual styling
- `script.js` — game logic (tiles, keyboard input, equation checking, tutorial, backend logging)
- `puzzles.js` — **fallback puzzle source** — used only if Supabase is unreachable or missing a date (see below)
- `netlify/functions/log-solve.js` — serverless function that logs solve times/counts to Supabase
- `schema.sql` — the Supabase database schema (run once, in Supabase's SQL editor)
- `netlify.toml` — tells Netlify where the functions live
- `package.json` — declares the one dependency the function needs (`@supabase/supabase-js`)

## Adding a new day's puzzle (no redeploy needed)

Puzzles now live primarily in Supabase, not in a file you have to edit and
push. Open Supabase → **Table Editor → puzzles → Insert row**:

| puzzle_date | digits |
|---|---|
| `2026-07-15` | `[2, 3, 5, 8]` |

That's it — live on the site within seconds. Any number of digits works,
duplicates are fine, and dates are UTC (`YYYY-MM-DD`) so the puzzle changes
at the same moment for everyone regardless of time zone.

**Adding a batch of future puzzles at once** — use the SQL Editor instead:

```sql
insert into puzzles (puzzle_date, digits) values
  ('2026-07-16', '[1, 4, 5, 9]'),
  ('2026-07-17', '[2, 2, 3, 7]'),
  ('2026-07-18', '[1, 3, 4, 6]')
on conflict (puzzle_date) do update set digits = excluded.digits;
```

**One-time setup**: `script.js` needs your Supabase project's URL and
*anon* key (Project Settings → API — the "anon public" one, not the secret
service-role key) filled in near the top of the file, where it currently
says `SUPABASE_URL` / `SUPABASE_ANON_KEY` = `'YOUR_..._HERE'`. The anon key
is designed to be public and safe to ship in client-side code — it can
only ever do what the Row Level Security policies in `schema.sql` allow,
which for `puzzles` is read-only.

### puzzles.js — the fallback, not the primary source anymore

If Supabase is briefly unreachable, or you simply haven't added today's
puzzle yet, the game falls back to whatever's in `PUZZLE_BANK` inside
`puzzles.js`:

```js
const PUZZLE_BANK = {
  '2026-07-08': [1, 2, 3, 4],
  '2026-07-09': [2, 3, 5, 8],
};
```

You don't need to keep this in perfect sync day-to-day — it's a safety
net, not the thing you edit for every puzzle. Worth periodically copying
recent Supabase entries back into it though, so the game still has a
reasonable fallback if Supabase ever has a real outage.

## Backend setup (solve-time tracking)

Every win (and every extra solution found while exploring) gets quietly
logged to a small Postgres database via Supabase, through a Netlify
Function that keeps the database credentials off the browser entirely.
Nothing in the game *requires* this to work — if it's not set up yet,
`fetch` calls just fail silently and gameplay is unaffected.

**One-time setup:**

1. Create a free account at [supabase.com](https://supabase.com) and start a new project.
2. Open **SQL Editor → New query**, paste in the contents of `schema.sql` from this repo, and run it. That creates the `solves` table.
3. Go to **Project Settings → API** and copy two values: the **Project URL** and the **`service_role` secret key** (not the `anon` key — that one's meant to be public, this one isn't).
4. In Netlify: **Site configuration → Environment variables**, add:
   - `SUPABASE_DATABASE_URL` = the Project URL from step 3 (deliberately **not** named `SUPABASE_URL` — if you ever connect the Supabase-Netlify extension, it auto-injects its own `SUPABASE_URL` with a `/rest/v1/` suffix that conflicts with what `@supabase/supabase-js` expects, and silently breaks everything. A different name sidesteps that collision entirely.)
   - `SUPABASE_SERVICE_ROLE_KEY` = the service_role key from step 3
5. Push this repo (including `netlify/functions/log-solve.js`, `netlify.toml`, and `package.json`) to GitHub as usual — Netlify picks up the function automatically and installs `@supabase/supabase-js` from `package.json` during deploy.

That's it — no code changes needed. `script.js` already calls
`/.netlify/functions/log-solve` after every win and every new solution
found.

**What's stored:** for each player (an anonymous random id generated in
their browser, not tied to any real identity) and each puzzle day: their
fastest solve time and how many distinct solutions they found. No names,
emails, or anything else.

**What this sets up for later:**
- *Leaderboards / "you were faster than X%"* — `schema.sql` already has an
  example query using Postgres's `percent_rank()` window function, ready
  to wire into a UI whenever you want it.
- *Accounts* — add a nullable `user_id` column to `solves` and start
  populating it via Supabase Auth once logins exist, without breaking
  anything already collecting anonymously.
- *Premium payments* — a Stripe webhook becomes another small Netlify
  Function, writing subscription status into its own Supabase table;
  Postgres Row Level Security can then gate premium features (like a
  puzzle archive) directly at the database layer.

## Developer console commands

Open the browser console on the live (or local) site and use `GoFigure.*`
for anything you need while authoring puzzles or testing features:

| Command | What it does |
|---|---|
| `GoFigure.isSolvable([7, 9, 7, 9])` | Checks whether *a* true equation exists for a candidate digit set, using `+ - × ÷` and one `=`. Only confirms solvability — not whether the puzzle is actually *interesting* — so still give new puzzles a quick eyeball test before committing them. |
| `GoFigure.getStats()` | Returns the current player's saved stats object (games won, best time, streaks, unlocked achievement ids, recent solve times). |
| `GoFigure.resetStats()` | Wipes saved stats back to defaults. Useful for testing streaks/achievements from a clean slate. |
| `GoFigure.resetTutorial()` | Marks the guided tutorial as "not yet seen," so it plays again on the next reload. |
| `GoFigure.resetTodaysSolutions()` | Clears just today's list of found solutions (reload to see it take effect), without touching stats or other days. |

All of this data lives in `localStorage`, scoped to one browser on one
device — there's no account system, so nothing here is visible to or
recoverable by anyone else.

## Local preview

No build step — just open `index.html` in a browser, or run a tiny local
server from this folder (e.g. `npx serve`) if you want it to behave
exactly like it will once deployed.
