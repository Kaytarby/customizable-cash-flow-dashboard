import { useState } from "react";
import { Drilldown } from "./Drilldown";
import { ChevronDown, ChevronRight, EyeOff, Focus } from "lucide-react";
import { Model, RowView } from "../lib/model";
import { Settings } from "../lib/settings";
import { makeFormatter } from "../lib/format";
import { LEVEL_ORDER } from "../lib/dates";
import { cn } from "../utils/cn";

const HEAD_H = 38;
const ROW_H = { compact: 28, normal: 34, comfy: 42 } as const;

export interface PivotHandlers {
  onToggleRow: (id: string) => void;
  onHideRow: (id: string) => void;
  onSoloRow: (id: string) => void;
  onRestoreKids: (parentId: string) => void;
  onToggleCol: (key: string, expanded: boolean) => void;
}

function colWidth(st: Settings, level: string, kind: string) {
  if (kind === "total") return Math.round(st.colWidth * 1.15);
  if (st.scenario === "compare") return Math.max(st.colWidth, 118);
  if (st.scenario === "rolling" && level === "month") return Math.max(st.colWidth, 116);
  if (level === "day") return Math.max(52, Math.round(st.colWidth * 0.68));
  if (level === "week") return Math.max(64, Math.round(st.colWidth * 0.86));
  return st.colWidth;
}

function highlight(name: string, q: string) {
  if (!q) return name;
  const i = name.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return name;
  return (
    <>
      {name.slice(0, i)}
      <mark className="rounded-sm bg-amber-300/60 px-0 text-inherit">{name.slice(i, i + q.length)}</mark>
      {name.slice(i + q.length)}
    </>
  );
}

export function PivotTable({ model, st, query, handlers }: { model: Model; st: Settings; query: string; handlers: PivotHandlers }) {
  const [drill, setDrill] = useState<{ row: RowView; column: number } | null>(null);
  const { rows, cols, header, headerRows, values, heatMax } = model;
  const fmt = makeFormatter(st);
  const rowH = ROW_H[st.density];
  const widths = cols.map((c) => colWidth(st, c.node.level, c.kind));
  const tableW = st.labelWidth + widths.reduce((a, b) => a + b, 0);
  const grid = st.gridlines;

  if (!cols.length) {
    return <div className="grid h-full place-items-center text-sm text-ink-3">Выберите хотя бы один уровень периодов</div>;
  }

  const renderRow = (r: RowView, ri: number) => {
    const isCalc = r.kind === "calc";
    const isRest = r.kind === "rest";
    const isGroup = r.kind === "group";
    const top = isGroup && r.depth === 0;
    const rowBg = isCalc
      ? r.calc === "net"
        ? "bg-[color-mix(in_srgb,var(--accent)_9%,var(--surface))]"
        : "bg-surface-2"
      : top
        ? "bg-surface-2"
        : st.zebra && ri % 2
          ? "bg-[color-mix(in_srgb,var(--ink)_2.2%,var(--surface))]"
          : "bg-surface";
    const weight = isCalc || top ? "font-semibold" : isGroup ? "font-medium" : "font-normal";
    const canSolo = r.kind !== "rest";

    return (
      <tr
        key={r.id}
        style={{ height: rowH }}
        className={cn(
          "group/row hover:bg-[color-mix(in_srgb,var(--accent)_7%,var(--surface))]",
          rowBg,
          weight,
          isCalc && "text-ink"
        )}
      >
        <td
          style={{ left: 0 }}
          className={cn(
            "sticky z-10 overflow-hidden border-b border-r border-line bg-inherit p-0",
            isCalc && r.calc !== "open" && "border-t border-t-line"
          )}
        >
          <div className="flex h-full items-center pr-2" style={{ paddingLeft: 8 + r.depth * 18 }}>
            {r.expandable ? (
              <button
                onClick={() => handlers.onToggleRow(r.id)}
                className="mr-1 grid h-5 w-5 shrink-0 place-items-center rounded text-ink-2 hover:bg-line/70 hover:text-ink"
                aria-label={r.expanded ? "Свернуть" : "Развернуть"}
              >
                {r.expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
            ) : (
              <span className="mr-1 grid h-5 w-5 shrink-0 place-items-center">
                {!isCalc && <span className={cn("h-1 w-1 rounded-full", isRest ? "bg-transparent" : "bg-ink-3/60")} />}
              </span>
            )}
            <span
              title={r.name}
              className={cn(
                "truncate text-[13px]",
                isRest && "italic text-ink-3",
                !isRest && r.depth > 0 && !isGroup && "text-ink-2",
                r.searchHit && "text-ink"
              )}
            >
              {highlight(r.name, query.trim())}
            </span>
            {r.hiddenKids > 0 && (
              <button
                onClick={() => handlers.onRestoreKids(r.id)}
                title={`Скрыто статей: ${r.hiddenKids}. Нажмите, чтобы вернуть`}
                className="ml-1.5 inline-flex shrink-0 items-center gap-0.5 rounded-full bg-accent-soft px-1.5 py-px text-[10px] font-semibold text-accent"
              >
                <EyeOff size={10} />
                {r.hiddenKids}
              </button>
            )}
            {isRest && (
              <button
                onClick={() => handlers.onRestoreKids(r.parentId!)}
                className="ml-1.5 shrink-0 rounded px-1 text-[11px] font-medium not-italic text-accent hover:underline"
              >
                показать
              </button>
            )}
            {!isRest && (
              <span className="absolute inset-y-0 right-0 flex items-center gap-0.5 bg-inherit pl-1 pr-1.5 opacity-0 transition-opacity group-hover/row:opacity-100">
                {canSolo && !isCalc && (
                  <button
                    title="Оставить только эту статью среди равных"
                    onClick={() => handlers.onSoloRow(r.id)}
                    className="grid h-6 w-6 place-items-center rounded text-ink-2 hover:bg-line hover:text-ink"
                  >
                    <Focus size={13} />
                  </button>
                )}
                <button
                  title="Скрыть строку (итоги группы не изменятся)"
                  onClick={() => handlers.onHideRow(r.id)}
                  className="grid h-6 w-6 place-items-center rounded text-ink-2 hover:bg-line hover:text-ink"
                >
                  <EyeOff size={13} />
                </button>
              </span>
            )}
          </div>
        </td>
        {cols.map((c, ci) => {
          const v = values[ri][ci];
          const isPctExec = !!c.node.pctExec;
          const f = isPctExec
            ? (v === null ? { text: "–", neg: false, zero: true } : { text: `${v.toFixed(1)}%`, neg: v < 100, zero: false })
            : fmt(v);
          // Execution %: income — <100% red, >=100% green; expense — наоборот (<100% green/saved, >=100% red/overspent)
          let execColor = "";
          if (isPctExec && v !== null && !isCalc) {
            const isOut = r.art.dir === "out" || ["op_out","cogs","staff","rent","mkt","tax","admin","inv_capex","inv_dev","loan_main","loan_int","owner_div","inv","fin"].includes(r.art.id) || (r.kind === "group" && r.art.children?.every(ch => ch.dir === "out"));
            // pctExec = actual/plan*100 (both positive magnitudes for comparison). >=100 means more than planned.
            const good = isOut ? v < 100 : v >= 100;
            const onTarget = Math.abs(v - 100) < 0.05;
            execColor = onTarget ? "text-ink font-medium" : good ? "text-pos font-medium" : "text-neg font-medium";
          }
          const isSub = c.kind === "sub";
          const isTot = c.kind === "total";
          const scenBg = !isTot && !isSub && st.scenario === "rolling"
            ? (c.node.scenario === "plan"
                ? "bg-sky-500/[0.08] border-l border-l-sky-400/40"
                : c.node.scenario === "budget"
                  ? "bg-amber-500/[0.09] border-l border-l-amber-400/40"
                  : "")
            : "";
          let style: React.CSSProperties | undefined;
          if (st.heat && c.kind === "leaf" && v !== null && !isCalc && !f.zero && !isPctExec) {
            const max = heatMax[ri][LEVEL_ORDER[c.node.level as keyof typeof LEVEL_ORDER]] || 1;
            const a = Math.min(1, Math.abs(v) / max) * 0.34;
            style = { backgroundColor: `rgba(var(${v < 0 ? "--heat-neg" : "--heat-pos"}), ${a.toFixed(3)})` };
          }
          return (
            <td
              key={c.key}
              style={style}
              className={cn(
                "num whitespace-nowrap border-b border-line/70 px-2.5 text-right text-[12.5px]",
                grid && "border-r border-r-line/50",
                isSub && "bg-ink/[0.035] font-medium",
                isTot && "sticky right-0 z-10 border-l border-l-line bg-inherit font-semibold shadow-[-8px_0_12px_-10px_rgba(0,0,0,0.25)]",
                scenBg,
                !isSub && !isTot && st.weekendTint && c.node.weekend && !style && !scenBg && "bg-ink/[0.03]",
                execColor || (f.zero ? "text-ink-3" : f.neg && st.negRed ? "text-neg" : "text-ink")
              )}
            >
              <button className="w-full rounded text-right hover:text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent" aria-label={`Расшифровать: ${r.name}, ${c.node.title}`} onClick={() => setDrill({ row: r, column: ci })}>{f.text}</button>
            </td>
          );
        })}
      </tr>
    );
  };

  return (
    <div className="nice-scroll h-full w-full overflow-auto">
      {drill && <Drilldown model={model} st={st} row={drill.row} column={drill.column} onClose={() => setDrill(null)} />}
      <table className="pivot text-ink" style={{ width: tableW, minWidth: "100%" }}>
        <colgroup>
          <col style={{ width: st.labelWidth }} />
          {widths.map((w, i) => (
            <col key={i} style={{ width: w }} />
          ))}
        </colgroup>
        <thead>
          {header.map((rowCells, r) => (
            <tr key={r} style={{ height: HEAD_H }}>
              {r === 0 && (
                <th
                  rowSpan={headerRows}
                  style={{ top: 0, left: 0 }}
                  className="sticky z-30 border-b border-r border-line bg-surface-2 px-3 text-left align-bottom"
                >
                  <div className="pb-2.5">
                    <div className="text-[11px] font-medium uppercase tracking-wide text-ink-3">Статьи ДДС</div>
                    <div className="text-[11px] text-ink-3">
                      {rows.length} строк · {cols.length} колонок
                    </div>
                  </div>
                </th>
              )}
              {rowCells.map((h) => {
                const isTotal = h.kind === "total";
                const hasSub = !!h.node.sub;
                return (
                  <th
                    key={h.key}
                    colSpan={h.colspan}
                    rowSpan={h.rowspan}
                    title={h.node.title}
                    style={{ top: isTotal ? 0 : h.row * HEAD_H, height: h.rowspan * HEAD_H }}
                    className={cn(
                      "sticky border-b border-line bg-surface-2 p-0 text-center font-medium",
                      grid ? "border-r border-r-line/60" : "",
                      isTotal ? "right-0 z-30 border-l border-l-line shadow-[-8px_0_12px_-10px_rgba(0,0,0,0.25)]" : "z-20",
                      h.kind === "sub" && "bg-[color-mix(in_srgb,var(--ink)_4%,var(--surface-2))]",
                      h.node.weekend && st.weekendTint && "text-neg/80",
                      st.scenario === "rolling" && h.node.scenario === "plan" && "bg-sky-500/[0.11]",
                      st.scenario === "rolling" && h.node.scenario === "budget" && "bg-amber-500/[0.12]"
                    )}
                  >
                    {h.kind === "group" ? (
                      <div className="flex items-center" style={{ height: HEAD_H - 1 }}>
                        <button
                          onClick={() => handlers.onToggleCol(h.node.key, true)}
                          style={{ position: "sticky", left: st.labelWidth + 8 }}
                          className="ml-2 inline-flex max-w-full items-center gap-1 rounded px-1 text-[12px] font-semibold text-ink hover:text-accent"
                          title={`${h.node.title} — свернуть`}
                        >
                          <ChevronDown size={13} className="shrink-0" />
                          <span className="truncate">{h.node.label}</span>
                        </button>
                      </div>
                    ) : h.kind === "sub" ? (
                      <div className="px-2 text-[11px] font-medium text-ink-2" title={`Итого: ${h.node.title}`}>
                        Σ {h.node.label.length < 10 ? h.node.label : "итого"}
                      </div>
                    ) : (
                      <button
                        disabled={!h.expandable}
                        onClick={() => h.expandable && handlers.onToggleCol(h.node.key, false)}
                        className={cn(
                          "mx-auto flex h-full w-full max-w-full items-center justify-center gap-1 px-1.5",
                          h.expandable && "hover:text-accent",
                          isTotal ? "text-[12px] font-semibold text-ink" : "text-[12px] text-ink"
                        )}
                        title={h.expandable ? `${h.node.title} — развернуть` : h.node.title}
                      >
                        {h.expandable && <ChevronRight size={12} className="shrink-0 text-ink-3" />}
                        <span className="flex min-w-0 flex-col items-center leading-tight">
                          <span className="truncate">{h.node.label}</span>
                          {hasSub && (
                            <span className={cn("truncate text-[10px] font-normal text-ink-3", h.node.split && "italic")}>
                              {h.node.sub}
                              {h.node.split ? " ◐" : ""}
                            </span>
                          )}
                        </span>
                      </button>
                    )}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>{rows.map(renderRow)}</tbody>
      </table>
      {!rows.length && <div className="p-10 text-center text-sm text-ink-3">Нет строк для отображения — измените фильтры или верните скрытые статьи</div>}
    </div>
  );
}
