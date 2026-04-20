"use client";

import { Suspense, lazy, useActionState, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { api, getApiError, type FieldErrors } from "@/lib/axios";
import { isUuid } from "@/lib/auth";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ZisCardsSkeleton } from "./ZisCardsSkeleton";
import { HandCoins, Search } from "lucide-react";

const ZisCards = lazy(() => import("./ZisCards"));

interface DashboardZisPayload {
  masjid_id: string;
  pengaturan_zis: {
    persen_fakir: number;
    persen_amil: number;
    persen_fisabilillah: number;
    persen_lainnya: number;
    harga_beras_per_kg: number | string;
  };
  total_beras: number;
  total_uang_zakat: number;
  total_infaq: number;
  distribusi_uang_zakat: {
    nominal: {
      fakir: number;
      amil: number;
      fisabilillah: number;
      lainnya: number;
    };
  };
  distribusi_beras_kg: {
    nominal_kg: {
      fakir: number;
      amil: number;
      fisabilillah: number;
      lainnya: number;
    };
  };
}

interface DashboardResponse {
  data: DashboardZisPayload;
}

interface FilterFormState {
  message: string;
  fieldErrors: FieldErrors;
}

const initialState: FilterFormState = {
  message: "",
  fieldErrors: {},
};

const fixedDistributionPercent = {
  fakir: 62.5,
  amil: 8,
  fisabilillah: 11,
  lainnya: 18.5,
};

const toFixed2 = (value: number): number => {
  return Math.round(value * 100) / 100;
};

const calculateFixedDistribution = (total: number) => {
  return {
    fakir: toFixed2((fixedDistributionPercent.fakir / 100) * total),
    amil: toFixed2((fixedDistributionPercent.amil / 100) * total),
    fisabilillah: toFixed2((fixedDistributionPercent.fisabilillah / 100) * total),
    lainnya: toFixed2((fixedDistributionPercent.lainnya / 100) * total),
  };
};

const formatRupiah = (value: number): string => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
};

export default function MasjidDashboardPage() {
  const { user } = useAuth();
  const defaultMasjidId = useMemo(() => user?.masjid_ids?.[0] ?? "", [user]);

  const [dashboardData, setDashboardData] = useState<DashboardZisPayload | null>(null);
  const [activeMasjidId, setActiveMasjidId] = useState<string>(defaultMasjidId);
  const [isLoadingData, setIsLoadingData] = useState(false);

  useEffect(() => {
    if (!defaultMasjidId || activeMasjidId) {
      return;
    }

    setActiveMasjidId(defaultMasjidId);
  }, [defaultMasjidId, activeMasjidId]);

  const fetchDashboard = async (masjidId: string) => {
    setIsLoadingData(true);

    try {
      const response = await api.get<DashboardResponse>("/zis/dashboard", {
        params: {
          masjid_id: masjidId,
        },
      });

      setDashboardData(response.data.data);
      setActiveMasjidId(response.data.data.masjid_id);
      toast.success("Dashboard ZIS berhasil dimuat.");
    } catch (error) {
      const apiError = getApiError(error);
      toast.error(apiError.message);
      setDashboardData(null);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    if (!activeMasjidId || dashboardData) {
      return;
    }

    fetchDashboard(activeMasjidId).catch(() => {
      toast.error("Gagal memuat dashboard ZIS.");
      setIsLoadingData(false);
    });
  }, [activeMasjidId, dashboardData]);

  const [filterState, filterAction, isSubmittingFilter] = useActionState<
    FilterFormState,
    FormData
  >(async (_previousState, formData) => {
    const masjidId = String(formData.get("masjid_id") ?? "").trim();
    const fieldErrors: FieldErrors = {};

    if (!masjidId) {
      fieldErrors.masjid_id = "masjid_id wajib diisi.";
    } else if (!isUuid(masjidId)) {
      fieldErrors.masjid_id = "masjid_id harus UUID valid.";
    }

    if (Object.keys(fieldErrors).length > 0) {
      return {
        message: "Periksa kembali input masjid_id.",
        fieldErrors,
      };
    }

    await fetchDashboard(masjidId);

    return {
      message: "",
      fieldErrors: {},
    };
  }, initialState);

  const fixedUangDistribution = dashboardData
    ? calculateFixedDistribution(Number(dashboardData.total_uang_zakat || 0))
    : null;
  const fixedBerasDistribution = dashboardData
    ? calculateFixedDistribution(Number(dashboardData.total_beras || 0))
    : null;

  return (
    <main className="flex flex-1 flex-col gap-6">
      {/* Page header */}
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm shadow-emerald-500/30">
            <HandCoins className="size-5" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-foreground">
              Dashboard ZIS Masjid
            </h1>
            <p className="text-sm text-slate-500 dark:text-muted-foreground">
              Ringkasan zakat, infaq, dan distribusi dana
            </p>
          </div>
        </div>
      </header>

      {/* Filter card */}
      <Card>
        <CardHeader className="border-b border-slate-100 dark:border-white/8 pb-4">
          <CardTitle className="flex items-center gap-2">
            <Search className="size-4 text-slate-400" />
            Filter Masjid
          </CardTitle>
          <CardDescription>Masukkan masjid_id (UUID) untuk memuat dashboard ZIS.</CardDescription>
        </CardHeader>
        <CardContent className="pt-5">
          <form action={filterAction} className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="masjid_id" className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-muted-foreground">
                Masjid ID (UUID)
              </Label>
              <Input
                id="masjid_id"
                name="masjid_id"
                defaultValue={activeMasjidId || defaultMasjidId}
                placeholder="550e8400-e29b-41d4-a716-446655440013"
                aria-invalid={Boolean(filterState.fieldErrors.masjid_id)}
                disabled={isSubmittingFilter || isLoadingData}
              />
              {filterState.fieldErrors.masjid_id ? (
                <p className="text-xs text-destructive">{filterState.fieldErrors.masjid_id}</p>
              ) : null}
            </div>

            <Button
              type="submit"
              disabled={isSubmittingFilter || isLoadingData}
              variant="masjid"
              size="default"
              className="w-full sm:w-auto whitespace-nowrap"
            >
              {isSubmittingFilter || isLoadingData ? "Memuat..." : "Muat Dashboard"}
            </Button>
          </form>

          {filterState.message ? (
            <p className="mt-3 text-sm text-destructive">{filterState.message}</p>
          ) : null}
        </CardContent>
      </Card>

      {/* Content */}
      {isLoadingData ? (
        <ZisCardsSkeleton />
      ) : !dashboardData ? (
        <Card>
          <CardHeader>
            <CardTitle>Belum Ada Data</CardTitle>
            <CardDescription>Masukkan masjid_id lalu klik Muat Dashboard untuk memulai.</CardDescription>
          </CardHeader>
        </Card>
      ) : fixedUangDistribution && fixedBerasDistribution ? (
        <Suspense fallback={<ZisCardsSkeleton />}>
          <ZisCards
            dashboardData={dashboardData}
            fixedUangDistribution={fixedUangDistribution}
            fixedBerasDistribution={fixedBerasDistribution}
            formatRupiah={formatRupiah}
          />
        </Suspense>
      ) : null}
    </main>
  );
}
