export type Level = 1 | 2 | 3 | 4 | 5;
export const LEVELS: readonly Level[] = [1, 2, 3, 4, 5];

export interface Puzzle {
  /** 81 numbers, 0 = empty */
  puzzle: number[];
  solution: number[];
}

type Random = () => number;

const ALL = 0x3fe; // bits 1..9

const range9 = [0, 1, 2, 3, 4, 5, 6, 7, 8];
export const UNITS: readonly number[][] = [
  ...range9.map((r) => range9.map((c) => r * 9 + c)),
  ...range9.map((c) => range9.map((r) => r * 9 + c)),
  ...range9.map((b) =>
    range9.map((i) => (Math.floor(b / 3) * 3 + Math.floor(i / 3)) * 9 + (b % 3) * 3 + (i % 3)),
  ),
];

export const PEERS: readonly number[][] = Array.from({ length: 81 }, (_, cell) => [
  ...new Set(UNITS.filter((u) => u.includes(cell)).flat().filter((i) => i !== cell)),
]);

// Every level is solvable by logic alone (no guessing). Levels differ in the
// number of givens and in whether "hidden singles" are needed.
const SETTINGS: Record<Level, { givens: number; hidden: boolean; attempts: number }> = {
  1: { givens: 46, hidden: false, attempts: 1 },
  2: { givens: 38, hidden: false, attempts: 1 },
  3: { givens: 34, hidden: true, attempts: 1 },
  4: { givens: 29, hidden: true, attempts: 3 },
  5: { givens: 22, hidden: true, attempts: 12 },
};

function candidates(grid: number[], cell: number): number {
  let mask = ALL;
  for (const peer of PEERS[cell]!) mask &= ~(1 << grid[peer]!);
  return mask;
}

const isSingleBit = (mask: number) => mask !== 0 && (mask & (mask - 1)) === 0;
const digitOf = (mask: number) => 31 - Math.clz32(mask);

/** Fills cells using singles only. True when the whole grid gets solved. */
export function solvableBySingles(puzzle: number[], useHidden: boolean): boolean {
  const grid = [...puzzle];
  let progress = true;
  while (progress) {
    progress = false;
    for (let cell = 0; cell < 81; cell++) {
      if (grid[cell] !== 0) continue;
      const mask = candidates(grid, cell);
      if (isSingleBit(mask)) {
        grid[cell] = digitOf(mask);
        progress = true;
      }
    }
    if (progress || !useHidden) continue;
    for (const unit of UNITS) {
      for (let digit = 1; digit <= 9; digit++) {
        if (unit.some((i) => grid[i] === digit)) continue;
        const spots = unit.filter((i) => grid[i] === 0 && candidates(grid, i) & (1 << digit));
        if (spots.length === 1) {
          grid[spots[0]!] = digit;
          progress = true;
        }
      }
    }
  }
  return grid.every((v) => v !== 0);
}

function shuffle<T>(items: T[], random: Random): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [items[i], items[j]] = [items[j]!, items[i]!];
  }
  return items;
}

function fullGrid(random: Random): number[] {
  const grid = new Array<number>(81).fill(0);
  const fill = (cell: number): boolean => {
    if (cell === 81) return true;
    const mask = candidates(grid, cell);
    for (const digit of shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], random)) {
      if (!(mask & (1 << digit))) continue;
      grid[cell] = digit;
      if (fill(cell + 1)) return true;
    }
    grid[cell] = 0;
    return false;
  };
  fill(0);
  return grid;
}

export function generate(level: Level, random: Random = Math.random): Puzzle {
  const { givens, hidden, attempts } = SETTINGS[level];
  let best: Puzzle & { count: number } = { puzzle: [], solution: [], count: 82 };

  for (let attempt = 0; attempt < attempts && best.count > givens; attempt++) {
    const solution = fullGrid(random);
    const puzzle = [...solution];
    let count = 81;
    for (const cell of shuffle(Array.from({ length: 81 }, (_, i) => i), random)) {
      if (count <= givens) break;
      puzzle[cell] = 0;
      if (solvableBySingles(puzzle, hidden)) count--;
      else puzzle[cell] = solution[cell]!;
    }
    if (count < best.count) best = { puzzle, solution, count };
  }
  return { puzzle: best.puzzle, solution: best.solution };
}
