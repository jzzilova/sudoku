import "@fontsource/atkinson-hyperlegible-next/400.css";
import "@fontsource/atkinson-hyperlegible-next/700.css";
import "./style.css";
import {
  conflicts,
  currentStreak,
  dayKey,
  enter,
  isFilled,
  isSolved,
  loadStore,
  newGame,
  noteDigits,
  registerActivity,
  saveStore,
  undo,
  type Game,
} from "./state";
import { icon, type IconName } from "./icons";
import { LEVELS, type Level } from "./sudoku";

const app = document.querySelector<HTMLElement>("#app")!;
const store = loadStore();

let level: Level | null = null;
let selected = 0;
let noteMode = false;

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = "",
  text = "",
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = text;
  return node;
}

function button(className: string, text: string, onClick: () => void): HTMLButtonElement {
  const node = el("button", className, text);
  node.type = "button";
  node.addEventListener("click", onClick);
  return node;
}

function iconButton(name: IconName, label: string, onClick: () => void): HTMLButtonElement {
  const node = button(name, "", onClick);
  node.append(icon(name));
  node.setAttribute("aria-label", label);
  node.title = label;
  return node;
}

/** The first action is also what the Android back gesture / Escape does. */
function showDialog(title: string, text: string, actions: [string, () => void][]): void {
  const dialog = el("dialog", "dialog");
  dialog.append(el("h2", "", title), el("p", "", text));
  const run = (action: () => void) => {
    dialog.close();
    dialog.remove();
    action();
  };
  for (const [label, action] of actions) {
    dialog.append(button("big", label, () => run(action)));
  }
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    run(actions[0]![1]);
  });
  app.append(dialog);
  dialog.showModal();
}

function showHome(): void {
  level = null;
  // not "home": that class belongs to the home icon button
  const home = el("div", "menu");
  const streak = currentStreak(store.streak, dayKey(new Date()));
  home.append(
    el("h1", "", "Sudoku"),
    el("p", "", `Dní v řadě: ${streak}`),
    el("p", "", "Vyberte obtížnost"),
  );
  const list = el("div", "levels");
  for (const l of LEVELS) {
    const item = button("level", "", () => {
      history.pushState({ level: l }, "");
      openGame(l);
    });
    item.append(
      el("span", "level-number", String(l)),
      el("span", "", `vyřešeno: ${store.solved[l]}`),
    );
    list.append(item);
  }
  home.append(list);
  app.replaceChildren(home);
}

function currentGame(l: Level): Game {
  return (store.games[l] ??= newGame(l));
}

function firstFree(game: Game): number {
  const empty = game.values.indexOf(0);
  return empty >= 0 ? empty : game.puzzle.indexOf(0);
}

function openGame(l: Level): void {
  level = l;
  selected = firstFree(currentGame(l));
  noteMode = false;
  saveStore(store);
  renderGame();
}

function renderGame(): void {
  if (level === null) return;
  const game = currentGame(level);
  const bad = isFilled(game) && !isSolved(game) ? conflicts(game) : new Set<number>();

  const board = el("div", "board");
  game.values.forEach((value, i) => {
    const given = game.puzzle[i] !== 0;
    const cell = button("cell", value ? String(value) : "", () => {
      if (given) return;
      selected = i;
      renderGame();
    });
    cell.classList.add(given ? "given" : "entry");
    const noted = noteDigits(game.notes[i]!);
    if (noted.length) {
      // the fewer notes, the bigger they are drawn
      const size = noted.length <= 2 ? noted.length : noted.length <= 4 ? 4 : 9;
      const marks = el("span", `marks marks-${size}`);
      for (const d of noted) marks.append(el("span", "", String(d)));
      cell.append(marks);
    }
    cell.classList.toggle("selected", i === selected);
    cell.classList.toggle("conflict", bad.has(i));
    const row = Math.floor(i / 9) + 1;
    const col = (i % 9) + 1;
    const content = noted.length ? `poznámky ${noted.join(" ")}` : value || "prázdné";
    cell.setAttribute("aria-label", `Řádek ${row}, sloupec ${col}: ${content}`);
    board.append(cell);
  });

  const pad = el("div", noteMode ? "pad noting" : "pad");
  for (let d = 1; d <= 9; d++) pad.append(button("digit", String(d), () => write(d)));
  pad.append(button("erase", "Smazat", () => write(0)));

  const notes = iconButton("notes", "Poznámky", () => {
    noteMode = !noteMode;
    renderGame();
  });
  notes.setAttribute("aria-pressed", String(noteMode));

  const actions = el("div", "actions");
  actions.append(
    iconButton("home", "Domů", () => history.back()),
    iconButton("fresh", "Nové sudoku", confirmNewGame),
    iconButton("undo", "Zpět o tah", stepBack),
    notes,
  );

  const controls = el("div", "controls");
  controls.append(pad, actions);
  const screen = el("div", "game");
  screen.append(board, controls);
  app.replaceChildren(screen);
}

function markActivity(): void {
  store.streak = registerActivity(store.streak, dayKey(new Date()));
}

function write(digit: number): void {
  if (level === null) return;
  const game = currentGame(level);
  if (!enter(game, selected, digit, noteMode)) return;
  markActivity();

  if (isSolved(game)) {
    finish(level);
    return;
  }
  saveStore(store);
  renderGame();
  // only a real entry that completes the grid triggers the warning
  if (digit !== 0 && !noteMode && isFilled(game)) {
    showDialog("Někde je chyba", "Čísla, která se opakují, jsou žlutě podbarvená.", [
      ["Opravit", () => {}],
    ]);
  }
}

function finish(l: Level): void {
  store.solved[l]++;
  // the solved board stays visible behind the dialog, the new one is already saved
  renderGame();
  store.games[l] = newGame(l);
  saveStore(store);
  showDialog("Výborně!", `Vyřešeno. V úrovni ${l} už máte vyřešeno: ${store.solved[l]}`, [
    ["Další sudoku", () => openGame(l)],
    ["Domů", () => history.back()],
  ]);
}

function stepBack(): void {
  if (level === null) return;
  const cell = undo(currentGame(level));
  if (cell === null) return;
  selected = cell;
  markActivity();
  saveStore(store);
  renderGame();
}

function confirmNewGame(): void {
  const l = level;
  if (l === null) return;
  showDialog("Nové sudoku?", "Rozehrané sudoku se zahodí.", [
    ["Ne, hrát dál", () => {}],
    [
      "Ano, nové",
      () => {
        delete store.games[l];
        openGame(l);
      },
    ],
  ]);
}

// physical keyboard, if one is attached
document.addEventListener("keydown", (event) => {
  if (level === null || app.querySelector("dialog")) return;
  const arrows: Record<string, number> = {
    ArrowLeft: -1,
    ArrowRight: 1,
    ArrowUp: -9,
    ArrowDown: 9,
  };
  const step = arrows[event.key];
  if (/^[1-9]$/.test(event.key)) write(Number(event.key));
  else if (event.key === "Backspace" || event.key === "Delete") write(0);
  else if (step !== undefined) {
    const game = currentGame(level);
    for (let i = selected + step; i >= 0 && i < 81; i += step) {
      if (game.puzzle[i] === 0) {
        selected = i;
        renderGame();
        break;
      }
    }
    event.preventDefault();
  }
});

// the Android back button returns to the level selection
window.addEventListener("popstate", showHome);

showHome();
