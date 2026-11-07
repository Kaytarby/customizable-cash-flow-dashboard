import { Model } from "./model";
import { Settings } from "./settings";

export function exportCsv(model: Model, st: Settings) {
  const sep = ";";
  const esc = (s: string) => (/[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const pct = st.mode === "pct";
  const head = ["Статья", ...model.cols.map((c) => (c.kind === "sub" ? `Итого: ${c.node.title}` : c.node.title))];
  const lines = [head.map(esc).join(sep)];
  model.rows.forEach((r, i) => {
    const cells = model.values[i].map((v) => {
      if (v === null) return "";
      const x = pct ? v : v / st.unit;
      return String(Math.round(x * 1000) / 1000).replace(".", ",");
    });
    lines.push([esc("  ".repeat(r.depth) + r.name), ...cells].join(sep));
  });
  const unit = pct ? "% выручки" : st.unit === 1 ? "руб." : st.unit === 1000 ? "тыс. руб." : "млн руб.";
  lines.push("", esc(`Единицы: ${unit}`));
  const blob = new Blob(["\ufeff" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `ДДС_${st.from}_${st.to}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
