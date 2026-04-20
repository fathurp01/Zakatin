"use client";

import { useActionState, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { api, getApiError, type FieldErrors } from "@/lib/axios";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, ChevronRight, MapPin, Calendar } from "lucide-react";
import { Suspense, lazy } from "react";
import { IuranGridSkeleton } from "./IuranGridSkeleton";
import Link from "next/link";
import { Plus } from "lucide-react";

const IuranGrid = lazy(() => import("./IuranGrid"));
const IuranSpreadsheet = lazy(() => import("./IuranSpreadsheet"));

interface IuranItem {
  id: string | null;
  bulan: number;
  tahun: number;
  nominal: number | string;
  status: "BELUM" | "LUNAS";
  kode_unik: string | null;
  tanggal_bayar: string | null;
}

interface WargaItem {
  id: string;
  nama_kk: string;
  tarif_iuran_bulanan: number | string;
  iuran: IuranItem[];
}

interface WargaResponse {
  data: {
    blok_wilayah_id: string;
    tahun: number;
    bulan: number | null;
    status: "BELUM" | "LUNAS" | null;
    warga: WargaItem[];
  };
}

interface BlokItem {
  id: string;
  nama_blok: string;
  no_rt: string | null;
}

interface BlokResponse {
  data: {
    blok_list: BlokItem[];
  };
}

interface FilterFormState {
  message: string;
  fieldErrors: FieldErrors;
}

const initialState: FilterFormState = { message: "", fieldErrors: {} };

export const formatRupiah = (value: number | string): string => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return "Rp0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(numericValue);
};

const currentYear = new Date().getFullYear();
const tahunOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);
const bulanOptions = [
  { value: "", label: "Semua Bulan" },
  { value: "1", label: "Januari" },
  { value: "2", label: "Februari" },
  { value: "3", label: "Maret" },
  { value: "4", label: "April" },
  { value: "5", label: "Mei" },
  { value: "6", label: "Juni" },
  { value: "7", label: "Juli" },
  { value: "8", label: "Agustus" },
  { value: "9", label: "September" },
  { value: "10", label: "Oktober" },
  { value: "11", label: "November" },
  { value: "12", label: "Desember" },
];

export default function RwWargaDashboardPage() {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<"spreadsheet" | "card">("spreadsheet");
  const [residents, setResidents] = useState<WargaItem[]>([]);
  const [tahunAktif, setTahunAktif] = useState<number>(currentYear);
  const [bulanAktif, setBulanAktif] = useState<number | null>(null);
  const [statusAktif, setStatusAktif] = useState<"BELUM" | "LUNAS" | null>(null);
  const [blokWilayahAktif, setBlokWilayahAktif] = useState<string>("");
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [blokList, setBlokList] = useState<BlokItem[]>([]);
  const [isLoadingBlok, setIsLoadingBlok] = useState(false);
  const [selectedBlokId, setSelectedBlokId] = useState("");
  const [selectedBulan, setSelectedBulan] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");

  // Load daftar blok wilayah
  useEffect(() => {
    if (!user) return;
    setIsLoadingBlok(true);
    api.get<BlokResponse>("/rw/blok-wilayah")
      .then((res) => {
        setBlokList(res.data.data.blok_list ?? []);
      })
      .catch(() => {
        toast.error("Gagal memuat daftar blok wilayah.");
      })
      .finally(() => setIsLoadingBlok(false));
  }, [user]);

  const fetchResidents = useCallback(async (
    blokWilayahId: string,
    tahun: number,
    bulan?: number,
    status?: "BELUM" | "LUNAS"
  ) => {
    setIsLoadingData(true);
    try {
      const response = await api.get<WargaResponse>("/rw/iuran-warga", {
        params: {
          blok_wilayah_id: blokWilayahId,
          tahun,
          ...(bulan ? { bulan } : {}),
          ...(status ? { status } : {}),
        },
      });
      const payload = response.data.data;
      setResidents(payload.warga ?? []);
      setBlokWilayahAktif(payload.blok_wilayah_id);
      setTahunAktif(payload.tahun);
      setBulanAktif(payload.bulan);
      setStatusAktif(payload.status);
    } catch (error) {
      const apiError = getApiError(error);
      toast.error(apiError.message);
      setResidents([]);
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  const [filterState, filterAction, isSubmittingFilter] = useActionState<FilterFormState, FormData>(
    async (_previousState, formData) => {
      const blokId = String(formData.get("blok_wilayah_id") ?? "").trim();
      const tahunInput = Number(String(formData.get("tahun") ?? "").trim() || currentYear);
      const bulanInputRaw = String(formData.get("bulan") ?? "").trim();
      const statusInputRaw = String(formData.get("status") ?? "").trim();
      const bulanInput = bulanInputRaw ? Number(bulanInputRaw) : undefined;
      const statusInput =
        statusInputRaw === "BELUM" || statusInputRaw === "LUNAS"
          ? statusInputRaw
          : undefined;

      const fieldErrors: FieldErrors = {};
      if (!blokId) {
        fieldErrors.blok_wilayah_id = "Pilih dulu nama blok wilayahnya ya 😊";
      }
      if (!Number.isInteger(tahunInput) || tahunInput < 2000 || tahunInput > 3000) {
        fieldErrors.tahun = "Tahun yang dipilih tidak valid.";
      }
      if (
        bulanInput !== undefined &&
        (!Number.isInteger(bulanInput) || bulanInput < 1 || bulanInput > 12)
      ) {
        fieldErrors.bulan = "Bulan yang dipilih tidak valid.";
      }
      if (Object.keys(fieldErrors).length > 0) {
        return { message: "Ada yang perlu diperbaiki dulu nih.", fieldErrors };
      }

      await fetchResidents(blokId, tahunInput, bulanInput, statusInput);
      return { message: "", fieldErrors: {} };
    },
    initialState
  );

  const handleBayarIuran = async (iuranId: string, nominal: number) => {
    try {
      await api.patch("/rw/bayar-iuran", { iuran_id: iuranId });
      toast.success(`Pembayaran berhasil dicatat (${formatRupiah(nominal)}) ✅`);
      if (blokWilayahAktif) {
        await fetchResidents(
          blokWilayahAktif,
          tahunAktif,
          bulanAktif ?? undefined,
          statusAktif ?? undefined
        );
      }
    } catch (error) {
      const apiError = getApiError(error);
      toast.error(apiError.message);
    }
  };

  const handleUpdateWarga = async (
    wargaId: string,
    payload: { nama_kk?: string; tarif_iuran_bulanan?: number }
  ) => {
    try {
      await api.patch(`/rw/warga/${wargaId}`, payload);
      toast.success("Data warga berhasil diperbarui.");
      if (blokWilayahAktif) {
        await fetchResidents(
          blokWilayahAktif,
          tahunAktif,
          bulanAktif ?? undefined,
          statusAktif ?? undefined
        );
      }
    } catch (error) {
      const apiError = getApiError(error);
      toast.error(apiError.message);
    }
  };

  const handleDeleteWarga = async (wargaId: string) => {
    try {
      await api.delete(`/rw/warga/${wargaId}`);
      toast.success("Warga berhasil dinonaktifkan.");
      if (blokWilayahAktif) {
        await fetchResidents(
          blokWilayahAktif,
          tahunAktif,
          bulanAktif ?? undefined,
          statusAktif ?? undefined
        );
      }
    } catch (error) {
      const apiError = getApiError(error);
      toast.error(apiError.message);
    }
  };

  const disabled = isSubmittingFilter || isLoadingData || isLoadingBlok;

  const selectedBlokLabel = useMemo(() => {
    const found = blokList.find((b) => b.id === blokWilayahAktif);
    if (!found) return "";
    return found.no_rt ? `${found.nama_blok} (RT ${found.no_rt})` : found.nama_blok;
  }, [blokList, blokWilayahAktif]);

  return (
    <main className="flex flex-1 flex-col gap-6">
      {/* Page Header */}
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-linear-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/30">
            <Users className="size-6" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-foreground">
              Iuran Warga
            </h1>
            <p className="text-base text-slate-500 dark:text-muted-foreground">
              Catat dan pantau pembayaran iuran per blok
            </p>
          </div>
        </div>
        <Link href="/dashboard/rw/warga/add">
          <Button variant="rw" size="lg" className="gap-2 shadow-md shadow-indigo-500/20">
            <Plus className="size-5" />
            <span className="hidden sm:inline">Tambah Warga</span>
            <span className="sm:hidden">Tambah</span>
          </Button>
        </Link>
      </header>

      {/* Filter — TIDAK ADA UUID! */}
      <Card className="border-2">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MapPin className="size-5 text-indigo-500" />
            Pilih Blok &amp; Tahun
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form action={filterAction} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
            {/* Dropdown blok — nama bukan UUID */}
            <div className="flex-1 space-y-2">
              <Label htmlFor="blok_wilayah_id" className="text-base font-bold text-slate-700 dark:text-foreground">
                Nama Blok Wilayah
              </Label>
              <select
                id="blok_wilayah_id"
                name="blok_wilayah_id"
                value={selectedBlokId}
                onChange={(e) => setSelectedBlokId(e.target.value)}
                disabled={disabled}
                className="w-full h-12 rounded-xl border-2 border-input bg-white dark:bg-input/20 dark:border-white/10 px-3.5 text-base text-foreground font-medium outline-none transition-all duration-200 focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/25 disabled:opacity-50 cursor-pointer"
              >
                <option value="">-- Pilih Blok --</option>
                {blokList.map((blok) => (
                  <option key={blok.id} value={blok.id}>
                    {blok.nama_blok}{blok.no_rt ? ` (RT ${blok.no_rt})` : ""}
                  </option>
                ))}
              </select>
              {filterState.fieldErrors.blok_wilayah_id ? (
                <p className="text-base font-medium text-destructive">{filterState.fieldErrors.blok_wilayah_id}</p>
              ) : null}
            </div>

            {/* Pilih Tahun */}
            <div className="space-y-2">
              <Label htmlFor="tahun" className="text-base font-bold text-slate-700 dark:text-foreground">
                <Calendar className="size-4 inline mr-1" />
                Tahun
              </Label>
              <select
                id="tahun"
                name="tahun"
                defaultValue={String(currentYear)}
                disabled={disabled}
                className="w-full h-12 rounded-xl border-2 border-input bg-white dark:bg-input/20 dark:border-white/10 px-3.5 text-base text-foreground font-medium outline-none transition-all duration-200 focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/25 disabled:opacity-50 cursor-pointer"
              >
                {tahunOptions.map((y) => (
                  <option key={y} value={String(y)}>{y}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bulan" className="text-base font-bold text-slate-700 dark:text-foreground">
                Bulan
              </Label>
              <select
                id="bulan"
                name="bulan"
                value={selectedBulan}
                onChange={(event) => setSelectedBulan(event.target.value)}
                disabled={disabled}
                className="w-full h-12 rounded-xl border-2 border-input bg-white dark:bg-input/20 dark:border-white/10 px-3.5 text-base text-foreground font-medium outline-none transition-all duration-200 focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/25 disabled:opacity-50 cursor-pointer"
              >
                {bulanOptions.map((option) => (
                  <option key={option.value || "all"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {filterState.fieldErrors.bulan ? (
                <p className="text-base font-medium text-destructive">{filterState.fieldErrors.bulan}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="status" className="text-base font-bold text-slate-700 dark:text-foreground">
                Status
              </Label>
              <select
                id="status"
                name="status"
                value={selectedStatus}
                onChange={(event) => setSelectedStatus(event.target.value)}
                disabled={disabled}
                className="w-full h-12 rounded-xl border-2 border-input bg-white dark:bg-input/20 dark:border-white/10 px-3.5 text-base text-foreground font-medium outline-none transition-all duration-200 focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/25 disabled:opacity-50 cursor-pointer"
              >
                <option value="">Semua Status</option>
                <option value="BELUM">Belum Bayar</option>
                <option value="LUNAS">Sudah Lunas</option>
              </select>
            </div>

            <Button
              type="submit"
              disabled={disabled}
              variant="rw"
              size="lg"
              className="w-full gap-2 shadow-md shadow-indigo-500/20"
            >
              <ChevronRight className="size-5" />
              {disabled ? "Memuat..." : "Tampilkan Data"}
            </Button>
          </form>

          {filterState.message ? (
            <p className="mt-3 text-base font-medium text-destructive">{filterState.message}</p>
          ) : null}
        </CardContent>
      </Card>

      {/* Keterangan blok aktif */}
      {selectedBlokLabel && residents.length > 0 && (
        <div className="flex items-center gap-2 rounded-2xl border-2 border-indigo-200 bg-indigo-50 px-4 py-3 dark:border-indigo-800/40 dark:bg-indigo-950/20">
          <MapPin className="size-4 shrink-0 text-indigo-500" />
          <p className="text-base font-semibold text-indigo-800 dark:text-indigo-300">
            Menampilkan data: <span className="font-extrabold">{selectedBlokLabel}</span> — Tahun {tahunAktif}
            {bulanAktif ? ` • Bulan ${bulanAktif}` : " • Semua Bulan"}
            {statusAktif ? ` • ${statusAktif}` : " • Semua Status"}
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-card p-3">
        <p className="text-sm font-semibold text-slate-600 dark:text-muted-foreground">
          Mode tampilan data iuran warga
        </p>
        <div className="inline-flex gap-2">
          <Button
            type="button"
            variant={viewMode === "spreadsheet" ? "rw" : "outline"}
            size="sm"
            onClick={() => setViewMode("spreadsheet")}
          >
            Spreadsheet
          </Button>
          <Button
            type="button"
            variant={viewMode === "card" ? "rw" : "outline"}
            size="sm"
            onClick={() => setViewMode("card")}
          >
            Kartu
          </Button>
        </div>
      </div>

      {/* Grid iuran */}
      <Suspense fallback={<IuranGridSkeleton />}>
        {isLoadingData ? (
          <IuranGridSkeleton />
        ) : (
          viewMode === "spreadsheet" ? (
            <IuranSpreadsheet
              residents={residents}
              formatRupiah={formatRupiah}
              onPay={handleBayarIuran}
              onUpdateResident={handleUpdateWarga}
              onDeleteResident={handleDeleteWarga}
            />
          ) : (
            <IuranGrid
              residents={residents}
              formatRupiah={formatRupiah}
              onPay={handleBayarIuran}
              onUpdateResident={handleUpdateWarga}
              onDeleteResident={handleDeleteWarga}
            />
          )
        )}
      </Suspense>
    </main>
  );
}
