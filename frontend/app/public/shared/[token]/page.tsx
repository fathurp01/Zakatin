"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MiniBarChart } from "@/components/dashboard/MiniBarChart";

interface SharedDashboardResponse {
  data: {
    link: {
      scope: "RW" | "MASJID";
      created_at: string;
      expires_at: string | null;
    };
    payload: {
      scope: "RW" | "MASJID";
      year: number;
      entity: {
        id: string;
        nama_kompleks?: string;
        no_rw?: string;
        nama_masjid?: string;
        alamat?: string;
      };
      summary: Record<string, number>;
      series: Array<{
        month: number;
        paid_count: number;
        unpaid_count: number;
        kas_masuk: number;
        kas_keluar: number;
        kas_saldo: number;
        zis_uang_zakat: number;
        zis_uang_infaq: number;
      }>;
    };
  };
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
};

const formatDate = (value: string | null): string => {
  if (!value) {
    return "Tanpa batas waktu";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
};

export default function PublicSharedDashboardPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token;

  const [data, setData] = useState<SharedDashboardResponse["data"] | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const baseUrl = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api").replace(/\/$/, "");
        const response = await fetch(`${baseUrl}/public/shared/${encodeURIComponent(token)}`);

        if (!response.ok) {
          const payload = (await response.json()) as { message?: string };
          throw new Error(payload.message || "Gagal memuat data transparansi publik.");
        }

        const payload = (await response.json()) as SharedDashboardResponse;
        setData(payload.data);
      } catch (error) {
        setData(null);
        setErrorMessage(error instanceof Error ? error.message : "Gagal memuat data transparansi publik.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData().catch(() => undefined);
  }, [token]);

  const chartItems = useMemo(() => {
    if (!data) {
      return [];
    }

    return data.payload.series.map((item) => ({
      label: `Bulan ${item.month}`,
      value: item.kas_saldo,
      hint: formatCurrency(item.kas_saldo),
    }));
  }, [data]);

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-50 to-white dark:from-slate-950 dark:to-black px-4 py-10">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <header className="space-y-3 text-center">
          <div className="flex items-center justify-center gap-2">
            <Badge variant="success">Transparansi Publik</Badge>
            {data ? <Badge variant="outline">{data.link.scope}</Badge> : null}
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-foreground">
            Dashboard Transparansi
          </h1>
          <p className="text-base text-slate-500 dark:text-muted-foreground">
            Data agregat publik dari share-link tokenized.
          </p>
        </header>

        {isLoading ? (
          <Card>
            <CardContent className="py-12 text-center text-slate-500 dark:text-muted-foreground">
              Memuat data transparansi...
            </CardContent>
          </Card>
        ) : errorMessage ? (
          <Card>
            <CardContent className="py-12 text-center text-rose-600 dark:text-rose-400">
              {errorMessage}
            </CardContent>
          </Card>
        ) : data ? (
          <>
            <Card>
              <CardHeader className="border-b border-slate-100 dark:border-white/8 pb-4">
                <CardTitle>Informasi Share Link</CardTitle>
              </CardHeader>
              <CardContent className="pt-5 grid gap-3 text-sm text-slate-600 dark:text-muted-foreground sm:grid-cols-2">
                <p>Scope: <strong>{data.link.scope}</strong></p>
                <p>Tahun Data: <strong>{data.payload.year}</strong></p>
                <p>Dibuat: <strong>{formatDate(data.link.created_at)}</strong></p>
                <p>Kedaluwarsa: <strong>{formatDate(data.link.expires_at)}</strong></p>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {Object.entries(data.payload.summary).slice(0, 4).map(([key, value]) => (
                <Card key={key}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm capitalize">{key.replace(/_/g, " ")}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-2xl font-extrabold text-slate-900 dark:text-foreground">
                    {key.includes("kas") || key.includes("nominal") || key.includes("zakat") || key.includes("infaq")
                      ? formatCurrency(value)
                      : value}
                  </CardContent>
                </Card>
              ))}
            </div>

            <MiniBarChart
              title="Trend Saldo Kas"
              description="Saldo kas kumulatif berdasarkan agregat bulanan"
              items={chartItems}
            />
          </>
        ) : null}

        <div className="text-center">
          <Link href="/transparansi" className="text-sm font-semibold text-indigo-600 hover:underline underline-offset-4">
            Kembali ke halaman transparansi
          </Link>
        </div>
      </div>
    </div>
  );
}
