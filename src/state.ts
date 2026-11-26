import { generate, LEVELS, PEERS, type Level, type Puzzle } from "./sudoku";

export interface Move {
  cell: number;
  value: number;
  notes: number;
}

export interface Game extends Puzzle {
  /** 81 numbers, 0 = empty; givens are copied here too */
  values: number[];
  /** pencil notes per cell, bit d set = digit d noted */
  notes: number[];
  history: Move[];
}

export interface Streak {
  length: number;
  /** local date YYYY-MM-DD of the last day with activity */
  lastDay: string | null;
}

export interface Store {
  solved: Record<Level, number>;
  streak: Streak;
  games: Partial<Record<Level, Game>>;
}

const KEY = "sudoku-v1";

export function dayKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function previousDay(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return dayKey(new Date(y!, m! - 1, d! - 1));
}

export function registerActivity(streak: Streak, today: string): Streak {
  if (streak.lastDay === today) return streak;
  const continues = streak.lastDay === previousDay(today);
  return { length: continues ? streak.length + 1 : 1, lastDay: today };
}

/** The streak stays visible until a whole day is missed. */
export function currentStreak(streak: Streak, today: string): number {
  return streak.lastDay === today || streak.lastDay === previousDay(today) ? streak.length : 0;
}

export function newGame(level: Level): Game {
  const { puzzle, solution } = generate(level);
  return {
    puzzle,
    solution,
    values: [...puzzle],
    notes: new Array<number>(81).fill(0),
    history: [],
  };
}

export const noteDigits = (mask: number) =>
  [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((d) => mask & (1 << d));

/**
 * Writes the answer, or toggles one note when asNote is set. Writing the same
 * answer again clears it; digit 0 clears the whole cell.
 */
export function enter(game: Game, cell: number, digit: number, asNote: boolean): boolean {
  if (game.puzzle[cell] !== 0) return false;
  const value = game.values[cell]!;
  const notes = game.notes[cell]!;
  let nextValue = 0;
  let nextNotes = 0;
  if (digit !== 0 && asNote) nextNotes = notes ^ (1 << digit);
  else if (digit !== value) nextValue = digit;
  if (nextValue === value && nextNotes === notes) return false;
  game.history.push({ cell, value, notes });
  game.values[cell] = nextValue;
  game.notes[cell] = nextNotes;
  return true;
}

export function undo(game: Game): number | null {
  const move = game.history.pop();
  if (!move) return null;
  game.values[move.cell] = move.value;
  game.notes[move.cell] = move.notes;
  return move.cell;
}

export const isFilled = (game: Game) => game.values.every((v) => v !== 0);

export const isSolved = (game: Game) => game.values.every((v, i) => v === game.solution[i]);

/** Cells whose digit repeats in a row, column or box. */
export function conflicts(game: Game): Set<number> {
  const result = new Set<number>();
  game.values.forEach((v, i) => {
    if (v !== 0 && PEERS[i]!.some((p) => game.values[p] === v)) result.add(i);
  });
  return result;
}

const isRecord = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null;

const isCount = (x: unknown): x is number => Number.isInteger(x) && (x as number) >= 0;

const isMask = (x: unknown): x is number => isCount(x) && x <= 0x3fe;

const isGrid = (x: unknown): x is number[] =>
  Array.isArray(x) && x.length === 81 && x.every((v) => isCount(v) && v <= 9);

function isGame(x: unknown): x is Game {
  return (
    isRecord(x) &&
    isGrid(x.puzzle) &&
    isGrid(x.solution) &&
    isGrid(x.values) &&
    Array.isArray(x.notes) &&
    x.notes.length === 81 &&
    x.notes.every(isMask) &&
    Array.isArray(x.history) &&
    x.history.every(
      (m) =>
        isRecord(m) &&
        isCount(m.cell) &&
        m.cell < 81 &&
        isCount(m.value) &&
        isMask(m.notes),
    )
  );
}

/** Reads stored data; anything damaged falls back to defaults field by field. */
export function parseStore(raw: string | null): Store {
  const store: Store = {
    solved: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    streak: { length: 0, lastDay: null },
    games: {},
  };
  let data: unknown;
  try {
    data = JSON.parse(raw ?? "null");
  } catch {
    return store;
  }
  if (!isRecord(data)) return store;
  const { solved, streak, games } = data;
  for (const level of LEVELS) {
    const count = isRecord(solved) ? solved[level] : undefined;
    if (isCount(count)) store.solved[level] = count;
    const game = isRecord(games) ? games[level] : undefined;
    if (isGame(game)) store.games[level] = game;
  }
  if (isRecord(streak) && isCount(streak.length) && typeof streak.lastDay === "string") {
    store.streak = { length: streak.length, lastDay: streak.lastDay };
  }
  return store;
}

export const loadStore = () => parseStore(localStorage.getItem(KEY));

export const saveStore = (store: Store) => localStorage.setItem(KEY, JSON.stringify(store));
