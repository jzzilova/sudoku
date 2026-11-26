import { describe, expect, it } from "vitest";
import {
  currentStreak,
  enter,
  isSolved,
  newGame,
  noteDigits,
  parseStore,
  registerActivity,
  undo,
} from "../src/state";
import { generate, LEVELS, solvableBySingles, UNITS } from "../src/sudoku";

describe("generator", () => {
  it.each(LEVELS)("level %i gives a valid puzzle solvable by logic", (level) => {
    const { puzzle, solution } = generate(level);
    for (const unit of UNITS) expect(new Set(unit.map((i) => solution[i])).size).toBe(9);
    puzzle.forEach((v, i) => v && expect(v).toBe(solution[i]));
    expect(solvableBySingles(puzzle, true)).toBe(true);
  });

  it("gives fewer givens on harder levels", () => {
    const givens = LEVELS.map((l) => generate(l).puzzle.filter(Boolean).length);
    console.log("givens per level:", givens.join(", "));
    expect(givens).toEqual([...givens].sort((a, b) => b - a));
  });
});

describe("game", () => {
  it("writes, undoes and detects a solved board", () => {
    const game = newGame(1);
    const free = game.puzzle.indexOf(0);
    enter(game, free, 5, true);
    enter(game, free, 2, true);
    expect(noteDigits(game.notes[free]!)).toEqual([2, 5]);
    enter(game, free, 5, true);
    expect(noteDigits(game.notes[free]!)).toEqual([2]);
    enter(game, free, 7, false);
    expect(game.notes[free]).toBe(0);
    undo(game);
    expect(noteDigits(game.notes[free]!)).toEqual([2]);
    enter(game, free, 0, false);
    expect(game.notes[free]).toBe(0);
    game.puzzle.forEach((v, i) => v || enter(game, i, game.solution[i]!, false));
    expect(isSolved(game)).toBe(true);
  });

  it("does not change givens", () => {
    const game = newGame(1);
    expect(enter(game, game.puzzle.findIndex(Boolean), 1, false)).toBe(false);
  });
});

describe("streak", () => {
  it("grows on consecutive days, also across months and years", () => {
    let s = registerActivity({ length: 0, lastDay: null }, "2026-12-31");
    s = registerActivity(s, "2026-12-31");
    s = registerActivity(s, "2027-01-01");
    expect(s.length).toBe(2);
    expect(currentStreak(s, "2027-01-02")).toBe(2);
    expect(currentStreak(s, "2027-01-03")).toBe(0);
    expect(registerActivity(s, "2027-01-03").length).toBe(1);
  });
});

describe("storage", () => {
  it("survives damaged data", () => {
    expect(parseStore("{oops").solved[1]).toBe(0);
    const store = parseStore('{"solved":{"1":3,"2":-1},"games":{"1":{"puzzle":[]}}}');
    expect(store.solved).toEqual({ 1: 3, 2: 0, 3: 0, 4: 0, 5: 0 });
    expect(store.games).toEqual({});
  });
});
