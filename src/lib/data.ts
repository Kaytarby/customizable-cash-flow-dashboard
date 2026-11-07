import { TOTAL_DAYS, dayToDate, isoToDay, dow, Scenario, FACT_END_DAY, PLAN_END_DAY } from "./dates";

export type Dir = "in" | "out";
export type Kind = "group" | "leaf" | "calc";

export interface Article {
  id: string;
  name: string;
  kind: Kind;
  calc?: "open" | "net" | "close";
  dir?: Dir;
  children?: Article[];
  parentId?: string;
  depth: number;
  prefix: Float64Array; // префиксные суммы по дням, длина N+1
}

export const OPENING_BALANCE = 35_000_000;
const N = TOTAL_DAYS;

/* ---------- детерминированный генератор ---------- */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Gen =
  | { t: "daily"; base: number; vol?: number; weekend?: number; season?: number; growth?: number; skip?: number }
  | { t: "monthly"; days: number[]; amount: number; vol?: number; growth?: number; months?: number[] }
  | { t: "sporadic"; prob: number; amount: number; vol?: number }
  | { t: "dates"; items: [string, number][] };

function generate(seed: number, g: Gen): Float64Array {
  const r = rng(seed);
  const out = new Float64Array(N);
  if (g.t === "dates") {
    for (const [iso, amount] of g.items) {
      const i = isoToDay(iso);
      if (i >= 0 && i < N) out[i] = amount;
    }
    return out;
  }
  for (let i = 0; i < N; i++) {
    const d = dayToDate(i);
    const m = d.getUTCMonth();
    const dom = d.getUTCDate();
    const wd = dow(i);
    const noise = r();
    const noise2 = r();
    if (g.t === "daily") {
      const weekend = wd >= 5;
      const wf = g.weekend ?? 0;
      if (weekend && wf === 0) continue;
      if (g.skip && noise2 < g.skip) continue;
      const growth = 1 + (g.growth ?? 0.25) * (i / N);
      const season = 1 + (g.season ?? 0) * Math.sin(((m - 2) / 12) * Math.PI * 2) + (m >= 9 ? (g.season ?? 0) * 0.6 : 0);
      const vol = g.vol ?? 0.35;
      out[i] = Math.round((g.base * (weekend ? wf : 1) * growth * season * (1 - vol + noise * vol * 2)) / 100) * 100;
    } else if (g.t === "monthly") {
      if (g.months && !g.months.includes(m)) continue;
      if (g.days.includes(dom)) {
        const growth = 1 + (g.growth ?? 0.08) * (i / N);
        const vol = g.vol ?? 0.04;
        out[i] = Math.round((g.amount * growth * (1 - vol + noise * vol * 2)) / 1000) * 1000;
      }
    } else if (g.t === "sporadic") {
      if (noise < g.prob) {
        const vol = g.vol ?? 0.4;
        out[i] = Math.round((g.amount * (1 - vol + noise2 * vol * 2)) / 1000) * 1000;
      }
    }
  }
  return out;
}

/* ---------- описание дерева статей ---------- */
interface Spec {
  id: string;
  name: string;
  dir?: Dir;
  gen?: Gen;
  children?: Spec[];
}
const L = (id: string, name: string, dir: Dir, gen: Gen): Spec => ({ id, name, dir, gen });
const G = (id: string, name: string, children: Spec[]): Spec => ({ id, name, children });

const SPEC: Spec[] = [
  G("op", "Операционная деятельность", [
    G("op_in", "Поступления от клиентов", [
      L("rev_retail", "Розничные продажи", "in", { t: "daily", base: 620_000, weekend: 1.25, season: 0.12, vol: 0.3 }),
      L("rev_whole", "Оптовые продажи", "in", { t: "daily", base: 760_000, season: 0.1, vol: 0.5, skip: 0.1 }),
      L("rev_serv", "Услуги и подписки", "in", { t: "daily", base: 350_000, growth: 0.5, vol: 0.4 }),
      L("op_in_other", "Прочие операционные поступления", "in", { t: "sporadic", prob: 0.06, amount: 180_000 }),
    ]),
    G("op_out", "Операционные выплаты", [
      G("cogs", "Закупка товаров и материалов", [
        L("cogs_raw", "Сырьё и материалы", "out", { t: "daily", base: 380_000, growth: 0.12, vol: 0.5, skip: 0.08 }),
        L("cogs_parts", "Комплектующие", "out", { t: "daily", base: 210_000, growth: 0.12, vol: 0.5, skip: 0.15 }),
        L("cogs_log", "Логистика закупок", "out", { t: "daily", base: 95_000, growth: 0.1, vol: 0.6, skip: 0.2 }),
      ]),
      G("staff", "Персонал", [
        L("staff_pay", "Оплата труда", "out", { t: "monthly", days: [10, 25], amount: 5_300_000, growth: 0.1 }),
        L("staff_ndfl", "НДФЛ", "out", { t: "monthly", days: [28], amount: 1_900_000, growth: 0.1 }),
        L("staff_ins", "Страховые взносы", "out", { t: "monthly", days: [15], amount: 3_300_000, growth: 0.1 }),
      ]),
      G("rent", "Аренда и коммунальные услуги", [
        L("rent_office", "Аренда офиса", "out", { t: "monthly", days: [5], amount: 1_400_000, vol: 0, growth: 0.05 }),
        L("rent_wh", "Аренда склада", "out", { t: "monthly", days: [5], amount: 2_100_000, vol: 0, growth: 0.07 }),
        L("rent_util", "Коммунальные платежи", "out", { t: "monthly", days: [15], amount: 450_000, vol: 0.2 }),
      ]),
      G("mkt", "Маркетинг", [
        L("mkt_ctx", "Контекстная реклама", "out", { t: "daily", base: 150_000, weekend: 0.6, vol: 0.3, growth: 0.2 }),
        L("mkt_smm", "Таргет и соцсети", "out", { t: "daily", base: 90_000, weekend: 0.7, vol: 0.4, growth: 0.2 }),
        L("mkt_agency", "Услуги агентств", "out", { t: "monthly", days: [20], amount: 900_000, vol: 0.12 }),
      ]),
      G("tax", "Налоги и сборы", [
        L("tax_vat", "НДС", "out", { t: "monthly", days: [25], amount: 5_600_000, months: [0, 3, 6, 9], growth: 0.15, vol: 0.12 }),
        L("tax_profit", "Налог на прибыль", "out", { t: "monthly", days: [28], amount: 2_400_000, months: [0, 3, 6, 9], growth: 0.15, vol: 0.15 }),
        L("tax_other", "Прочие налоги", "out", { t: "monthly", days: [20], amount: 310_000, vol: 0.1 }),
      ]),
      L("admin", "Административные расходы", "out", { t: "daily", base: 70_000, vol: 0.6, skip: 0.1 }),
    ]),
  ]),
  G("inv", "Инвестиционная деятельность", [
    L("inv_sale", "Продажа основных средств", "in", { t: "sporadic", prob: 0.008, amount: 1_500_000 }),
    G("inv_capex", "Приобретение активов", [
      L("capex_eq", "Оборудование", "out", { t: "sporadic", prob: 0.012, amount: 2_500_000 }),
      L("capex_veh", "Транспорт", "out", { t: "sporadic", prob: 0.008, amount: 1_800_000 }),
    ]),
    L("inv_dev", "Капитализируемая разработка", "out", { t: "monthly", days: [28], amount: 1_600_000, growth: 0.1 }),
  ]),
  G("fin", "Финансовая деятельность", [
    G("fin_loans", "Кредиты и займы", [
      L("loan_in", "Получение кредитов", "in", {
        t: "dates",
        items: [["2024-03-12", 20_000_000], ["2025-02-10", 30_000_000]],
      }),
      L("loan_main", "Погашение основного долга", "out", { t: "monthly", days: [15], amount: 1_500_000, vol: 0, growth: 0 }),
      L("loan_int", "Проценты по кредитам", "out", { t: "monthly", days: [15], amount: 780_000, vol: 0.05, growth: 0.1 }),
    ]),
    G("fin_owner", "Расчёты с собственниками", [
      L("owner_in", "Взнос в капитал", "in", { t: "dates", items: [["2024-06-03", 10_000_000]] }),
      L("owner_div", "Дивиденды", "out", {
        t: "dates",
        items: [["2024-04-25", 6_000_000], ["2025-04-25", 9_000_000], ["2025-10-27", 6_000_000]],
      }),
    ]),
  ]),
];

/* ---------- сборка ---------- */
export const BY_ID = new Map<string, Article>();
export const LEAVES: Article[] = [];
let seedCounter = 11;

function prefixOf(daily: Float64Array) {
  const p = new Float64Array(N + 1);
  for (let i = 0; i < N; i++) p[i + 1] = p[i] + daily[i];
  return p;
}

function build(spec: Spec, depth: number, parentId?: string): Article {
  if (spec.children) {
    const children = spec.children.map((c) => build(c, depth + 1, spec.id));
    const prefix = new Float64Array(N + 1);
    for (const c of children) for (let i = 0; i <= N; i++) prefix[i] += c.prefix[i];
    const a: Article = { id: spec.id, name: spec.name, kind: "group", children, depth, parentId, prefix };
    BY_ID.set(a.id, a);
    return a;
  }
  const daily = generate(seedCounter++ * 7919, spec.gen!);
  if (spec.dir === "out") for (let i = 0; i < N; i++) daily[i] = -daily[i];
  const a: Article = { id: spec.id, name: spec.name, kind: "leaf", dir: spec.dir, depth, parentId, prefix: prefixOf(daily) };
  BY_ID.set(a.id, a);
  LEAVES.push(a);
  return a;
}

const groups = SPEC.map((s) => build(s, 0));
const netPrefix = new Float64Array(N + 1);
for (const g of groups) for (let i = 0; i <= N; i++) netPrefix[i] += g.prefix[i];

const empty = new Float64Array(N + 1);
const open: Article = { id: "calc_open", name: "Остаток на начало периода", kind: "calc", calc: "open", depth: 0, prefix: empty };
const net: Article = { id: "calc_net", name: "Чистый денежный поток", kind: "calc", calc: "net", depth: 0, prefix: netPrefix };
const close: Article = { id: "calc_close", name: "Остаток на конец периода", kind: "calc", calc: "close", depth: 0, prefix: empty };
[open, net, close].forEach((a) => BY_ID.set(a.id, a));

export const ROOTS: Article[] = [open, ...groups, net, close];
export const NET = net;

export const IN_PREFIX = new Float64Array(N + 1);
export const OUT_PREFIX = new Float64Array(N + 1);
{
  for (const l of LEAVES) {
    const target = l.dir === "in" ? IN_PREFIX : OUT_PREFIX;
    for (let i = 0; i < N; i++) target[i + 1] += l.prefix[i + 1] - l.prefix[i];
  }
  for (let i = 0; i < N; i++) {
    IN_PREFIX[i + 1] += IN_PREFIX[i];
    OUT_PREFIX[i + 1] += OUT_PREFIX[i];
  }
}

export const GROUP_IDS: string[] = [];
export function walk(list: Article[], fn: (a: Article) => void) {
  for (const a of list) {
    fn(a);
    if (a.children) walk(a.children, fn);
  }
}
walk(ROOTS, (a) => a.kind === "group" && GROUP_IDS.push(a.id));

export const MAX_GROUP_DEPTH = Math.max(...GROUP_IDS.map((id) => BY_ID.get(id)!.depth));

const REVENUE = BY_ID.get("op_in")!;
export type Mode = "sum" | "cum" | "pct";

/** значение статьи за период [s,e] */
export function articleValue(a: Article, s: number, e: number, rangeStart: number, mode: Mode, scenario: Scenario = "fact"): number | null {
  const net = scenarioPrefix(NET, scenario);
  if (a.kind === "calc" && a.calc === "open") return mode === "pct" ? null : OPENING_BALANCE + net[s];
  if (a.kind === "calc" && a.calc === "close") return mode === "pct" ? null : OPENING_BALANCE + net[e + 1];
  const from = mode === "cum" ? rangeStart : s;
  const prefix = scenarioPrefix(a, scenario);
  const v = prefix[e + 1] - prefix[from];
  if (mode === "pct") {
    const revenue = scenarioPrefix(REVENUE, scenario);
    const rev = revenue[e + 1] - revenue[from];
    return rev ? (v / rev) * 100 : 0;
  }
  return v;
}

export function sumRange(prefix: Float64Array, s: number, e: number) {
  return prefix[Math.min(e + 1, N)] - prefix[Math.max(s, 0)];
}

// Each scenario shares the article tree, but owns deterministic daily values.
const scenarioCache = new Map<string, Float64Array>();
export function scenarioPrefix(a: Article, scenario: Scenario): Float64Array {
  if (scenario === "fact") return a.prefix;
  const key = `${scenario}:${a.id}`;
  const cached = scenarioCache.get(key);
  if (cached) return cached;
  let prefix: Float64Array;
  if (a.children || a.calc === "net") {
    prefix = new Float64Array(N + 1);
    for (const child of a.children ?? groups) {
      const cp = scenarioPrefix(child, scenario);
      for (let i = 0; i <= N; i++) prefix[i] += cp[i];
    }
  } else if (a.kind === "calc") {
    prefix = new Float64Array(N + 1);
  } else {
    const daily = new Float64Array(N);
    const seed = [...a.id].reduce((n, c) => n * 31 + c.charCodeAt(0), 7);
    const random = rng(seed + (scenario === "plan" ? 103 : 307));
    const plan = scenario === "rolling" ? scenarioPrefix(a, "plan") : null;
    const budget = scenario === "rolling" ? scenarioPrefix(a, "budget") : null;
    for (let i = 0; i < N; i++) {
      if (scenario === "rolling") {
        const source = i <= FACT_END_DAY ? a.prefix : i <= PLAN_END_DAY ? plan! : budget!;
        daily[i] = source[i + 1] - source[i];
      } else {
        const base = a.prefix[i + 1] - a.prefix[i];
        const factor = scenario === "plan" ? 1.04 + random() * 0.12 : 0.88 + random() * 0.10;
        daily[i] = Math.round(base * factor / 100) * 100;
      }
    }
    prefix = prefixOf(daily);
  }
  scenarioCache.set(key, prefix);
  return prefix;
}

const COUNTERPARTIES = ["ООО Альфа", "ООО Вектор", "АО Меридиан", "ООО Север", "ИП Смирнов"];
export function counterpartyValues(a: Article, s: number, e: number, rangeStart: number, mode: Mode, scenario: Scenario) {
  const amount = articleValue(a, s, e, rangeStart, mode, scenario) ?? 0;
  if (a.kind === "calc" || amount === 0) return [{ name: "Без контрагента", value: amount }];
  const hash = [...a.id].reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const shares = COUNTERPARTIES.map((_, i) => 1 + ((hash + i * 13) % 9));
  const shareTotal = shares.reduce((sum, share) => sum + share, 0);
  let assigned = 0;
  return COUNTERPARTIES.map((name, i) => {
    const value = i === shares.length - 1 ? amount - assigned : amount * shares[i] / shareTotal;
    assigned += value;
    return { name, value };
  });
}

export function scenarioTotals(s: number, e: number, scenario: Scenario) {
  let inn = 0, out = 0;
  for (const a of LEAVES) {
    const v = sumRange(scenarioPrefix(a, scenario), s, e);
    if (a.dir === "in") inn += v; else out += v;
  }
  return { inn, out, net: inn + out, close: OPENING_BALANCE + scenarioPrefix(NET, scenario)[e + 1] };
}
