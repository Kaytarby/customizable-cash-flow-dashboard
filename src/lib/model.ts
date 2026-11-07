import { Article, ROOTS, articleValue } from "./data";
import { Settings } from "./settings";
import { ColNode, buildTree, layoutColumns, Col, HeaderCell } from "./columns";
import { LEVEL_ORDER, isoToDay, TOTAL_DAYS } from "./dates";

export interface RowView {
  id: string;
  art: Article;
  name: string;
  depth: number;
  kind: "group" | "leaf" | "calc" | "rest";
  calc?: "open" | "net" | "close";
  expandable: boolean;
  expanded: boolean;
  hiddenKids: number;
  parentId?: string;
  restVisible?: Article[];
  searchHit?: boolean;
}

export function buildRows(st: Settings, query: string): RowView[] {
  const collapsed = new Set(st.collapsedRows);
  const hidden = new Set(st.hiddenRows);
  const q = query.trim().toLowerCase();
  const self = new Map<string, boolean>();
  const desc = new Map<string, boolean>();
  if (q) {
    const mark = (a: Article): boolean => {
      const s = a.name.toLowerCase().includes(q);
      let d = false;
      a.children?.forEach((c) => {
        if (mark(c)) d = true;
      });
      self.set(a.id, s);
      desc.set(a.id, d);
      return s || d;
    };
    ROOTS.forEach(mark);
  }
  const out: RowView[] = [];
  const visit = (a: Article, depth: number) => {
    if (q) {
      if (!self.get(a.id) && !desc.get(a.id)) return;
    } else if (hidden.has(a.id)) return;
    const isGroup = a.kind === "group";
    const expanded = isGroup && (q ? !!desc.get(a.id) : !collapsed.has(a.id));
    const hiddenKids = isGroup ? a.children!.filter((c) => hidden.has(c.id)).length : 0;
    out.push({
      id: a.id, art: a, name: a.name, depth, kind: a.kind, calc: a.calc,
      expandable: isGroup, expanded, hiddenKids, parentId: a.parentId,
      searchHit: q ? !!self.get(a.id) : false,
    });
    if (expanded) {
      a.children!.forEach((c) => visit(c, depth + 1));
      if (!q && st.restRow && hiddenKids > 0) {
        out.push({
          id: a.id + "::rest", art: a, name: `Скрытые статьи (${hiddenKids})`, depth: depth + 1,
          kind: "rest", expandable: false, expanded: false, hiddenKids: 0, parentId: a.id,
          restVisible: a.children!.filter((c) => !hidden.has(c.id)),
        });
      }
    }
  };
  ROOTS.forEach((a) => visit(a, 0));
  return out;
}

export interface Model {
  rows: RowView[];
  cols: Col[];
  header: HeaderCell[][];
  headerRows: number;
  values: (number | null)[][];
  rangeS: number;
  rangeE: number;
  heatMax: number[][]; // [row][levelOrder]
}

export function clampRange(st: Settings) {
  let s = isoToDay(st.from);
  let e = isoToDay(st.to);
  if (Number.isNaN(s)) s = 0;
  if (Number.isNaN(e)) e = TOTAL_DAYS - 1;
  s = Math.max(0, Math.min(TOTAL_DAYS - 1, s));
  e = Math.max(0, Math.min(TOTAL_DAYS - 1, e));
  if (e < s) [s, e] = [e, s];
  return { s, e };
}

export function buildModel(st: Settings, query: string): Model {
  const { s, e } = clampRange(st);
  const tree: ColNode[] = buildTree(st.levels, s, e);
  const isExpanded = (n: ColNode) => {
    const o = st.colOverrides[n.key];
    if (o !== undefined) return o;
    if (n.level === "total") return false;
    return LEVEL_ORDER[n.level] < LEVEL_ORDER[st.detail];
  };
  const grand: ColNode | null = st.grandTotal
    ? { key: "grand", level: "total", s, e, label: "Итого", title: "Итого за выбранный период" }
    : null;
  const { cells, cols, rows: headerRows } = layoutColumns(tree, isExpanded, st.subtotal, grand);

  let rows = buildRows(st, query);
  const calcVals = (r: RowView) => cols.map((c) => articleValue(r.art, c.node.s, c.node.e, s, st.mode));
  const restVals = (r: RowView) =>
    cols.map((c) => {
      if (st.mode === "pct") {
        const total = articleValue(r.art, c.node.s, c.node.e, s, st.mode) ?? 0;
        return total - r.restVisible!.reduce((acc, a) => acc + (articleValue(a, c.node.s, c.node.e, s, st.mode) ?? 0), 0);
      }
      const total = articleValue(r.art, c.node.s, c.node.e, s, st.mode) ?? 0;
      return total - r.restVisible!.reduce((acc, a) => acc + (articleValue(a, c.node.s, c.node.e, s, st.mode) ?? 0), 0);
    });
  let values = rows.map((r) => (r.kind === "rest" ? restVals(r) : calcVals(r)));

  if (st.hideEmpty) {
    const eps = st.mode === "pct" ? 0.005 : 0.5;
    const keep = rows.map((r, i) => r.kind === "calc" || values[i].some((v) => v !== null && Math.abs(v) >= eps));
    rows = rows.filter((_, i) => keep[i]);
    values = values.filter((_, i) => keep[i]);
  }

  const heatMax = values.map((row) => {
    const m = [0, 0, 0, 0, 0, 0];
    row.forEach((v, i) => {
      const c = cols[i];
      if (v === null || c.kind !== "leaf") return;
      const lv = LEVEL_ORDER[c.node.level as keyof typeof LEVEL_ORDER];
      if (Math.abs(v) > m[lv]) m[lv] = Math.abs(v);
    });
    return m;
  });

  return { rows, cols, header: cells, headerRows, values, rangeS: s, rangeE: e, heatMax };
}
