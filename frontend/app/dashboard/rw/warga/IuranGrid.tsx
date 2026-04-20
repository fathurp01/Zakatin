"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { FieldErrors } from "@/lib/axios";
import { CheckCircle2, CreditCard, Loader2 } from "lucide-react";

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

interface PaymentState {
  message: string;
  fieldErrors: FieldErrors;
}

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

export default function IuranGrid({
  residents,
  formatRupiah,
  onPay,
  onUpdateResident,
  onDeleteResident,
}: {
  residents: WargaItem[];
  formatRupiah: (value: number | string) => string;
  onPay: (iuranId: string, nominal: number) => Promise<void>;
  onUpdateResident: (
    wargaId: string,
    payload: { nama_kk?: string; tarif_iuran_bulanan?: number }
  ) => Promise<void>;
  onDeleteResident: (wargaId: string) => Promise<void>;
}) {
  if (residents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-300 dark:border-white/15 bg-white dark:bg-card py-20 px-6 text-center">
        <span className="text-6xl mb-4">🏘️</span>
        <p className="text-xl font-bold text-slate-700 dark:text-foreground">Belum ada data warga</p>
        <p className="text-base text-slate-500 dark:text-muted-foreground mt-2">
          Pilih blok wilayah dan tahun di atas, lalu klik &quot;Tampilkan Data&quot;
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 px-1">
        <span className="inline-block size-4 rounded-full bg-emerald-500" />
        <span className="text-base text-slate-600 dark:text-muted-foreground font-medium">Hijau = Sudah Lunas</span>
        <span className="ml-3 inline-block size-4 rounded-full bg-slate-200 dark:bg-slate-600" />
        <span className="text-base text-slate-600 dark:text-muted-foreground font-medium">Abu = Belum Bayar (klik untuk catat)</span>
      </div>

      {residents.map((resident) => (
        <WargaCard
          key={resident.id}
          resident={resident}
          formatRupiah={formatRupiah}
          onPay={onPay}
          onUpdateResident={onUpdateResident}
          onDeleteResident={onDeleteResident}
        />
      ))}
    </div>
  );
}

function WargaCard({
  resident,
  formatRupiah,
  onPay,
  onUpdateResident,
  onDeleteResident,
}: {
  resident: WargaItem;
  formatRupiah: (value: number | string) => string;
  onPay: (iuranId: string, nominal: number) => Promise<void>;
  onUpdateResident: (
    wargaId: string,
    payload: { nama_kk?: string; tarif_iuran_bulanan?: number }
  ) => Promise<void>;
  onDeleteResident: (wargaId: string) => Promise<void>;
}) {
  const lunas = resident.iuran.filter((i) => i.status === "LUNAS").length;
  const total = resident.iuran.length;
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [namaKkEdit, setNamaKkEdit] = useState(resident.nama_kk);
  const [tarifEdit, setTarifEdit] = useState(String(Number(resident.tarif_iuran_bulanan)));

  const handleSaveEdit = async () => {
    const namaTrimmed = namaKkEdit.trim();
    const tarifParsed = Number(tarifEdit);

    if (!namaTrimmed) {
      return;
    }

    if (!Number.isFinite(tarifParsed) || tarifParsed <= 0) {
      return;
    }

    setIsUpdating(true);
    try {
      await onUpdateResident(resident.id, {
        nama_kk: namaTrimmed,
        tarif_iuran_bulanan: tarifParsed,
      });
      setEditOpen(false);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await onDeleteResident(resident.id);
      setDeleteOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="rounded-3xl border-2 border-slate-200 dark:border-white/10 bg-white dark:bg-card shadow-md overflow-hidden">
      {/* Nama warga */}
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b-2 border-slate-100 dark:border-white/8">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 dark:bg-indigo-950/40 text-xl font-extrabold text-indigo-700 dark:text-indigo-300">
            {resident.nama_kk.charAt(0).toUpperCase()}
          </span>
          <div>
            <p className="text-lg font-extrabold text-slate-900 dark:text-foreground leading-tight">
              {resident.nama_kk}
            </p>
            <p className="text-sm text-slate-500 dark:text-muted-foreground">
              Tarif: {formatRupiah(resident.tarif_iuran_bulanan)}/bulan
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-xl border border-slate-300 dark:border-white/15 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-muted-foreground hover:bg-slate-50 dark:hover:bg-white/10"
            onClick={() => {
              setNamaKkEdit(resident.nama_kk);
              setTarifEdit(String(Number(resident.tarif_iuran_bulanan)));
              setEditOpen(true);
            }}
          >
            Edit
          </button>
          <button
            type="button"
            className="rounded-xl border border-rose-300 dark:border-rose-700/50 px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20"
            onClick={() => setDeleteOpen(true)}
          >
            Hapus
          </button>
          <div className={`shrink-0 rounded-2xl px-3 py-1.5 text-sm font-bold ${
            lunas === total
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
              : lunas > 0
              ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
              : "bg-slate-100 text-slate-600 dark:bg-white/8 dark:text-muted-foreground"
          }`}>
            {lunas}/{total} Lunas
          </div>
        </div>
      </div>

      {/* Grid 12 bulan */}
      <div className="p-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
        {resident.iuran.map((iuran) => (
          <MonthButton
            key={`${resident.id}-${iuran.bulan}`}
            iuran={iuran}
            namaKk={resident.nama_kk}
            formatRupiah={formatRupiah}
            onPay={onPay}
          />
        ))}
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="rounded-3xl border-2 border-slate-200 dark:border-white/10 bg-white dark:bg-card shadow-2xl sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Data Warga</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <p className="text-sm font-semibold text-slate-700 dark:text-foreground">Nama KK</p>
              <Input value={namaKkEdit} onChange={(event) => setNamaKkEdit(event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-semibold text-slate-700 dark:text-foreground">Tarif Iuran Bulanan</p>
              <Input
                type="number"
                min={1}
                value={tarifEdit}
                onChange={(event) => setTarifEdit(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button type="button" variant="rw" disabled={isUpdating} onClick={handleSaveEdit}>
              {isUpdating ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
            <Button type="button" variant="outline" disabled={isUpdating} onClick={() => setEditOpen(false)}>
              Batal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="rounded-3xl border-2 border-slate-200 dark:border-white/10 bg-white dark:bg-card shadow-2xl sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Nonaktifkan Warga</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600 dark:text-muted-foreground">
            Yakin ingin menonaktifkan <strong>{resident.nama_kk}</strong>? Histori iuran tetap tersimpan untuk audit.
          </p>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button type="button" variant="destructive" disabled={isDeleting} onClick={handleConfirmDelete}>
              {isDeleting ? "Memproses..." : "Ya, Nonaktifkan"}
            </Button>
            <Button type="button" variant="outline" disabled={isDeleting} onClick={() => setDeleteOpen(false)}>
              Batal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MonthButton({
  iuran,
  namaKk,
  formatRupiah,
  onPay,
}: {
  iuran: IuranItem;
  namaKk: string;
  formatRupiah: (value: number | string) => string;
  onPay: (iuranId: string, nominal: number) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  const [paymentState, paymentAction, isPending] = useActionState<PaymentState, FormData>(
    async (_previousState, formData) => {
      const iuranId = String(formData.get("iuran_id") ?? "").trim();
      const nominalInput = Number(String(formData.get("nominal") ?? "0").trim());

      const fieldErrors: FieldErrors = {};
      if (!iuranId) fieldErrors.iuran_id = "Data tidak valid, coba muat ulang halaman.";
      if (!Number.isFinite(nominalInput) || nominalInput <= 0) {
        fieldErrors.nominal = "Jumlah bayar harus lebih dari 0 ya.";
      }
      if (Object.keys(fieldErrors).length > 0) {
        return { message: "Ada yang perlu diperbaiki dulu nih.", fieldErrors };
      }

      await onPay(iuranId, nominalInput);
      setOpen(false);
      return { message: "", fieldErrors: {} };
    },
    { message: "", fieldErrors: {} }
  );

  if (iuran.status === "LUNAS") {
    return (
      <div className="flex flex-col items-center justify-center gap-1 rounded-2xl bg-emerald-500 py-3 px-1 shadow-sm shadow-emerald-500/30">
        <CheckCircle2 className="size-5 text-white" />
        <span className="text-sm font-bold text-white">{MONTHS_SHORT[iuran.bulan - 1]}</span>
      </div>
    );
  }

  if (!iuran.id) {
    // Bulan belum ada record sama sekali di DB
    return (
      <div className="flex flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-slate-300 dark:border-white/15 bg-slate-50 dark:bg-white/3 py-3 px-1">
        <span className="text-sm font-bold text-slate-400 dark:text-muted-foreground">{MONTHS_SHORT[iuran.bulan - 1]}</span>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex flex-col items-center justify-center gap-1 rounded-2xl border-2 border-slate-300 dark:border-white/20 bg-white dark:bg-white/5 py-3 px-1 shadow-sm transition-all duration-150 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 hover:shadow-md active:scale-95"
      >
        <CreditCard className="size-5 text-slate-400 dark:text-muted-foreground" />
        <span className="text-sm font-bold text-slate-700 dark:text-foreground">{MONTHS_SHORT[iuran.bulan - 1]}</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-3xl border-2 border-slate-200 dark:border-white/10 bg-white dark:bg-card shadow-2xl sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold text-slate-900 dark:text-foreground text-center">
              Catat Pembayaran
            </DialogTitle>
          </DialogHeader>

          <div className="rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border-2 border-indigo-200 dark:border-indigo-800/40 p-5 text-center space-y-1 my-2">
            <p className="text-2xl font-extrabold text-slate-900 dark:text-foreground">{namaKk}</p>
            <p className="text-base text-indigo-700 dark:text-indigo-300 font-semibold">
              Bulan {MONTHS[iuran.bulan - 1]} {iuran.tahun}
            </p>
            <p className="text-2xl font-extrabold text-indigo-700 dark:text-indigo-300 mt-2">
              {formatRupiah(iuran.nominal)}
            </p>
          </div>

          <p className="text-center text-base text-slate-600 dark:text-muted-foreground">
            Apakah Bapak/Ibu <strong>{namaKk}</strong> sudah membayar iuran bulan <strong>{MONTHS[iuran.bulan - 1]}</strong>?
          </p>

          {paymentState.message ? (
            <p className="text-base text-destructive font-medium text-center">{paymentState.message}</p>
          ) : null}

          <form action={paymentAction}>
            <input type="hidden" name="iuran_id" value={iuran.id} />
            <input type="hidden" name="nominal" value={String(Number(iuran.nominal))} />

            <DialogFooter className="flex-col gap-3 sm:flex-col">
              <Button
                type="submit"
                variant="rw"
                size="elder"
                className="w-full gap-3 shadow-lg shadow-indigo-500/20"
                disabled={isPending}
              >
                {isPending ? (
                  <><Loader2 className="size-5 animate-spin" /> Menyimpan...</>
                ) : (
                  <><CheckCircle2 className="size-5" /> ✅ Ya, Sudah Bayar</>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="xl"
                className="w-full"
                disabled={isPending}
                onClick={() => setOpen(false)}
              >
                Batal
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
