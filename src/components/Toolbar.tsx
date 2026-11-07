import { ChevronsDownUp, ChevronsUpDown, Search, X, Calendar } from "lucide-react";
import { LEVELS, LEVEL_NAMES, LEVEL_ORDER, Level, dayToIso, TOTAL_DAYS } from "../lib/dates";
import { Settings } from "../lib/settings";
import { UNIT_LABEL } from "../lib/format";
import { Segmented, SelectBox, IconButton } from "./ui";
import { cn } from "../utils/cn";

type SetFn = (patch: Partial<Settings>) => void;

const QUICK: { label: string; from: string; to: string }[] = [
  { label: "2024", from: "2024-01-01", to: "2024-12-31" },
  { label: "2025", from: "2025-01-01", to: "2025-12-31" },
  { label: "2026", from: "2026-01-01", to: "2026-12-31" },
  { label: "Всё время", from: "2024-01-01", to: "2026-12-31" },
  { label: "4 кв. 2025", from: "2025-10-01", to: "2025-12-31" },
  { label: "Дек 2025", from: "2025-12-01", to: "2025-12-31" },
];

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-3">{label}</span>
      <div className="flex h-8 items-center gap-1.5">{children}</div>
    </div>
  );
}

export function Toolbar({ st, set, query, setQuery, colCount }: { st: Settings; set: SetFn; query: string; setQuery: (q: string) => void; colCount: number }) {
  const minIso = dayToIso(0);
  const maxIso = dayToIso(TOTAL_DAYS - 1);

  const toggleLevel = (l: Level) => {
    const has = st.levels.includes(l);
    if (has && st.levels.length === 1) return;
    const next = (has ? st.levels.filter((x) => x !== l) : [...st.levels, l]).sort((a, b) => LEVEL_ORDER[a] - LEVEL_ORDER[b]);
    // подберём ближайший доступный уровень детализации
    const detail = next.includes(st.detail) ? st.detail : (next.find((x) => LEVEL_ORDER[x] >= LEVEL_ORDER[st.detail]) ?? next[next.length - 1]);
    set({ levels: next, detail, colOverrides: {} });
  };

  const sorted = [...st.levels].sort((a, b) => LEVEL_ORDER[a] - LEVEL_ORDER[b]);
  const detail = sorted.includes(st.detail) ? st.detail : sorted[sorted.length - 1];
  const sameRange = (q: { from: string; to: string }) => q.from === st.from && q.to === st.to;

  return (
    <div className="flex flex-wrap items-end gap-x-5 gap-y-3 rounded-xl border border-line bg-surface px-4 py-3 shadow-sm">
      <Group label="Период">
        <div className="flex h-8 items-center gap-1.5 rounded-lg border border-line bg-surface px-2">
          <Calendar size={13} className="text-ink-3" />
          <input
            type="date"
            value={st.from}
            min={minIso}
            max={st.to}
            onChange={(e) => e.target.value && set({ from: e.target.value, colOverrides: {} })}
            className="num w-[108px] bg-transparent text-xs text-ink outline-none"
          />
          <span className="text-ink-3">—</span>
          <input
            type="date"
            value={st.to}
            min={st.from}
            max={maxIso}
            onChange={(e) => e.target.value && set({ to: e.target.value, colOverrides: {} })}
            className="num w-[108px] bg-transparent text-xs text-ink outline-none"
          />
        </div>
        <div className="hidden items-center gap-1 2xl:flex">
          {QUICK.map((q) => (
            <button
              key={q.label}
              onClick={() => set({ from: q.from, to: q.to, colOverrides: {} })}
              className={cn(
                "h-7 rounded-md px-2 text-[11px] font-medium transition-colors",
                sameRange(q) ? "bg-accent-soft text-accent" : "text-ink-2 hover:bg-surface-2 hover:text-ink"
              )}
            >
              {q.label}
            </button>
          ))}
        </div>
      </Group>

      <Group label="Уровни колонок">
        <div className="inline-flex rounded-lg border border-line bg-surface-2 p-0.5">
          {LEVELS.map((l) => {
            const on = st.levels.includes(l);
            return (
              <button
                key={l}
                onClick={() => toggleLevel(l)}
                title={on ? `Убрать уровень «${LEVEL_NAMES[l]}»` : `Добавить уровень «${LEVEL_NAMES[l]}»`}
                className={cn(
                  "h-7 rounded-md px-2.5 text-xs font-medium transition-colors",
                  on ? "bg-surface text-accent shadow-sm ring-1 ring-line" : "text-ink-3 hover:text-ink"
                )}
              >
                {LEVEL_NAMES[l]}
              </button>
            );
          })}
        </div>
      </Group>

      <Group label="Детализация до">
        <SelectBox
          className="w-[116px]"
          value={detail}
          onChange={(v) => set({ detail: v as Level, colOverrides: {} })}
          options={sorted.map((l) => ({ value: l, label: LEVEL_NAMES[l] }))}
        />
        <IconButton title="Свернуть все колонки до верхнего уровня" onClick={() => set({ detail: sorted[0], colOverrides: {} })}>
          <ChevronsDownUp size={14} />
        </IconButton>
        <IconButton title="Развернуть все колонки до нижнего уровня" onClick={() => set({ detail: sorted[sorted.length - 1], colOverrides: {} })}>
          <ChevronsUpDown size={14} />
        </IconButton>
      </Group>

      <Group label="Значения">
        <Segmented
          value={st.mode}
          onChange={(v) => set({ mode: v })}
          options={[
            { value: "sum", label: "Сумма", title: "Оборот за период" },
            { value: "cum", label: "Нарастающим", title: "Нарастающий итог с начала выбранного периода" },
            { value: "pct", label: "% выручки", title: "Доля от поступлений от клиентов" },
          ]}
        />
        {st.mode !== "pct" && (
          <SelectBox
            className="w-[92px]"
            value={st.unit}
            onChange={(v) => set({ unit: v as Settings["unit"] })}
            options={([1, 1000, 1000000] as const).map((u) => ({ value: u, label: UNIT_LABEL[u] }))}
          />
        )}
      </Group>

      <div className="ml-auto flex items-end gap-3">
        {colCount > 250 && (
          <span className="mb-1.5 rounded-md bg-amber-500/15 px-2 py-1 text-[11px] font-medium text-amber-700 dark:text-amber-300">
            {colCount} колонок — сузьте период
          </span>
        )}
        <Group label="Поиск по статьям">
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Например, аренда"
              className="h-8 w-48 rounded-lg border border-line bg-surface pl-8 pr-7 text-xs text-ink outline-none placeholder:text-ink-3 focus:border-accent"
            />
            {query && (
              <button onClick={() => setQuery("")} className="absolute right-1.5 top-1/2 grid h-5 w-5 -translate-y-1/2 place-items-center rounded text-ink-3 hover:text-ink">
                <X size={13} />
              </button>
            )}
          </div>
        </Group>
      </div>
    </div>
  );
}
