import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Article, LEAVES, OPENING_BALANCE, counterpartyValues, RollingBounds } from '../lib/data';
import { Model, RowView, cellValue } from '../lib/model';
import { Settings } from '../lib/settings';
import { makeFormatter } from '../lib/format';
import { rollingBounds } from '../lib/dates';
export function Drilldown({ model, st, row, column, onClose }: { model: Model; st: Settings; row: RowView; column: number; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const rb = rollingBounds(st.factCutoff, st.planEnd); const bounds: RollingBounds = { factEnd: rb.factEnd, planEnd: rb.planEnd };
  useEffect(() => { dialog.current?.showModal(); }, []);
  const col = model.cols[column];
  const fmt = makeFormatter(st);
  const parts: Article[] = [];
  const leaves = (a: Article) => { if (a.children) a.children.forEach(leaves); else parts.push(a); };
  const balance = row.calc === 'open' || row.calc === 'close';
  const unavailable = st.mode === 'pct' && balance;
  if (row.kind === 'calc') parts.push(...LEAVES);
  else if (row.kind === 'rest') row.art.children?.filter(a => !row.restVisible?.includes(a)).forEach(leaves);
  else leaves(row.art);
  const end = row.calc === 'open' ? col.node.s - 1 : col.node.e;
  const value = (a: Article) => cellValue({ ...row, art: a, kind: a.kind, restVisible: undefined }, balance ? { ...col, node: { ...col.node, s: 0, e: end } } : col, balance ? { ...st, mode: 'sum' } : st, balance ? 0 : model.rangeS, bounds);
  const baseline = balance && !col.node.delta ? OPENING_BALANCE : 0;
  return <dialog ref={dialog} onCancel={onClose} onClick={e => { if (e.target === e.currentTarget) onClose(); }} className="m-auto max-h-[85vh] w-[680px] max-w-[94vw] rounded-xl border border-line bg-surface p-0 text-ink shadow-xl backdrop:bg-black/40">
    <header className="flex items-start justify-between border-b border-line p-4"><div><h2 className="font-semibold">{row.name}</h2><p className="mt-1 text-xs text-ink-3">{col.node.title} · {st.mode === 'pct' ? '% выручки' : st.unit === 1000 ? 'тыс. руб.' : st.unit === 1000000 ? 'млн руб.' : 'руб.'}</p></div><button autoFocus onClick={onClose} aria-label="Закрыть расшифровку" className="rounded p-1 hover:bg-surface-2"><X size={18}/></button></header>
    {unavailable ? <div className="p-4 text-center text-sm text-ink-3">Остатки не рассчитываются в процентах от выручки. Переключите режим на «Суммы», чтобы увидеть расшифровку.</div> : <>
    <div className="max-h-[60vh] overflow-auto p-4"><p className="mb-3 text-xs text-ink-3">Состав суммы по статьям. Скрытые в таблице статьи также учитываются.</p>
      {balance && <div className="mb-2 flex justify-between gap-4 text-sm"><span>Начальный остаток на 01.01.2024{col.node.delta ? ' (разница)' : ''}</span><span className="num">{fmt(baseline).text}</span></div>}
      {parts.map(a => {
        const articleTotal = value(a);
        const sc = col.node.scenario ?? (st.scenario === 'compare' ? 'rolling' : st.scenario);
        const counterparts = !balance && st.mode !== 'pct' && a.kind === 'leaf' ? counterpartyValues(a, col.node.s, col.node.e, model.rangeS, 'sum', sc, bounds) : [];
        return <details key={a.id} className="group border-b border-line">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-2 text-sm">
            <span className="flex items-center gap-1.5">{counterparts.length > 0 && <span className="text-ink-3 group-open:rotate-90 transition-transform">▸</span>}{a.name}</span>
            <span className="num whitespace-nowrap font-medium">{fmt(articleTotal).text}</span>
          </summary>
          {counterparts.length > 0 && <div className="mb-2 ml-5 space-y-1 rounded bg-surface-2/60 px-3 py-2">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-3">По контрагентам</div>
            {counterparts.map(cp => <div key={cp.name} className="flex justify-between gap-4 text-[12.5px] text-ink-2"><span>{cp.name}</span><span className="num">{fmt(cp.value).text}</span></div>)}
          </div>}
        </details>;
      })}
    </div><footer className="flex justify-between border-t border-line p-4 font-semibold"><span>Итого</span><span className="num">{fmt(cellValue(row, col, st, model.rangeS, bounds)).text}</span></footer>
    </>}
  </dialog>;
}
