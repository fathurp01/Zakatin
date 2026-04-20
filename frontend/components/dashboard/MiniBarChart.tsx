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
  const safeItems = items.filter((item) => Number.isFinite(item.value));

  if (safeItems.length === 0) {
    return (
      <div className="rounded-3xl border-2 border-slate-200 dark:border-white/10 bg-white dark:bg-card shadow-md p-5">
        <div className="mb-2">
          <h3 className="text-lg font-extrabold text-slate-900 dark:text-foreground">{title}</h3>
          {description ? (
            <p className="text-sm text-slate-500 dark:text-muted-foreground">{description}</p>
          ) : null}
        </div>
        <p className="text-sm text-slate-500 dark:text-muted-foreground">
          Belum ada data transaksi pada periode ini.
        </p>
      </div>
    );
  }

  const values = safeItems.map((item) => item.value);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const rawRange = rawMax - rawMin;
  const padding = rawRange === 0 ? Math.max(1, Math.abs(rawMax) * 0.15) : rawRange * 0.15;
  const chartMin = rawMin - padding;
  const chartMax = rawMax + padding;
  const safeRange = chartMax - chartMin || 1;

  const chartHeight = 220;
  const chartWidth = 960;
  const padTop = 14;
  const padRight = 12;
  const padBottom = 42;
  const padLeft = 14;

  const plotWidth = chartWidth - padLeft - padRight;
  const plotHeight = chartHeight - padTop - padBottom;
  const stepX = safeItems.length > 1 ? plotWidth / (safeItems.length - 1) : 0;

  const toX = (index: number) => padLeft + index * stepX;
  const toY = (value: number) => {
    const ratio = (value - chartMin) / safeRange;
    return padTop + (1 - ratio) * plotHeight;
  };

  const points = safeItems.map((item, index) => ({
    ...item,
    x: toX(index),
    y: toY(item.value),
  }));

  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");

  const baselineY = toY(chartMin);
  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(2)} ${baselineY.toFixed(2)} L ${points[0].x.toFixed(2)} ${baselineY.toFixed(2)} Z`;

  const tickCount = 4;
  const ticks = Array.from({ length: tickCount + 1 }, (_, index) => {
    const ratio = index / tickCount;
    const value = chartMax - ratio * safeRange;
    const y = padTop + ratio * plotHeight;
    return { y, value };
  });

  const formatAxisValue = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  };

  return (
    <div className="rounded-3xl border-2 border-slate-200 dark:border-white/10 bg-white dark:bg-card shadow-md p-5">
      <div className="mb-4">
        <h3 className="text-lg font-extrabold text-slate-900 dark:text-foreground">{title}</h3>
        {description ? (
          <p className="text-sm text-slate-500 dark:text-muted-foreground">{description}</p>
        ) : null}
      </div>

      <div className="space-y-4">
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/70 dark:border-white/10 bg-slate-50/80 dark:bg-slate-950/30 p-3">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="h-60 w-full"
            role="img"
            aria-label={title}
          >
            {ticks.map((tick) => (
              <g key={tick.y}>
                <line
                  x1={padLeft}
                  y1={tick.y}
                  x2={chartWidth - padRight}
                  y2={tick.y}
                  stroke="currentColor"
                  className="text-slate-200/80 dark:text-white/10"
                  strokeWidth="1"
                />
                <text
                  x={padLeft + 4}
                  y={tick.y - 4}
                  className="fill-slate-400 dark:fill-slate-500"
                  fontSize="18"
                >
                  {formatAxisValue(tick.value)}
                </text>
              </g>
            ))}

            <path d={areaPath} className="fill-emerald-400/20 dark:fill-emerald-400/15" />
            <path
              d={linePath}
              className="fill-none stroke-emerald-600 dark:stroke-emerald-400"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {points.map((point) => (
              <g key={point.label}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="6"
                  className={cn(
                    "stroke-3",
                    point.value >= 0
                      ? "fill-emerald-500 stroke-emerald-100 dark:fill-emerald-400 dark:stroke-slate-950"
                      : "fill-rose-500 stroke-rose-100 dark:fill-rose-400 dark:stroke-slate-950"
                  )}
                >
                  <title>{`${point.label}: ${point.hint ?? String(point.value)}`}</title>
                </circle>
              </g>
            ))}
          </svg>

          <div className="mt-2 grid grid-cols-2 gap-y-1 text-[11px] font-semibold text-slate-500 dark:text-muted-foreground sm:grid-cols-4 lg:grid-cols-6">
            {safeItems.map((item) => (
              <span key={item.label} className="truncate" title={`${item.label}: ${item.hint ?? String(item.value)}`}>
                {item.label}
              </span>
            ))}
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {safeItems.map((item) => (
            <div
              key={`${item.label}-value`}
              className="rounded-xl border border-slate-200/70 dark:border-white/10 bg-white/80 dark:bg-card/70 px-3 py-2"
            >
              <p className="text-xs text-slate-500 dark:text-muted-foreground truncate">{item.label}</p>
              <p className="text-sm font-bold text-slate-900 dark:text-foreground">{item.hint ?? String(item.value)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}