import { Level, Scenario } from "./dates";
import { GROUP_IDS, BY_ID, Mode } from "./data";

export type Subtotal = "left" | "right" | "none";
export type Density = "compact" | "normal" | "comfy";

export interface Settings {
  scenario: Scenario | "compare";
  comparison: "all" | "budget";
  factCutoff: string;
  planEnd: string;
  levels: Level[];
  detail: Level;
  colOverrides: Record<string, boolean>;
  from: string;
  to: string;
  subtotal: Subtotal;
  grandTotal: boolean;
  mode: Mode;
  unit: 1 | 1000 | 1000000;
  decimals: 0 | 1 | 2;
  brackets: boolean;
  negRed: boolean;
  showZeros: boolean;
  heat: boolean;
  density: Density;
  colWidth: number;
  labelWidth: number;
  gridlines: boolean;
  zebra: boolean;
  weekendTint: boolean;
  kpi: boolean;
  hideEmpty: boolean;
  restRow: boolean;
  theme: "light" | "dark";
  panelPinned: boolean;
  collapsedRows: string[];
  hiddenRows: string[];
}

export function collapseToLevel(level: number): string[] {
  // level 1 — только виды деятельности, 2 — подгруппы и т.д.
  return GROUP_IDS.filter((id) => BY_ID.get(id)!.depth >= level - 1);
}

export const DEFAULTS: Settings = {
  scenario: "fact",
  comparison: "all",
  factCutoff: "2026-03-15",
  planEnd: "2026-04-30",
  levels: ["year", "quarter", "month", "week", "day"],
  detail: "month",
  colOverrides: {},
  from: "2026-01-01",
  to: "2026-03-15",
  subtotal: "right",
  grandTotal: true,
  mode: "sum",
  unit: 1000,
  decimals: 0,
  brackets: false,
  negRed: true,
  showZeros: false,
  heat: false,
  density: "normal",
  colWidth: 96,
  labelWidth: 320,
  gridlines: true,
  zebra: false,
  weekendTint: true,
  kpi: true,
  hideEmpty: false,
  restRow: true,
  theme: "light",
  panelPinned: true,
  collapsedRows: collapseToLevel(3),
  hiddenRows: [],
};

const KEY = "dds-pivot-settings-v2";
const VIEWS_KEY = "dds-pivot-views-v2";

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  const prefersDark = typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  return { ...DEFAULTS, theme: prefersDark ? "dark" : "light" };
}

export function saveSettings(s: Settings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

export interface SavedView {
  name: string;
  settings: Partial<Settings>;
}

export function loadViews(): SavedView[] {
  try {
    return JSON.parse(localStorage.getItem(VIEWS_KEY) || "[]");
  } catch {
    return [];
  }
}
export function saveViews(v: SavedView[]) {
  try {
    localStorage.setItem(VIEWS_KEY, JSON.stringify(v));
  } catch {
    /* ignore */
  }
}

/** ключи, которые входят в «вид» (без темы) */
export const VIEW_KEYS: (keyof Settings)[] = [
  "scenario", "comparison", "factCutoff", "planEnd", "levels", "detail", "colOverrides", "from", "to", "subtotal", "grandTotal", "mode", "unit", "decimals",
  "brackets", "negRed", "showZeros", "heat", "density", "colWidth", "labelWidth", "gridlines", "zebra",
  "weekendTint", "kpi", "hideEmpty", "restRow", "collapsedRows", "hiddenRows",
];

export const PRESETS: SavedView[] = [
  {
    name: "Для собственника",
    settings: {
      levels: ["year", "quarter"], detail: "quarter", colOverrides: {}, from: "2024-01-01", to: "2025-12-31",
      unit: 1000000, decimals: 1, collapsedRows: collapseToLevel(2), hiddenRows: [], mode: "sum", subtotal: "right", heat: false,
    },
  },
  {
    name: "Финансовый контроль",
    settings: {
      levels: ["year", "quarter", "month"], detail: "month", colOverrides: {}, from: "2025-01-01", to: "2025-12-31",
      unit: 1000, decimals: 0, collapsedRows: collapseToLevel(3), hiddenRows: [], mode: "sum", subtotal: "right", heat: true,
    },
  },
  {
    name: "Оперативный (недели)",
    settings: {
      levels: ["month", "week"], detail: "week", colOverrides: {}, from: "2025-10-01", to: "2025-12-31",
      unit: 1000, decimals: 0, collapsedRows: collapseToLevel(3), hiddenRows: [], mode: "sum", subtotal: "left", heat: true,
    },
  },
  {
    name: "Платёжный календарь (дни)",
    settings: {
      levels: ["month", "week", "day"], detail: "day", colOverrides: {}, from: "2025-12-01", to: "2025-12-31",
      unit: 1000, decimals: 0, collapsedRows: collapseToLevel(2), hiddenRows: [], mode: "sum", subtotal: "right", heat: true, weekendTint: true,
    },
  },
  {
    name: "Структура затрат, % от выручки",
    settings: {
      levels: ["year", "quarter"], detail: "quarter", colOverrides: {}, from: "2024-01-01", to: "2025-12-31",
      mode: "pct", decimals: 1, collapsedRows: collapseToLevel(3), hiddenRows: ["calc_open", "calc_close", "inv", "fin"], heat: false,
    },
  },
];
