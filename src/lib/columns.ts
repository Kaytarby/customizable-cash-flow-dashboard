import {
  Level, LEVEL_ORDER, MONTHS_FULL, MONTHS_SHORT, WEEKDAYS_SHORT,
  segments, dayToDate, dow, isoWeek, fmtShort, fmtFull,
} from "./dates";
import { Subtotal } from "./settings";

export interface ColNode {
  key: string;
  scenario?: import("./dates").Scenario;
  delta?: "plan" | "budget";
  pctExec?: boolean;
  pctDev?: boolean;
  level: Level | "total";
  s: number;
  e: number;
  label: string;
  sub?: string;
  title: string;
  weekend?: boolean;
  split?: boolean; // неделя разрезана границей месяца/квартала/года
  children?: ColNode[];
}

function labelFor(level: Level, s: number, e: number, hasYear: boolean, hasMonth: boolean, hasQuarter: boolean) {
  const d = dayToDate(s);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  switch (level) {
    case "year":
      return { label: String(y), title: `${y} год` };
    case "quarter": {
      const q = Math.floor(m / 3) + 1;
      return {
        label: hasYear ? `${q} кв.` : `${q} кв. ${y}`,
        title: `${q} квартал ${y}`,
      };
    }
    case "month":
      return {
        label: hasYear ? MONTHS_FULL[m] : `${MONTHS_SHORT[m]} ${y}`,
        title: `${MONTHS_FULL[m]} ${y}`,
      };
    case "week": {
      const sameMonth = dayToDate(s).getUTCMonth() === dayToDate(e).getUTCMonth();
      const range = s === e ? fmtShort(s) : sameMonth ? `${String(dayToDate(s).getUTCDate()).padStart(2, "0")}–${fmtShort(e)}` : `${fmtShort(s)}–${fmtShort(e)}`;
      void hasMonth; void hasQuarter;
      return { label: `Нед ${isoWeek(s)}`, sub: range, title: `Неделя ${isoWeek(s)}: ${fmtFull(s)} – ${fmtFull(e)}` };
    }
    default: {
      const wd = WEEKDAYS_SHORT[dow(s)];
      const dom = d.getUTCDate();
      return {
        label: hasMonth ? String(dom) : fmtShort(s),
        sub: wd,
        title: `${fmtFull(s)}, ${wd}`,
      };
    }
  }
}

export function buildTree(levels: Level[], s: number, e: number): ColNode[] {
  const ls = [...levels].sort((a, b) => LEVEL_ORDER[a] - LEVEL_ORDER[b]);
  const hasYear = ls.includes("year");
  const hasMonth = ls.includes("month");
  const hasQuarter = ls.includes("quarter");

  const rec = (idx: number, ps: number, pe: number): ColNode[] => {
    const level = ls[idx];
    return segments(level, ps, pe).map(([a, b]) => {
      const l = labelFor(level, a, b, hasYear, hasMonth, hasQuarter);
      // неделя «разрезана», если она не равна полной неделе пн–вс
      const split = level === "week" && (dow(a) !== 0 || dow(b) !== 6);
      const node: ColNode = {
        key: `${level}:${a}-${b}`,
        level,
        s: a,
        e: b,
        label: l.label,
        sub: l.sub,
        title: l.title + (split ? " (неделя разделена границей периода)" : ""),
        weekend: level === "day" ? dow(a) >= 5 : false,
        split,
      };
      if (idx + 1 < ls.length) node.children = rec(idx + 1, a, b);
      return node;
    });
  };
  return ls.length ? rec(0, s, e) : [];
}

export interface HeaderCell {
  key: string;
  node: ColNode;
  row: number;
  colspan: number;
  rowspan: number;
  kind: "group" | "leaf" | "sub" | "total";
  expanded?: boolean;
  expandable?: boolean;
}
export interface Col {
  key: string;
  node: ColNode;
  kind: "leaf" | "sub" | "total";
}

export function layoutColumns(
  tree: ColNode[],
  isExpanded: (n: ColNode) => boolean,
  subtotal: Subtotal,
  grand: ColNode | null
) {
  const cells: HeaderCell[][] = [[], [], [], [], [], [], []];
  const cols: Col[] = [];
  let maxRow = 0;

  const walk = (node: ColNode, r: number): number => {
    maxRow = Math.max(maxRow, r);
    const hasKids = !!node.children?.length;
    if (!hasKids || !isExpanded(node)) {
      cells[r].push({ key: node.key, node, row: r, colspan: 1, rowspan: 1, kind: "leaf", expandable: hasKids, expanded: false });
      cols.push({ key: node.key, node, kind: "leaf" });
      return 1;
    }
    const head: HeaderCell = { key: node.key, node, row: r, colspan: 0, rowspan: 1, kind: "group", expandable: true, expanded: true };
    cells[r].push(head);
    let span = 0;
    const pushSub = () => {
      maxRow = Math.max(maxRow, r + 1);
      cells[r + 1].push({ key: node.key + "#sub", node, row: r + 1, colspan: 1, rowspan: 1, kind: "sub" });
      cols.push({ key: node.key + "#sub", node, kind: "sub" });
      span += 1;
    };
    if (subtotal === "left") pushSub();
    for (const c of node.children!) span += walk(c, r + 1);
    if (subtotal === "right") pushSub();
    head.colspan = span;
    return span;
  };

  for (const n of tree) walk(n, 0);
  const rows = maxRow + 1;
  if (grand) {
    cells[0].push({ key: "grand", node: grand, row: 0, colspan: 1, rowspan: 1, kind: "total" });
    cols.push({ key: "grand", node: grand, kind: "total" });
  }
  for (let r = 0; r < rows; r++)
    for (const c of cells[r]) if (c.kind !== "group") c.rowspan = rows - r;
  return { cells: cells.slice(0, rows), cols, rows };
}
