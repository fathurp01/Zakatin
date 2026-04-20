"use client";

import { useActionState, useState } from "react";
import { toast } from "sonner";
import { api, getApiError, type FieldErrors } from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Search, Globe, Receipt, CheckCircle2, Building2 } from "lucide-react";
import Link from "next/link";

interface ReceiptPayload {
  sumber: "iuran_warga" | "kas_rw" | "transaksi_zis";
  detail: Record<string, unknown>;
}

interface ReceiptResponse {
  data: ReceiptPayload;
}

interface FormState {
  message: string;
  fieldErrors: FieldErrors;
  receipt: ReceiptPayload | null;
}

const initialState: FormState = {
  message: "",
  fieldErrors: {},
  receipt: null,
};

const formatDateTime = (value: unknown): string => {
  if (typeof value !== "string") {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
};

const formatCurrency = (value: unknown): string => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return "-";
  }

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(numeric);
};

const safeText = (value: unknown): string => {
  if (value === null || value === undefined) {
    return "-";
  }

  return String(value);
};

const sumberLabels: Record<ReceiptPayload["sumber"], { label: string; variant: "rw" | "masjid" }> = {
  iuran_warga: { label: "Iuran Warga RW", variant: "rw" },
  kas_rw: { label: "Kas RW", variant: "rw" },
  transaksi_zis: { label: "Transaksi ZIS Masjid", variant: "masjid" },
};

export default function TransparansiPage() {
  const [scope, setScope] = useState<"RW" | "MASJID">("RW");

  const [formState, formAction, isSubmitting] = useActionState<FormState, FormData>(
    async (_previousState, formData) => {
      const kodeUnik = String(formData.get("kode_unik") ?? "").trim();
      const selectedScope = String(formData.get("scope") ?? "RW").trim();

      const fieldErrors: FieldErrors = {};

      if (!kodeUnik) {
        fieldErrors.kode_unik = "Kode unik wajib diisi.";
      }

      if (selectedScope !== "RW" && selectedScope !== "MASJID") {
        fieldErrors.scope = "Scope tidak valid.";
      }

      if (Object.keys(fieldErrors).length > 0) {
        return {
          message: "Periksa kembali input transparansi.",
          fieldErrors,
          receipt: null,
        };
      }

      try {
        const response = await api.get<ReceiptResponse>(`/public/cek-kode/${encodeURIComponent(kodeUnik)}`, {
          params: {
            scope: selectedScope,
          },
        });

        toast.success("Data transaksi ditemukan.");

        return {
          message: "",
          fieldErrors: {},
          receipt: response.data.data,
        };
      } catch (error) {
        const apiError = getApiError(error);
        toast.error(apiError.message);

        return {
          message: apiError.message,
          fieldErrors: apiError.fieldErrors,
          receipt: null,
        };
      }
    },
    initialState
  );

  const receipt = formState.receipt;

  const selectClass = "h-10 w-full rounded-xl border border-input bg-white dark:bg-input/20 dark:border-white/10 px-3.5 py-2.5 text-sm text-foreground outline-none transition-all duration-200 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25 disabled:opacity-50";

  return (
    <div className="flex flex-col min-h-screen hero-gradient">
      {/* Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200/60 dark:border-white/8 bg-white/80 dark:bg-card/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <span className="inline-flex size-8 items-center justify-center rounded-xl bg-linear-to-br from-indigo-500 to-violet-600 text-white shadow-sm group-hover:shadow-md transition-all duration-200">
              <Building2 className="size-4" />
            </span>
            <span className="font-bold tracking-tight text-slate-900 dark:text-foreground">RWManage</span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Badge variant="masjid" className="gap-1.5">
              <Globe className="size-3" />
              Portal Publik
            </Badge>
          </div>
        </div>
      </header>

      {/* Decorative blobs */}
      <div aria-hidden className="pointer-events-none fixed -top-40 -left-40 size-125 rounded-full bg-indigo-400/8 blur-3xl" />
      <div aria-hidden className="pointer-events-none fixed -bottom-40 -right-40 size-100 rounded-full bg-emerald-400/8 blur-3xl" />

      <main className="relative flex flex-1 justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-2xl flex flex-col gap-6 animate-fade-in">
          {/* Page header */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/60 dark:border-emerald-800/40 bg-emerald-50 dark:bg-emerald-950/40 px-4 py-2 mb-4">
              <Globe className="size-4 text-emerald-500" />
              <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Bisa diakses siapa saja — Tanpa Login</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-foreground sm:text-4xl">
              Cek Bukti Transaksi
            </h1>
            <p className="mt-3 text-base text-slate-500 dark:text-muted-foreground">
              Masukkan nomor resi Anda untuk melihat kwitansi resmi.
            </p>
          </div>

          {/* Search card */}
          <div className="rounded-3xl border-2 border-slate-200 dark:border-white/10 bg-white dark:bg-card shadow-lg p-6 sm:p-8">
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-foreground mb-5">
              🔍 Masukkan Nomor Resi Anda
            </h2>

            <form action={formAction} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="kode_unik" className="text-base font-bold text-slate-700 dark:text-foreground">
                  Nomor Resi / Kode Bukti
                </Label>
                <Input
                  id="kode_unik"
                  name="kode_unik"
                  placeholder="Contoh: IUR-2026-01 atau ZIS-2026-01"
                  aria-invalid={Boolean(formState.fieldErrors.kode_unik)}
                  disabled={isSubmitting}
                  className="h-14 text-base rounded-2xl border-2 font-mono"
                  autoCapitalize="characters"
                />
                {formState.fieldErrors.kode_unik ? (
                  <p className="text-base text-destructive font-medium">{formState.fieldErrors.kode_unik}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="scope" className="text-base font-bold text-slate-700 dark:text-foreground">
                  Jenis Transaksi
                </Label>
                <select
                  id="scope"
                  name="scope"
                  value={scope}
                  onChange={(event) => setScope(event.target.value as "RW" | "MASJID")}
                  className="w-full h-14 rounded-2xl border-2 border-input bg-white dark:bg-input/20 dark:border-white/10 px-4 text-base font-medium text-foreground outline-none transition-all duration-200 focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/25 disabled:opacity-50 cursor-pointer"
                  disabled={isSubmitting}
                >
                  <option value="RW">🏠 RW — Iuran Warga / Kas RW</option>
                  <option value="MASJID">🕌 Masjid — Zakat, Infaq (ZIS)</option>
                </select>
              </div>

              {formState.message ? (
                <div className="rounded-2xl border-2 border-destructive/30 bg-destructive/8 px-5 py-4">
                  <p className="text-base font-medium text-destructive">⚠️ {formState.message}</p>
                </div>
              ) : null}

              <Button
                type="submit"
                variant={scope === "MASJID" ? "masjid" : "rw"}
                size="elder"
                className="w-full justify-center gap-3 shadow-lg"
                disabled={isSubmitting}
              >
                <Search className="size-6" />
                {isSubmitting ? "Sedang Mencari..." : "Cari Kwitansi Saya"}
              </Button>
            </form>
          </div>

          {/* Receipt result — styled like paper */}
          {receipt ? (
            <div className="rounded-3xl border-2 border-slate-300 dark:border-white/15 bg-white dark:bg-card shadow-xl overflow-hidden animate-fade-in">
              {/* Paper header */}
              <div className="bg-linear-to-r from-indigo-600 to-violet-600 px-6 py-5 text-white text-center">
                <div className="flex justify-center mb-2">
                  <Receipt className="size-8" />
                </div>
                <h2 className="text-xl font-extrabold">Kwitansi Resmi</h2>
                <p className="text-indigo-200 text-sm mt-1">RWManage — Sistem Manajemen Warga</p>
              </div>

              {/* Verified banner */}
              <div className="flex items-center gap-2 justify-center bg-emerald-50 dark:bg-emerald-950/40 border-b-2 border-emerald-200 dark:border-emerald-800/40 px-6 py-3">
                <CheckCircle2 className="size-5 text-emerald-600" />
                <span className="text-base font-bold text-emerald-700 dark:text-emerald-300">Data Terverifikasi &amp; Sah</span>
              </div>

              {/* Receipt body */}
              <div className="px-6 py-5">
                {receipt.sumber === "iuran_warga" ? (
                  <ReceiptList
                    items={[
                      ["Kode Unik", safeText(receipt.detail.kode_unik)],
                      ["Status", safeText(receipt.detail.status)],
                      ["Periode", `${safeText(receipt.detail.bulan)} / ${safeText(receipt.detail.tahun)}`],
                      ["Nominal", formatCurrency(receipt.detail.nominal)],
                      ["Tanggal Bayar", formatDateTime(receipt.detail.tanggal_bayar)],
                    ]}
                  />
                ) : null}

                {receipt.sumber === "kas_rw" ? (
                  <ReceiptList
                    items={[
                      ["Kode Unik", safeText(receipt.detail.kode_unik)],
                      ["Jenis Transaksi", safeText(receipt.detail.jenis_transaksi)],
                      ["Nominal", formatCurrency(receipt.detail.nominal)],
                      ["Tanggal", formatDateTime(receipt.detail.tanggal)],
                      ["Keterangan", safeText(receipt.detail.keterangan)],
                      ["Bukti URL", safeText(receipt.detail.bukti_url)],
                    ]}
                  />
                ) : null}

                {receipt.sumber === "transaksi_zis" ? (
                  <ReceiptList
                    items={[
                      ["Kode Unik", safeText(receipt.detail.kode_unik)],
                      ["Nama KK", safeText(receipt.detail.nama_kk)],
                      ["Alamat", safeText(receipt.detail.alamat_muzaqi)],
                      ["Jumlah Jiwa", safeText(receipt.detail.jumlah_jiwa)],
                      ["Jenis Bayar", safeText(receipt.detail.jenis_bayar)],
                      ["Nominal Zakat", formatCurrency(receipt.detail.nominal_zakat)],
                      ["Nominal Infaq", formatCurrency(receipt.detail.nominal_infaq)],
                      ["Beras (kg)", safeText(receipt.detail.total_beras_kg)],
                      ["Waktu", formatDateTime(receipt.detail.waktu_transaksi)],
                    ]}
                  />
                ) : null}
              </div>
            </div>
          ) : null}

          {/* Back link */}
          <div className="text-center pb-4">
            <Link href="/" className="text-sm text-slate-500 dark:text-muted-foreground hover:text-slate-700 dark:hover:text-foreground transition-colors">
              ← Kembali ke beranda
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

function ReceiptList({ items }: { items: [string, string][] }) {
  return (
    <div className="divide-y-2 divide-dashed divide-slate-200 dark:divide-white/10">
      {items.map(([label, value]) => (
        <div
          key={label}
          className="flex flex-col gap-1 py-4 sm:flex-row sm:items-baseline sm:gap-4"
        >
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-muted-foreground sm:w-36 sm:shrink-0">
            {label}
          </p>
          <p className="text-base font-bold text-slate-900 dark:text-foreground break-all">
            {value}
          </p>
        </div>
      ))}
    </div>
  );
}

