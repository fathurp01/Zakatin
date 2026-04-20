"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { HandCoins, Wheat, Wallet, TrendingUp } from "lucide-react";

interface DashboardZisPayload {
  masjid_id: string;
  total_beras: number;
  total_uang_zakat: number;
  total_infaq: number;
}

type Distribution = {
  fakir: number;
  amil: number;
  fisabilillah: number;
  lainnya: number;
};

const distributionLabels: { key: keyof Distribution; label: string; pct: string }[] = [
  { key: "fakir", label: "Fakir", pct: "62.5%" },
  { key: "amil", label: "Amil", pct: "8%" },
  { key: "fisabilillah", label: "Fisabilillah", pct: "11%" },
  { key: "lainnya", label: "Lainnya", pct: "18.5%" },
];

export default function ZisCards({
  dashboardData,
  fixedUangDistribution,
  fixedBerasDistribution,
  formatRupiah,
}: {
  dashboardData: DashboardZisPayload;
  fixedUangDistribution: Distribution;
  fixedBerasDistribution: Distribution;
  formatRupiah: (value: number) => string;
}) {
  const totalUangZakat = Number(dashboardData.total_uang_zakat || 0);
  const totalInfaq = Number(dashboardData.total_infaq || 0);
  const totalBeras = Number(dashboardData.total_beras || 0);

  const statCards = [
    {
      title: "Total Uang Zakat",
      value: formatRupiah(totalUangZakat),
      helper: "Akumulasi zakat uang yang terkumpul",
      icon: Wallet,
      gradient: "from-emerald-500 to-teal-600",
      iconBg: "bg-emerald-50 dark:bg-emerald-950/40",
      iconText: "text-emerald-600 dark:text-emerald-400",
      border: "border-emerald-200/50 dark:border-emerald-800/30",
      glow: "glow-masjid",
    },
    {
      title: "Total Infaq",
      value: formatRupiah(totalInfaq),
      helper: "Akumulasi infaq yang diterima",
      icon: HandCoins,
      gradient: "from-teal-500 to-cyan-600",
      iconBg: "bg-teal-50 dark:bg-teal-950/40",
      iconText: "text-teal-600 dark:text-teal-400",
      border: "border-teal-200/50 dark:border-teal-800/30",
      glow: "glow-masjid",
    },
    {
      title: "Total Beras",
      value: `${totalBeras.toFixed(2)} kg`,
      helper: "Akumulasi beras yang terkumpul",
      icon: Wheat,
      gradient: "from-amber-500 to-orange-500",
      iconBg: "bg-amber-50 dark:bg-amber-950/40",
      iconText: "text-amber-600 dark:text-amber-400",
      border: "border-amber-200/50 dark:border-amber-800/30",
      glow: "glow-pending",
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map(({ title, value, helper, icon: Icon, gradient, iconBg, iconText, border, glow }) => (
          <div
            key={title}
            className={cn(
              "group relative overflow-hidden rounded-3xl border bg-white dark:bg-card shadow-sm",
              "hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200",
              border
            )}
          >
            {/* Top accent bar */}
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${gradient} rounded-t-3xl`} />

            <div className="p-5 pt-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-muted-foreground mb-1">
                    {title}
                  </p>
                  <p className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-foreground truncate">
                    {value}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-muted-foreground mt-1.5">{helper}</p>
                </div>
                <span className={cn("inline-flex size-11 items-center justify-center rounded-2xl flex-shrink-0 shadow-sm", iconBg, iconText, glow)}>
                  <Icon className="size-5" />
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Distribusi Uang Zakat */}
      <Card>
        <CardHeader className="border-b border-slate-100 dark:border-white/8 pb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="size-4 text-emerald-500" />
            <CardTitle>Distribusi Uang Zakat</CardTitle>
          </div>
          <CardDescription>
            Formula tetap: Fakir 62.5% · Amil 8% · Fisabilillah 11% · Lainnya 18.5%
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {distributionLabels.map(({ key, label, pct }) => {
              const value = fixedUangDistribution[key];
              const percentage = parseFloat(pct);
              return (
                <div
                  key={key}
                  className="relative rounded-2xl border border-emerald-100 dark:border-emerald-800/30 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 overflow-hidden"
                >
                  {/* Progress bar bg */}
                  <div
                    className="absolute bottom-0 left-0 h-1 rounded-b-2xl bg-gradient-to-r from-emerald-500 to-teal-500 opacity-70"
                    style={{ width: `${percentage}%` }}
                  />
                  <p className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-0.5">
                    {label} <span className="text-emerald-400/70 font-medium">({pct})</span>
                  </p>
                  <p className="text-base font-extrabold tabular-nums text-slate-900 dark:text-foreground">
                    {formatRupiah(value)}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Distribusi Beras */}
      <Card>
        <CardHeader className="border-b border-slate-100 dark:border-white/8 pb-4">
          <div className="flex items-center gap-2">
            <Wheat className="size-4 text-amber-500" />
            <CardTitle>Distribusi Beras (kg)</CardTitle>
          </div>
          <CardDescription>Distribusi beras menggunakan formula tetap yang sama.</CardDescription>
        </CardHeader>
        <CardContent className="pt-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {distributionLabels.map(({ key, label, pct }) => {
              const value = fixedBerasDistribution[key];
              const percentage = parseFloat(pct);
              return (
                <div
                  key={key}
                  className="relative rounded-2xl border border-amber-100 dark:border-amber-800/30 bg-amber-50/50 dark:bg-amber-950/20 p-4 overflow-hidden"
                >
                  <div
                    className="absolute bottom-0 left-0 h-1 rounded-b-2xl bg-gradient-to-r from-amber-500 to-orange-500 opacity-70"
                    style={{ width: `${percentage}%` }}
                  />
                  <p className="text-xs font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-0.5">
                    {label} <span className="text-amber-400/70 font-medium">({pct})</span>
                  </p>
                  <p className="text-base font-extrabold tabular-nums text-slate-900 dark:text-foreground">
                    {value.toFixed(2)} kg
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
