import { ReactNode, useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "../utils/cn";

export function Segmented<T extends string | number>({
  value, onChange, options, size = "md",
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode; title?: string }[];
  size?: "sm" | "md";
}) {
  return (
    <div className="inline-flex rounded-lg bg-surface-2 p-0.5 border border-line">
      {options.map((o) => (
        <button
          key={String(o.value)}
          title={o.title}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-md font-medium transition-colors whitespace-nowrap",
            size === "sm" ? "px-2 h-6 text-[11px]" : "px-2.5 h-7 text-xs",
            o.value === value ? "bg-surface text-ink shadow-sm ring-1 ring-line" : "text-ink-2 hover:text-ink"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex items-start justify-between gap-3 py-1.5 cursor-pointer group">
      <span className="min-w-0">
        <span className="block text-[13px] text-ink">{label}</span>
        {hint && <span className="block text-[11px] text-ink-3 leading-snug">{hint}</span>}
      </span>
      <button
        role="switch"
        aria-checked={checked}
        onClick={(e) => {
          e.preventDefault();
          onChange(!checked);
        }}
        className={cn("relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors", checked ? "bg-accent" : "bg-line")}
      >
        <span className={cn("absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform", checked && "translate-x-4")} />
      </button>
    </label>
  );
}

export function Field({ label, children, right }: { label: string; children: ReactNode; right?: ReactNode }) {
  return (
    <div className="py-1.5">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-medium uppercase tracking-wide text-ink-3">{label}</span>
        {right}
      </div>
      {children}
    </div>
  );
}

export function Slider({ value, onChange, min, max, step = 1, suffix = "" }: { value: number; onChange: (v: number) => void; min: number; max: number; step?: number; suffix?: string }) {
  return (
    <div className="flex items-center gap-3">
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="flex-1" />
      <span className="num w-14 text-right text-xs text-ink-2">{value}{suffix}</span>
    </div>
  );
}

export function IconButton({ children, onClick, title, active, className }: { children: ReactNode; onClick?: () => void; title?: string; active?: boolean; className?: string }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 min-w-8 items-center justify-center gap-1.5 rounded-lg border border-line bg-surface px-2 text-xs font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink",
        active && "border-accent/40 bg-accent-soft text-accent hover:bg-accent-soft hover:text-accent",
        className
      )}
    >
      {children}
    </button>
  );
}

export function Popover({ trigger, children, align = "right", width = 280 }: { trigger: (open: boolean, toggle: () => void) => ReactNode; children: (close: () => void) => ReactNode; align?: "left" | "right"; width?: number }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", h);
    document.addEventListener("keydown", k);
    return () => {
      document.removeEventListener("mousedown", h);
      document.removeEventListener("keydown", k);
    };
  }, [open]);
  return (
    <div className="relative" ref={ref}>
      {trigger(open, () => setOpen((o) => !o))}
      {open && (
        <div
          style={{ width }}
          className={cn(
            "absolute top-full z-50 mt-1.5 rounded-xl border border-line bg-surface p-1.5 shadow-xl shadow-black/10",
            align === "right" ? "right-0" : "left-0"
          )}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

export function MenuItem({ children, onClick, active, right }: { children: ReactNode; onClick: () => void; active?: boolean; right?: ReactNode }) {
  return (
    <button onClick={onClick} className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] text-ink hover:bg-surface-2">
      <span className="truncate">{children}</span>
      {right ?? (active && <Check size={14} className="text-accent" />)}
    </button>
  );
}

export function SelectBox<T extends string | number>({ value, onChange, options, className }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; className?: string }) {
  return (
    <div className={cn("relative", className)}>
      <select
        value={String(value)}
        onChange={(e) => {
          const raw = e.target.value;
          const match = options.find((o) => String(o.value) === raw)!;
          onChange(match.value);
        }}
        className="h-8 w-full appearance-none rounded-lg border border-line bg-surface pl-2.5 pr-7 text-xs font-medium text-ink outline-none hover:bg-surface-2 focus:border-accent"
      >
        {options.map((o) => (
          <option key={String(o.value)} value={String(o.value)}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown size={13} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-ink-3" />
    </div>
  );
}
