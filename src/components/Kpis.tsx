import { ArrowDownRight, ArrowUpRight, Wallet, TrendingUp, TrendingDown, Scale } from "lucide-react";
import { IN_PREFIX, OUT_PREFIX, NET, OPENING_BALANCE, sumRange } from "../lib/data";
import { compactMoney } from "../lib/format";
import { fmtFull } from "../lib/dates";
import { cn } from "../utils/cn";

function Card({
  icon, title, value, delta, good, tone,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  delta: number | null;
  good: boolean; // рост — это хорошо
  tone: string;
}) {
  const up = delta !== null && delta >= 0;
  const positive = delta !== null && (up === good);
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 shadow-sm">
      <div className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg", tone)}>{icon}</div>
      <div className="min-w-0">
        <div className="truncate text-[11px] font-medium uppercase tracking-wide text-ink-3">{title}</div>
        <div className="flex items-baseline gap-2">
          <span className="num truncate text-lg font-semibold leading-tight text-ink">{value}</span>
          {delta !== null && Number.isFinite(delta) && (
            <span className={cn("num inline-flex items-center text-[11px] font-medium", positive ? "text-pos" : "text-neg")} title="Изменение к предыдущему периоду такой же длины">
              {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {Math.abs(delta).toFixed(0)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function Kpis({ s, e }: { s: number; e: number }) {
  const len = e - s + 1;
  const ps = s - len;
  const pe = s - 1;
  const hasPrev = ps >= 0;
  const cur = {
    inn: sumRange(IN_PREFIX, s, e),
    out: sumRange(OUT_PREFIX, s, e),
    net: sumRange(NET.prefix, s, e),
    close: OPENING_BALANCE + NET.prefix[e + 1],
  };
  const prev = hasPrev
    ? {
        inn: sumRange(IN_PREFIX, ps, pe),
        out: sumRange(OUT_PREFIX, ps, pe),
        net: sumRange(NET.prefix, ps, pe),
        close: OPENING_BALANCE + NET.prefix[pe + 1],
      }
    : null;
  const d = (a: number, b?: number) => (b === undefined || b === 0 ? null : ((a - b) / Math.abs(b)) * 100);
  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <Card icon={<TrendingUp size={18} />} tone="bg-pos/10 text-pos" title="Поступления" value={compactMoney(cur.inn)} delta={d(cur.inn, prev?.inn)} good />
      <Card icon={<TrendingDown size={18} />} tone="bg-neg/10 text-neg" title="Выплаты" value={compactMoney(cur.out)} delta={d(-cur.out, prev ? -prev.out : undefined)} good={false} />
      <Card icon={<Scale size={18} />} tone="bg-accent-soft text-accent" title="Чистый денежный поток" value={compactMoney(cur.net)} delta={d(cur.net, prev?.net)} good />
      <Card icon={<Wallet size={18} />} tone="bg-surface-2 text-ink-2" title={`Остаток на ${fmtFull(e)}`} value={compactMoney(cur.close)} delta={d(cur.close, prev?.close)} good />
    </div>
  );
}
