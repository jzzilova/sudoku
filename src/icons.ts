const PATHS = {
  home: "M3 11 L12 3 L21 11 M5.5 9.5 V21 H10 V15 H14 V21 H18.5 V9.5",
  fresh: "M20 12 A8 8 0 1 1 17.5 6.2 M18 2 V6.8 H13.2",
  undo: "M9 4 L4 9 L9 14 M4 9 H14 A6 6 0 0 1 14 21 H9",
  notes: "M4 20 L5 15.5 L16 4.5 L19.5 8 L8.5 19 Z M13.5 7 L17 10.5",
};

export type IconName = keyof typeof PATHS;

export function icon(name: IconName): SVGSVGElement {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  const attributes = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    "stroke-width": "2.8",
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
    "aria-hidden": "true",
  };
  for (const [key, value] of Object.entries(attributes)) svg.setAttribute(key, value);
  const path = document.createElementNS(ns, "path");
  path.setAttribute("d", PATHS[name]);
  svg.append(path);
  return svg;
}
