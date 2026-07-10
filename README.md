# Go Figure

A daily arithmetic puzzle. Build a true equation using every number tile
you're given, then check it.

## Files

- `index.html` — page structure
- `style.css` — all visual styling
- `script.js` — game logic (tiles, keyboard input, equation checking)
- `puzzles.js` — **the file you'll edit daily** — today's digits live here

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
