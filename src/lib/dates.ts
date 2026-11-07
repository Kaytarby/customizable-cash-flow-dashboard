export type Level = "year" | "quarter" | "month" | "week" | "day";

export const LEVELS: Level[] = ["year", "quarter", "month", "week", "day"];
export const LEVEL_ORDER: Record<Level, number> = {
  year: 0,
  quarter: 1,
  month: 2,
  week: 3,
  day: 4,
};
export const LEVEL_NAMES: Record<Level, string> = {
  year: "Год",
  quarter: "Квартал",
  month: "Месяц",
  week: "Неделя",
  day: "День",
};

/** День 0 — понедельник 1 января 2024 */
export const BASE = Date.UTC(2024, 0, 1);
const DAY_MS = 86400000;

/** 2024-01-01 .. 2026-12-31 (1096 дней) */
export const TOTAL_DAYS = 1096;

export const MONTHS_SHORT = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
export const MONTHS_FULL = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];
export const WEEKDAYS_SHORT = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];

export const dayToDate = (i: number) => new Date(BASE + i * DAY_MS);
export const msToDay = (ms: number) => Math.round((ms - BASE) / DAY_MS);
export const isoToDay = (iso: string) => msToDay(Date.parse(iso + "T00:00:00Z"));
export const dayToIso = (i: number) => dayToDate(i).toISOString().slice(0, 10);
export const dow = (i: number) => (dayToDate(i).getUTCDay() + 6) % 7; // 0 = пн

export function fmtShort(i: number) {
  const d = dayToDate(i);
  return `${String(d.getUTCDate()).padStart(2, "0")}.${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
export function fmtFull(i: number) {
  const d = dayToDate(i);
  return `${fmtShort(i)}.${d.getUTCFullYear()}`;
}

/** последний день сегмента данного уровня, содержащего день d */
function levelEnd(level: Level, d: number): number {
  const date = dayToDate(d);
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  switch (level) {
    case "year":
      return msToDay(Date.UTC(y + 1, 0, 1)) - 1;
    case "quarter":
      return msToDay(Date.UTC(y, (Math.floor(m / 3) + 1) * 3, 1)) - 1;
    case "month":
      return msToDay(Date.UTC(y, m + 1, 1)) - 1;
    case "week":
      return d + (6 - dow(d));
    default:
      return d;
  }
}

/** Разбивает [s,e] на сегменты уровня. Сегменты обрезаются границами [s,e] —
 *  так недели на стыке месяцев делятся на две части. */
export function segments(level: Level, s: number, e: number): [number, number][] {
  const out: [number, number][] = [];
  let cur = s;
  while (cur <= e) {
    const end = Math.min(e, levelEnd(level, cur));
    out.push([cur, end]);
    cur = end + 1;
  }
  return out;
}

export function isoWeek(d: number): number {
  const date = dayToDate(d);
  const t = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const n = (t.getUTCDay() + 6) % 7;
  t.setUTCDate(t.getUTCDate() - n + 3);
  const firstThu = new Date(Date.UTC(t.getUTCFullYear(), 0, 4));
  return 1 + Math.round(((t.getTime() - firstThu.getTime()) / DAY_MS - 3 + ((firstThu.getUTCDay() + 6) % 7)) / 7);
}

/* ---------- сценарии данных ---------- */

export type Scenario = "fact" | "plan" | "budget" | "rolling";

export const SCENARIO_LABELS: Record<Scenario, string> = {
  fact: "Факт",
  plan: "Оперплан",
  budget: "Бюджет",
  rolling: "Ролинг-форкаст",
};

/** Предустановленные периоды по сценариям (2026 год) */
export const SCENARIO_PERIODS: Record<Scenario, { from: string; to: string; label: string }> = {
  fact: { from: "2026-01-01", to: "2026-03-15", label: "Янв — 15 марта" },
  plan: { from: "2026-03-16", to: "2026-04-30", label: "16 марта — 30 апреля" },
  budget: { from: "2026-05-01", to: "2026-12-31", label: "Май — Декабрь" },
  rolling: { from: "2026-01-01", to: "2026-12-31", label: "Янв — Дек 2026" },
};

/** Граница оперплана — конец месяца. Для 2026: конец апреля (30.04.2026) */
export const PLAN_END_DAY = isoToDay("2026-04-30");

/** Граница факта — 15 марта 2026 */
export const FACT_END_DAY = isoToDay("2026-03-15");

/** Начало бюджета — 1 мая 2026 */
export const BUDGET_START_DAY = isoToDay("2026-05-01");