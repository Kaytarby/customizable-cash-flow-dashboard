import { Settings } from '../lib/settings';
import { SCENARIO_LABELS, SCENARIO_PERIODS } from '../lib/dates';
import { cn } from '../utils/cn';
const TABS = ['fact', 'budget', 'plan', 'rolling', 'compare'] as const;
export function ScenarioTabs({ st, set }: { st: Settings; set: (patch: Partial<Settings>) => void }) {
  return <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-line" role="tablist" aria-label="Сценарии ДДС">
    {TABS.map(scenario => <button key={scenario} role="tab" aria-selected={st.scenario === scenario}
      onClick={() => {
        const period = SCENARIO_PERIODS[scenario === 'compare' ? 'rolling' : scenario];
        const patch: Partial<Settings> = { scenario, from: period.from, to: period.to, colOverrides: {}, detail: scenario === 'plan' || scenario === 'rolling' ? 'week' : 'month' };
        if (scenario === 'compare') patch.levels = ['month'];
        set(patch);
      }}
      className={cn('rounded-t-lg border border-b-0 px-4 py-2 text-sm font-medium', st.scenario === scenario ? 'border-line bg-surface text-accent' : 'border-transparent text-ink-3 hover:bg-surface-2 hover:text-ink')}>
      {scenario === 'compare' ? 'Сравнение' : SCENARIO_LABELS[scenario]}
    </button>)}
    {st.scenario === 'compare' && <span className="mb-1 ml-auto px-2 text-xs font-medium text-ink-2">Ролинг-форкаст − бюджет · 2026</span>}
  </div>;
}
