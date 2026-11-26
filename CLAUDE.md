# Sudoku

Sudoku for a user with very low vision, played on an Android tablet. UI in Czech.
Vite + strict TypeScript, no framework, no backend.

## Deploy
- Public repo `jzzilova/sudoku`, live at https://jzzilova.github.io/sudoku/
- `npm run deploy` (only when asked) tests, builds and force-pushes `dist/` to
  `gh-pages`. Pushing `main` alone does not update the site.
- No GitHub Actions: the `gh` token lacks the `workflow` scope.

## Commands
- `npm run dev` (port 5180; `.claude/launch.json` in the parent folder, name `sudoku`)
- `npm test`, `npm run build`

## Structure
- `src/sudoku.ts` – generator; difficulty settings in `SETTINGS`
- `src/state.ts` – game moves, streak, localStorage (`sudoku-v1`)
- `src/main.ts` – screens and dialogs
- `src/style.css` – layout (portrait and landscape)

## Fixed requirements
- Board and digits as large as possible.
- Black on white only, never a dark theme.
- Several notes per cell, green, drawn as big as their count allows (answers are blue).
- Board digits are the largest on screen.
- Home, new game, undo and notes are icon buttons (`src/icons.ts`).
- Editable cell has a red frame.
- Solved puzzle leads to a new one of the same level.
- Track solved count per level and the streak of days with a solve or any move.

## Design decisions
- All levels are solvable with naked/hidden singles (no guessing).
- One game in progress is saved per level.
- A full but wrong grid highlights repeated digits in yellow.
- `public/manifest.webmanifest` gives fullscreen when added to the home screen.
- No service worker: the app does not work offline yet.
