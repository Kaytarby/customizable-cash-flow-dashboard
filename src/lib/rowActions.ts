import { Article, BY_ID, ROOTS, walk } from "./data";
import { Settings } from "./settings";

type Patch = Partial<Settings>;

const ancestors = (id: string): Article[] => {
  const out: Article[] = [];
  let a = BY_ID.get(id);
  while (a?.parentId) {
    a = BY_ID.get(a.parentId)!;
    out.push(a);
  }
  return out;
};
const siblingsOf = (a: Article): Article[] => (a.parentId ? BY_ID.get(a.parentId)!.children! : ROOTS.filter((r) => r.kind !== "calc"));

export function toggleCollapse(st: Settings, id: string): Patch {
  const s = new Set(st.collapsedRows);
  s.has(id) ? s.delete(id) : s.add(id);
  return { collapsedRows: [...s] };
}

export function hideNode(st: Settings, id: string): Patch {
  return { hiddenRows: [...new Set([...st.hiddenRows, id])] };
}

/** показать статью и всю цепочку родителей, развернув их */
export function showNode(st: Settings, id: string): Patch {
  const anc = ancestors(id).map((a) => a.id);
  const hidden = new Set(st.hiddenRows);
  hidden.delete(id);
  anc.forEach((x) => hidden.delete(x));
  const collapsed = new Set(st.collapsedRows);
  anc.forEach((x) => collapsed.delete(x));
  return { hiddenRows: [...hidden], collapsedRows: [...collapsed] };
}

export function toggleVisible(st: Settings, id: string): Patch {
  return st.hiddenRows.includes(id) ? showNode(st, id) : hideNode(st, id);
}

/** оставить только эту статью среди равных на каждом уровне вложенности */
export function soloNode(st: Settings, id: string): Patch {
  const a = BY_ID.get(id)!;
  const path = [a, ...ancestors(id).map((x) => x)];
  const pathIds = new Set(path.map((p) => p.id));
  const hidden = new Set(st.hiddenRows);
  for (const p of path) {
    for (const sib of siblingsOf(p)) if (!pathIds.has(sib.id)) hidden.add(sib.id);
    hidden.delete(p.id);
  }
  const collapsed = new Set(st.collapsedRows);
  ancestors(id).forEach((x) => collapsed.delete(x.id));
  return { hiddenRows: [...hidden], collapsedRows: [...collapsed] };
}

export function restoreKids(st: Settings, parentId: string): Patch {
  const kids = new Set(BY_ID.get(parentId)?.children?.map((c) => c.id) ?? []);
  return { hiddenRows: st.hiddenRows.filter((h) => !kids.has(h)) };
}

/** скрыть все вложенные статьи, оставив только верхний уровень */
export function hideAllNested(): Patch {
  const ids: string[] = [];
  walk(ROOTS, (a) => a.depth > 0 && ids.push(a.id));
  return { hiddenRows: ids };
}

export function hideAllLeaves(): Patch {
  const ids: string[] = [];
  walk(ROOTS, (a) => a.kind === "leaf" && ids.push(a.id));
  return { hiddenRows: ids };
}
