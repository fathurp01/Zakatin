"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { api, getApiError } from "@/lib/axios";
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { MiniBarChart } from "@/components/dashboard/MiniBarChart";
import { BarChart3, ChevronRight, Wallet, Users } from "lucide-react";

interface RwDashboardReportResponse {
  data: {
    scope: "RW";
    wilayah_rw: {
      id: string;
      nama_kompleks: string;
      no_rw: string;
    };
    periode: {
      tahun: number;
      bulan: number | null;
      label: string;
    };
    summary: {
      total_warga: number;
      total_iuran_lunas_count: number;
      total_iuran_belum_count: number;
      total_iuran_lunas_nominal: number;
      total_iuran_belum_nominal: number;
      total_kas_masuk: number;
      total_kas_keluar: number;
      saldo_kas: number;
    };
    series: Array<{
      bulan: number;
      label: string;
      iuran_lunas_count: number;
      iuran_belum_count: number;
      kas_masuk: number;
      kas_keluar: number;
      kas_saldo: number;
    }>;
  };
}

const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 5 }, (_, index) => currentYear - index);

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
};

export default function DashboardRwIndexPage() {
  const { user } = useAuth();
  const wilayahRwId = useMemo(() => user?.wilayah_rw_id ?? "", [user]);

  const [tahun, setTahun] = useState(String(currentYear));
  const [report, setReport] = useState<RwDashboardReportResponse["data"] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadOverview = useCallback(async () => {
    if (!wilayahRwId) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.get<RwDashboardReportResponse>("/rw/report", {
        params: {
          wilayah_rw_id: wilayahRwId,
          tahun: Number(tahun),
        },
      });

      setReport(response.data.data);
    } catch (error) {
      const apiError = getApiError(error);
      toast.error(apiError.message);
      setReport(null);
    } finally {
      setIsLoading(false);
    }
  }, [tahun, wilayahRwId]);

  useEffect(() => {
    if (wilayahRwId) {
      loadOverview().catch(() => undefined);
    }
  }, [loadOverview, wilayahRwId]);

  const chartItems = report
    ? report.series.map((item) => ({
        label: item.label,
        value: item.kas_saldo,
        hint: formatCurrency(item.kas_saldo),
      }))
    : [];

  return (
    <main className="flex flex-1 flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="rw">Dashboard RW</Badge>
            <span className="text-sm text-slate-500 dark:text-muted-foreground">Ringkasan iuran dan kas berjalan</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-foreground">
            Overview RW
          </h1>
          <p className="text-base text-slate-500 dark:text-muted-foreground">
            Lihat performa iuran warga dan saldo kas per bulan.
          </p>
        </div>
        <div className="inline-flex gap-2">
          <Link href="/dashboard/rw/warga">
            <Button variant="outline" className="gap-2">
              <Users className="size-4" />
              Iuran Warga
            </Button>
          </Link>
          <Link href="/dashboard/rw/kas">
            <Button variant="rw" className="gap-2">
              <Wallet className="size-4" />
              Buku Kas
            </Button>
          </Link>
        </div>
      </header>

      <Card>
        <CardHeader className="border-b border-slate-100 dark:border-white/8 pb-4">
          <CardTitle>Filter Tahun</CardTitle>
        </CardHeader>
        <CardContent className="pt-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="tahun">Tahun</Label>
              <select
                id="tahun"
                value={tahun}
                onChange={(event) => setTahun(event.target.value)}
                className="h-11 w-full rounded-xl border border-input bg-white px-3 text-sm"
                disabled={isLoading}
              >
                {yearOptions.map((item) => (
                  <option key={item} value={String(item)}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button variant="rw" className="w-full gap-2" onClick={() => loadOverview()} disabled={isLoading}>
                <BarChart3 className="size-4" />
                Tampilkan
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {report ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader className="pb-3"><CardTitle>Total Warga</CardTitle></CardHeader>
              <CardContent className="text-3xl font-extrabold text-slate-900 dark:text-foreground">{report.summary.total_warga}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3"><CardTitle>Iuran Lunas</CardTitle></CardHeader>
              <CardContent className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-300">{report.summary.total_iuran_lunas_count}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3"><CardTitle>Iuran Belum</CardTitle></CardHeader>
              <CardContent className="text-3xl font-extrabold text-amber-600 dark:text-amber-300">{report.summary.total_iuran_belum_count}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3"><CardTitle>Saldo Kas</CardTitle></CardHeader>
              <CardContent className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-300">{formatCurrency(report.summary.saldo_kas)}</CardContent>
            </Card>
          </div>

          <MiniBarChart
            title="Trend Saldo Kas"
            description="Saldo kumulatif kas RW per bulan."
            items={chartItems}
          />

          <div className="rounded-2xl border border-indigo-200 dark:border-indigo-800/35 bg-indigo-50 dark:bg-indigo-950/20 px-4 py-3 text-sm text-indigo-800 dark:text-indigo-200">
            <div className="flex items-center gap-1 font-semibold">
              Lanjutkan ke halaman detail laporan untuk ekspor PDF/XLSX
              <ChevronRight className="size-4" />
              <Link href="/dashboard/rw/reports" className="underline underline-offset-4">Buka Laporan RW</Link>
            </div>
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="py-10 text-center text-slate-500 dark:text-muted-foreground">
            {isLoading ? "Memuat overview..." : "Data overview belum tersedia."}
          </CardContent>
        </Card>
      )}
    </main>
  );
}
