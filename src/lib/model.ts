import { Article, ROOTS, articleValue, RollingBounds } from "./data";
import { Settings } from "./settings";
import { ColNode, buildTree, layoutColumns, Col, HeaderCell } from "./columns";
import { LEVEL_ORDER, isoToDay, TOTAL_DAYS, rollingBounds, SCENARIO_LABELS, Scenario } from "./dates";

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
  let tree: ColNode[];
  const rb = rollingBounds(st.factCutoff, st.planEnd);
  const bounds: RollingBounds = { factEnd: rb.factEnd, planEnd: rb.planEnd };
  if (st.scenario === "rolling") {
    tree = [];
    for (const [start, end, scenario] of [[s, Math.min(e, rb.factEnd), "fact"], [Math.max(s, rb.factEnd + 1), Math.min(e, rb.planEnd), "plan"], [Math.max(s, rb.planEnd + 1), e, "budget"]] as [number, number, Scenario][]) {
      if (start > end) continue;
      const nodes = buildTree(scenario === "budget" ? ["month"] : ["month", "week", "day"], start, end);
      const tag = (n: ColNode) => {
        n.key = `${scenario}:${n.key}`;
        n.scenario = scenario;
        n.title += ` · ${SCENARIO_LABELS[scenario]}`;
        if (n.level === "month" && scenario !== "budget") n.label += ` · ${SCENARIO_LABELS[scenario]}`;
        n.children?.forEach(tag);
      };
      nodes.forEach(tag); tree.push(...nodes);
    }
  } else tree = buildTree(st.scenario === "budget" || st.scenario === "compare" ? ["month"] : st.levels, s, e);
  const isExpanded = (n: ColNode) => {
    const o = st.colOverrides[n.key];
    if (o !== undefined) return o;
    if (n.level === "total") return false;
    return LEVEL_ORDER[n.level] < LEVEL_ORDER[st.detail];
  };
  const grand: ColNode | null = st.grandTotal
    ? { key: "grand", level: "total", s, e, label: "Итого", title: "Итого за выбранный период" }
    : null;
  let { cells, cols, rows: headerRows } = layoutColumns(tree, isExpanded, st.subtotal, grand);
  if (st.scenario === "compare") {
    const metrics = [
      { label: "Бюджет", scenario: "budget" as Scenario },
      { label: "Ролинг", scenario: "rolling" as Scenario },
      { label: "Δ Р−Б", scenario: "rolling" as Scenario, delta: "budget" as "budget" },
      { label: "% вып.", scenario: "rolling" as Scenario, pctExec: true as const },
    ];
    const base = cols;
    cells = [[], []]; cols = []; headerRows = 2;
    for (const col of base) {
      cells[0].push({ key: col.key, node: col.node, row: 0, colspan: metrics.length, rowspan: 1, kind: "leaf" });
      for (const metric of metrics) {
        const node = { ...col.node, key: `${col.key}:${metric.label}`, children: undefined, label: metric.label, sub: undefined, title: `${col.node.title} · ${metric.label}`, scenario: metric.scenario, delta: metric.delta, pctExec: 'pctExec' in metric ? metric.pctExec : undefined };
        cols.push({ key: node.key, node, kind: col.kind });
        cells[1].push({ key: node.key, node, row: 1, colspan: 1, rowspan: 1, kind: "leaf" });
      }
    }
  }

  let rows = buildRows(st, query);
  const calcVals = (r: RowView) => cols.map((c) => cellValue(r, c, st, s, bounds));
  const restVals = calcVals;
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

/** Shared by pivot and drilldown so displayed totals always reconcile. */
export function cellValue(r: RowView, c: Col, st: Settings, rangeStart: number, bounds?: RollingBounds): number | null {
  const scenario = st.scenario === "compare" ? c.node.scenario ?? "fact" : st.scenario;
  const value = (a: Article, sc: Scenario) => articleValue(a, c.node.s, c.node.e, rangeStart, st.mode, sc, bounds);
  if (c.node.pctExec) {
    const plan = value(r.art, "budget");
    const actual = value(r.art, scenario);
    if (plan === null || actual === null) return null;
    if (plan === 0) return actual === 0 ? 100 : null;
    // Always actual/plan*100. Use absolute values for outflows (stored as negative in some models) so % is intuitive.
    const pMag = Math.abs(plan);
    const aMag = Math.abs(actual);
    if (pMag === 0) return aMag === 0 ? 100 : null;
    return (aMag / pMag) * 100;
  }
  const one = (a: Article) => {
    const v = value(a, scenario);
    if (v === null || !c.node.delta) return v;
    const other = value(a, c.node.delta);
    return other === null ? null : v - other;
  };
  const total = one(r.art);
  if (r.kind !== "rest" || total === null) return total;
  return total - r.restVisible!.reduce((sum, a) => sum + (one(a) ?? 0), 0);
}
