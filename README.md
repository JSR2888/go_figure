# Go Figure

A daily arithmetic puzzle. Build a true equation using every number tile
you're given, then check it.

## Files

- `index.html` — page structure
- `style.css` — all visual styling
- `script.js` — game logic (tiles, keyboard input, equation checking, tutorial, backend logging)
- `puzzles.js` — **the file you'll edit daily** — today's digits live here
- `netlify/functions/log-solve.js` — serverless function that logs solve times/counts to Supabase
- `schema.sql` — the Supabase database schema (run once, in Supabase's SQL editor)
- `netlify.toml` — tells Netlify where the functions live
- `package.json` — declares the one dependency the function needs (`@supabase/supabase-js`)

## Adding a new day's puzzle

Open `puzzles.js` and add a line to `PUZZLE_BANK`, keyed by date in
`YYYY-MM-DD` (UTC):

```js
const PUZZLE_BANK = {
  '2026-07-08': [1, 2, 3, 4],
  '2026-07-09': [2, 3, 5, 8],
  '2026-07-11': [3, 4, 4, 7],   // <- new entry
};
```

Any number of digits is fine, and duplicates are allowed. Puzzles change
over at UTC midnight, so it's the same puzzle for everyone regardless of
time zone.

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
   - `SUPABASE_URL` = the Project URL from step 3
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
