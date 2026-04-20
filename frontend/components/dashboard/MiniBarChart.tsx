"use client";

import { cn } from "@/lib/utils";

export interface MiniBarChartItem {
  label: string;
  value: number;
  hint?: string;
}

export function MiniBarChart({
  title,
  description,
  items,
}: {
  title: string;
  description?: string;
  items: MiniBarChartItem[];
}) {
  const maxAbs = Math.max(1, ...items.map((item) => Math.abs(item.value)));

  return (
    <div className="rounded-3xl border-2 border-slate-200 dark:border-white/10 bg-white dark:bg-card shadow-md p-5">
      <div className="mb-4">
        <h3 className="text-lg font-extrabold text-slate-900 dark:text-foreground">{title}</h3>
        {description ? (
          <p className="text-sm text-slate-500 dark:text-muted-foreground">{description}</p>
        ) : null}
      </div>

      <div className="space-y-3">
        {items.map((item) => {
          const width = `${(Math.abs(item.value) / maxAbs) * 100}%`;
          const positive = item.value >= 0;

          return (
            <div key={item.label} className="space-y-1.5">
              <div className="flex items-center justify-between gap-3 text-xs font-semibold text-slate-500 dark:text-muted-foreground">
                <span className="truncate">{item.label}</span>
                <span>{item.hint ?? String(item.value)}</span>
              </div>
              <div className="h-3 rounded-full bg-slate-100 dark:bg-white/5 overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-300",
                    positive
                      ? "bg-linear-to-r from-emerald-500 to-teal-500"
                      : "bg-linear-to-r from-rose-500 to-orange-500"
                  )}
                  style={{ width }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}