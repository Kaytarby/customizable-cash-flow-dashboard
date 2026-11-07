import { Settings } from "./settings";

const cache = new Map<number, Intl.NumberFormat>();
function nf(d: number) {
  let f = cache.get(d);
  if (!f) {
    f = new Intl.NumberFormat("ru-RU", { minimumFractionDigits: d, maximumFractionDigits: d });
    cache.set(d, f);
  }
  return f;
}

export interface Formatted {
  text: string;
  neg: boolean;
  zero: boolean;
}

export function makeFormatter(st: Pick<Settings, "unit" | "decimals" | "brackets" | "showZeros" | "mode">) {
  const pct = st.mode === "pct";
  const d = pct ? Math.max(1, st.decimals) : st.decimals;
  const f = nf(d);
  const lim = 0.5 * Math.pow(10, -d);
  return (v: number | null): Formatted => {
    if (v === null) return { text: "", neg: false, zero: true };
    const x = pct ? v : v / st.unit;
    if (Math.abs(x) < lim) return { text: st.showZeros ? f.format(0) + (pct ? "%" : "") : "–", neg: false, zero: true };
    const abs = f.format(Math.abs(x)) + (pct ? "%" : "");
    const neg = x < 0;
    return { text: neg ? (st.brackets ? `(${abs})` : `−${abs}`) : abs, neg, zero: false };
  };
}

export const UNIT_LABEL: Record<number, string> = { 1: "₽", 1000: "тыс. ₽", 1000000: "млн ₽" };

export function compactMoney(v: number) {
  const a = Math.abs(v);
  const sign = v < 0 ? "−" : "";
  if (a >= 1e6) return `${sign}${nf(1).format(a / 1e6)} млн ₽`;
  if (a >= 1e3) return `${sign}${nf(0).format(a / 1e3)} тыс. ₽`;
  return `${sign}${nf(0).format(a)} ₽`;
}
