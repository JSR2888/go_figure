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

Before committing a new set of digits, you can sanity-check it's solvable
by opening the browser console on the live site and running:

```js
GoFigure.isSolvable([7, 9, 7, 9])
```

This only confirms *a* solution exists with `+ - × ÷` and one `=` — it
won't tell you whether the puzzle is actually interesting, so still give
it a quick eyeball test.

## Local preview

No build step — just open `index.html` in a browser, or run a tiny local
server from this folder (e.g. `npx serve`) if you want it to behave
exactly like it will once deployed.
