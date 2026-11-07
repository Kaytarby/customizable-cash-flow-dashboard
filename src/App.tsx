import { ScenarioTabs } from "./components/ScenarioTabs";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Layers, Moon, SlidersHorizontal, Sun, Trash2, BookmarkPlus, Banknote } from "lucide-react";
import { PivotTable } from "./components/PivotTable";
import { SidePanel } from "./components/SidePanel";
import { Toolbar } from "./components/Toolbar";
import { Kpis } from "./components/Kpis";
import { IconButton, MenuItem, Popover } from "./components/ui";
import {
  DEFAULTS, PRESETS, SavedView, Settings, VIEW_KEYS, loadSettings, loadViews, saveSettings, saveViews,
} from "./lib/settings";
import { buildModel } from "./lib/model";
import { exportCsv } from "./lib/exportCsv";
import { hideNode, restoreKids, soloNode, toggleCollapse } from "./lib/rowActions";
import { fmtFull } from "./lib/dates";
import { UNIT_LABEL } from "./lib/format";

function pickView(s: Settings): Partial<Settings> {
  const out: Record<string, unknown> = {};
  VIEW_KEYS.forEach((k) => (out[k] = s[k]));
  return out as Partial<Settings>;
}

export default function App() {
  const [st, setSt] = useState<Settings>(loadSettings);
  const [query, setQuery] = useState("");
  const [panel, setPanel] = useState(() => (typeof window !== "undefined" ? window.innerWidth >= 1280 : true));
  const [views, setViews] = useState<SavedView[]>(loadViews);
  const [viewName, setViewName] = useState("");

  const set = useCallback((patch: Partial<Settings>) => setSt((s) => ({ ...s, ...patch })), []);

  useEffect(() => {
    saveSettings(st);
    document.documentElement.classList.toggle("dark", st.theme === "dark");
  }, [st]);

  const model = useMemo(() => buildModel(st, query), [st, query]);

  const handlers = useMemo(
    () => ({
      onToggleRow: (id: string) => setSt((s) => ({ ...s, ...toggleCollapse(s, id) })),
      onHideRow: (id: string) => setSt((s) => ({ ...s, ...hideNode(s, id) })),
      onSoloRow: (id: string) => setSt((s) => ({ ...s, ...soloNode(s, id) })),
      onRestoreKids: (id: string) => setSt((s) => ({ ...s, ...restoreKids(s, id) })),
      onToggleCol: (key: string, expanded: boolean) =>
        setSt((s) => ({ ...s, colOverrides: { ...s.colOverrides, [key]: !expanded } })),
    }),
    []
  );

  const applyView = (v: Partial<Settings>) => setSt((s) => ({ ...s, ...pickView(DEFAULTS), ...v, theme: s.theme }));
  const reset = () => setSt((s) => ({ ...DEFAULTS, theme: s.theme }));

  const saveView = () => {
    const name = viewName.trim();
    if (!name) return;
    const next = [...views.filter((v) => v.name !== name), { name, settings: pickView(st) }];
    setViews(next);
    saveViews(next);
    setViewName("");
  };
  const removeView = (name: string) => {
    const next = views.filter((v) => v.name !== name);
    setViews(next);
    saveViews(next);
  };

  const unitLabel = st.mode === "pct" ? "% от поступлений от клиентов" : UNIT_LABEL[st.unit];
  const modeLabel = st.mode === "sum" ? "Оборот за период" : st.mode === "cum" ? "Нарастающий итог" : "Доля выручки";

  return (
    <div className="flex h-full flex-col gap-3 p-3 sm:p-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-white shadow-sm">
            <Banknote size={20} />
          </div>
          <div>
            <h1 className="text-[17px] font-semibold leading-tight tracking-tight text-ink">Движение денежных средств</h1>
            <p className="text-xs text-ink-3">
              Прямой метод · {fmtFull(model.rangeS)} — {fmtFull(model.rangeE)} · {modeLabel}, {unitLabel}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Popover
            width={300}
            trigger={(open, toggle) => (
              <IconButton onClick={toggle} active={open} className="h-9 px-3">
                <Layers size={15} /> Виды
              </IconButton>
            )}
          >
            {(close) => (
              <div>
                <div className="px-2.5 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-3">Готовые</div>
                {PRESETS.map((p) => (
                  <MenuItem key={p.name} onClick={() => { applyView(p.settings); close(); }}>
                    {p.name}
                  </MenuItem>
                ))}
                {views.length > 0 && (
                  <div className="px-2.5 pb-1 pt-2.5 text-[10px] font-semibold uppercase tracking-wider text-ink-3">Мои виды</div>
                )}
                {views.map((v) => (
                  <MenuItem
                    key={v.name}
                    onClick={() => { applyView(v.settings); close(); }}
                    right={
                      <span
                        role="button"
                        title="Удалить"
                        onClick={(e) => { e.stopPropagation(); removeView(v.name); }}
                        className="grid h-6 w-6 place-items-center rounded text-ink-3 hover:bg-line hover:text-neg"
                      >
                        <Trash2 size={13} />
                      </span>
                    }
                  >
                    {v.name}
                  </MenuItem>
                ))}
                <div className="mt-1.5 flex gap-1.5 border-t border-line p-1.5 pt-2.5">
                  <input
                    value={viewName}
                    onChange={(e) => setViewName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveView()}
                    placeholder="Название текущего вида"
                    className="h-8 min-w-0 flex-1 rounded-lg border border-line bg-surface px-2.5 text-xs text-ink outline-none placeholder:text-ink-3 focus:border-accent"
                  />
                  <button
                    onClick={saveView}
                    disabled={!viewName.trim()}
                    className="inline-flex h-8 items-center gap-1 rounded-lg bg-accent px-2.5 text-xs font-medium text-white disabled:opacity-40"
                  >
                    <BookmarkPlus size={14} /> Сохранить
                  </button>
                </div>
              </div>
            )}
          </Popover>
          <IconButton className="h-9 px-3" onClick={() => exportCsv(model, st)} title="Выгрузить видимую таблицу в CSV (открывается в Excel)">
            <Download size={15} /> CSV
          </IconButton>
          <IconButton className="h-9 w-9" onClick={() => set({ theme: st.theme === "dark" ? "light" : "dark" })} title="Тема">
            {st.theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </IconButton>
          <IconButton className="h-9 px-3" active={panel} onClick={() => setPanel((p) => !p)}>
            <SlidersHorizontal size={15} /> Настройки
          </IconButton>
        </div>
      </header>

      <ScenarioTabs st={st} set={set} />
      <div className="text-xs text-ink-3">Синтетические данные · {st.scenario === "rolling" ? "Факт: 01.01–15.03.2026 → Оперплан: 16.03–30.04 → Бюджет: май–декабрь (месяцы)" : st.scenario === "compare" ? "Бюджет сопоставлен с ролинг-форкастом (факт + оперплан + бюджет) за 2026 год. Δ — ролинг-форкаст минус бюджет." : "Нажмите на сумму для расшифровки по статьям"}</div>
      <Toolbar st={st} set={set} query={query} setQuery={setQuery} colCount={model.cols.length} />
      {st.kpi && <Kpis s={model.rangeS} e={model.rangeE} scenario={st.scenario === "compare" ? "fact" : st.scenario} />}

      <div className="relative flex min-h-0 flex-1 gap-3">
        <main key={st.scenario} className="min-w-0 flex-1 overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
          <PivotTable model={model} st={st} query={query} handlers={handlers} />
        </main>
        {panel && (
          <div className="absolute inset-y-0 right-0 z-40 xl:static xl:z-auto">
            <SidePanel st={st} set={set} onClose={() => setPanel(false)} onReset={reset} />
          </div>
        )}
      </div>
    </div>
  );
}
