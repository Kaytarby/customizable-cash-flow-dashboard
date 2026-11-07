import { useState } from "react";
import { Eye, EyeOff, Focus, X, RotateCcw } from "lucide-react";
import { Article, ROOTS, MAX_GROUP_DEPTH } from "../lib/data";
import { Settings, collapseToLevel } from "../lib/settings";
import { hideAllLeaves, hideAllNested, soloNode, toggleVisible } from "../lib/rowActions";
import { Field, Segmented, Slider, Toggle } from "./ui";
import { cn } from "../utils/cn";

type SetFn = (patch: Partial<Settings>) => void;

function TreeRow({ a, st, set, parentHidden }: { a: Article; st: Settings; set: SetFn; parentHidden: boolean }) {
  const hidden = st.hiddenRows.includes(a.id);
  const dim = hidden || parentHidden;
  return (
    <>
      <div className="group flex h-7 items-center rounded-md pr-1 hover:bg-surface-2" style={{ paddingLeft: 4 + a.depth * 14 }}>
        <button
          onClick={() => set(toggleVisible(st, a.id))}
          title={hidden ? "Показать (вместе с родителями)" : "Скрыть"}
          className={cn("grid h-6 w-6 shrink-0 place-items-center rounded", hidden ? "text-ink-3" : "text-accent")}
        >
          {hidden ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
        <span
          className={cn(
            "ml-1 min-w-0 flex-1 truncate text-[12.5px]",
            a.kind === "group" && a.depth === 0 ? "font-semibold" : a.kind === "group" ? "font-medium" : "",
            a.kind === "calc" && "font-medium",
            dim ? "text-ink-3" : "text-ink"
          )}
          title={a.name}
        >
          {a.name}
        </span>
        {a.kind !== "calc" && (
          <button
            onClick={() => set(soloNode(st, a.id))}
            title="Оставить только эту статью"
            className="grid h-6 w-6 place-items-center rounded text-ink-3 opacity-0 hover:bg-line hover:text-ink group-hover:opacity-100"
          >
            <Focus size={13} />
          </button>
        )}
      </div>
      {a.children?.map((c) => (
        <TreeRow key={c.id} a={c} st={st} set={set} parentHidden={dim} />
      ))}
    </>
  );
}

function ArticlesTab({ st, set }: { st: Settings; set: SetFn }) {
  const levels = Array.from({ length: MAX_GROUP_DEPTH + 2 }, (_, i) => i + 1);
  const curLevel = levels.find((l) => collapseToLevel(l).length === st.collapsedRows.length && collapseToLevel(l).every((x) => st.collapsedRows.includes(x)));
  return (
    <div className="space-y-3">
      <Field label="Развернуть до уровня вложенности">
        <Segmented
          value={curLevel ?? 0}
          onChange={(v) => set({ collapsedRows: collapseToLevel(v) })}
          options={levels.map((l) => ({ value: l, label: l === levels.length ? "Все" : String(l), title: l === levels.length ? "Раскрыть все группы" : `Показывать ${l} ур.` }))}
        />
      </Field>
      <Field label="Видимость статей">
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => set({ hiddenRows: [] })} className="h-7 rounded-lg border border-line px-2.5 text-xs font-medium text-ink-2 hover:bg-surface-2 hover:text-ink">
            Показать все
          </button>
          <button onClick={() => set(hideAllNested())} className="h-7 rounded-lg border border-line px-2.5 text-xs font-medium text-ink-2 hover:bg-surface-2 hover:text-ink">
            Только итоги групп
          </button>
          <button onClick={() => set(hideAllLeaves())} className="h-7 rounded-lg border border-line px-2.5 text-xs font-medium text-ink-2 hover:bg-surface-2 hover:text-ink">
            Скрыть конечные статьи
          </button>
        </div>
        <p className="mt-2 text-[11px] leading-snug text-ink-3">
          Скрытая статья пропадает из таблицы, но остаётся в итогах родительской группы. Включите нужную вложенную статью — родители раскроются сами.
        </p>
      </Field>
      <Toggle
        label="Строка «Скрытые статьи»"
        hint="В раскрытой группе показывает сумму скрытых строк — итог сходится"
        checked={st.restRow}
        onChange={(v) => set({ restRow: v })}
      />
      <Toggle label="Скрывать пустые строки" hint="Статьи без оборота в выбранном периоде" checked={st.hideEmpty} onChange={(v) => set({ hideEmpty: v })} />
      <div>
        <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-ink-3">Дерево статей</div>
        <div className="rounded-lg border border-line p-1">
          {ROOTS.map((a) => (
            <TreeRow key={a.id} a={a} st={st} set={set} parentHidden={false} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ViewTab({ st, set }: { st: Settings; set: SetFn }) {
  return (
    <div className="space-y-2">
      <Field label="Итоги развёрнутых периодов">
        <Segmented
          value={st.subtotal}
          onChange={(v) => set({ subtotal: v })}
          options={[
            { value: "left", label: "Слева" },
            { value: "right", label: "Справа" },
            { value: "none", label: "Нет" },
          ]}
        />
      </Field>
      <Toggle label="Колонка «Итого» за период" hint="Закреплена справа" checked={st.grandTotal} onChange={(v) => set({ grandTotal: v })} />

      <div className="my-2 border-t border-line" />
      <Field label="Знаков после запятой">
        <Segmented value={st.decimals} onChange={(v) => set({ decimals: v })} options={[{ value: 0, label: "0" }, { value: 1, label: "1" }, { value: 2, label: "2" }]} />
      </Field>
      <Toggle label="Отрицательные в скобках" hint="(1 200) вместо −1 200" checked={st.brackets} onChange={(v) => set({ brackets: v })} />
      <Toggle label="Подсвечивать отрицательные" checked={st.negRed} onChange={(v) => set({ negRed: v })} />
      <Toggle label="Показывать нули" hint="Иначе — прочерк" checked={st.showZeros} onChange={(v) => set({ showZeros: v })} />

      <div className="my-2 border-t border-line" />
      <Toggle label="Тепловая карта" hint="Интенсивность по величине внутри строки" checked={st.heat} onChange={(v) => set({ heat: v })} />
      <Toggle label="Линии сетки" checked={st.gridlines} onChange={(v) => set({ gridlines: v })} />
      <Toggle label="Зебра" checked={st.zebra} onChange={(v) => set({ zebra: v })} />
      <Toggle label="Выделять выходные" checked={st.weekendTint} onChange={(v) => set({ weekendTint: v })} />
      <Toggle label="Карточки показателей" checked={st.kpi} onChange={(v) => set({ kpi: v })} />

      <div className="my-2 border-t border-line" />
      <Field label="Плотность строк">
        <Segmented
          value={st.density}
          onChange={(v) => set({ density: v })}
          options={[
            { value: "compact", label: "Компактно" },
            { value: "normal", label: "Обычно" },
            { value: "comfy", label: "Свободно" },
          ]}
        />
      </Field>
      <Field label="Ширина колонок периодов">
        <Slider value={st.colWidth} onChange={(v) => set({ colWidth: v })} min={64} max={160} step={4} suffix=" px" />
      </Field>
      <Field label="Ширина колонки статей">
        <Slider value={st.labelWidth} onChange={(v) => set({ labelWidth: v })} min={220} max={480} step={10} suffix=" px" />
      </Field>
    </div>
  );
}

export function SidePanel({ st, set, onClose, onReset }: { st: Settings; set: SetFn; onClose: () => void; onReset: () => void }) {
  const [tab, setTab] = useState<"rows" | "view">("rows");
  return (
    <aside className="flex h-full w-[320px] shrink-0 flex-col rounded-xl border border-line bg-surface shadow-sm">
      <div className="flex items-center justify-between border-b border-line px-3 py-2.5">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: "rows", label: "Строки и статьи" },
            { value: "view", label: "Вид и формат" },
          ]}
        />
        <button onClick={onClose} className="grid h-7 w-7 place-items-center rounded-lg text-ink-2 hover:bg-surface-2" aria-label="Закрыть">
          <X size={16} />
        </button>
      </div>
      <div className="nice-scroll min-h-0 flex-1 overflow-y-auto px-3 py-3">{tab === "rows" ? <ArticlesTab st={st} set={set} /> : <ViewTab st={st} set={set} />}</div>
      <div className="border-t border-line p-2.5">
        <button onClick={onReset} className="flex h-8 w-full items-center justify-center gap-1.5 rounded-lg text-xs font-medium text-ink-2 hover:bg-surface-2 hover:text-ink">
          <RotateCcw size={13} /> Сбросить настройки
        </button>
      </div>
    </aside>
  );
}
