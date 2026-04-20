"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

export default function IuranSpreadsheet({
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
  const months = useMemo(() => {
    const monthSet = new Set<number>();
    residents.forEach((resident) => {
      resident.iuran.forEach((item) => monthSet.add(item.bulan));
    });

    return Array.from(monthSet).sort((a, b) => a - b);
  }, [residents]);

  const summary = useMemo(() => {
    let lunas = 0;
    let belum = 0;
    let nominalLunas = 0;

    residents.forEach((resident) => {
      resident.iuran.forEach((item) => {
        if (item.status === "LUNAS") {
          lunas += 1;
          nominalLunas += Number(item.nominal);
        } else {
          belum += 1;
        }
      });
    });

    return {
      lunas,
      belum,
      nominalLunas,
    };
  }, [residents]);

  if (residents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-300 dark:border-white/15 bg-white dark:bg-card py-20 px-6 text-center">
        <span className="text-6xl mb-4">🏘️</span>
        <p className="text-xl font-bold text-slate-700 dark:text-foreground">Belum ada data warga</p>
        <p className="text-base text-slate-500 dark:text-muted-foreground mt-2">
          Pilih blok wilayah dan tahun di atas, lalu klik "Tampilkan Data"
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800/40 bg-emerald-50 dark:bg-emerald-950/25 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Total Lunas</p>
          <p className="mt-1 text-2xl font-extrabold text-emerald-700 dark:text-emerald-300">{summary.lunas}</p>
        </div>
        <div className="rounded-2xl border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-950/25 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">Total Belum</p>
          <p className="mt-1 text-2xl font-extrabold text-amber-700 dark:text-amber-300">{summary.belum}</p>
        </div>
        <div className="rounded-2xl border border-indigo-200 dark:border-indigo-800/40 bg-indigo-50 dark:bg-indigo-950/25 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">Nominal Tercatat</p>
          <p className="mt-1 text-xl font-extrabold text-indigo-700 dark:text-indigo-300">{formatRupiah(summary.nominalLunas)}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-card overflow-x-auto">
        <Table className="text-sm">
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 z-10 bg-white dark:bg-card min-w-55">Nama KK</TableHead>
              <TableHead className="sticky left-55 z-10 bg-white dark:bg-card min-w-35">Tarif</TableHead>
              {months.map((month) => (
                <TableHead key={month} className="text-center min-w-27.5">{MONTHS_SHORT[month - 1]}</TableHead>
              ))}
              <TableHead className="min-w-40 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {residents.map((resident) => {
              const iuranByMonth = new Map(resident.iuran.map((item) => [item.bulan, item]));

              return (
                <TableRow key={resident.id}>
                  <TableCell className="sticky left-0 z-10 bg-white dark:bg-card font-semibold">{resident.nama_kk}</TableCell>
                  <TableCell className="sticky left-55 z-10 bg-white dark:bg-card">{formatRupiah(resident.tarif_iuran_bulanan)}</TableCell>
                  {months.map((month) => {
                    const item = iuranByMonth.get(month);
                    if (!item) {
                      return <TableCell key={`${resident.id}-${month}`} className="text-center text-slate-400">-</TableCell>;
                    }

                    if (item.status === "LUNAS") {
                      return (
                        <TableCell key={`${resident.id}-${month}`} className="text-center">
                          <span className="inline-flex rounded-lg bg-emerald-100 dark:bg-emerald-950/35 px-2 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                            LUNAS
                          </span>
                        </TableCell>
                      );
                    }

                    return (
                      <TableCell key={`${resident.id}-${month}`} className="text-center">
                        {item.id ? (
                          <Button
                            type="button"
                            size="xs"
                            variant="outline"
                            onClick={() => onPay(item.id as string, Number(item.nominal))}
                          >
                            Bayar
                          </Button>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-right">
                    <WargaRowActions
                      resident={resident}
                      onUpdateResident={onUpdateResident}
                      onDeleteResident={onDeleteResident}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function WargaRowActions({
  resident,
  onUpdateResident,
  onDeleteResident,
}: {
  resident: WargaItem;
  onUpdateResident: (
    wargaId: string,
    payload: { nama_kk?: string; tarif_iuran_bulanan?: number }
  ) => Promise<void>;
  onDeleteResident: (wargaId: string) => Promise<void>;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [namaKkEdit, setNamaKkEdit] = useState(resident.nama_kk);
  const [tarifEdit, setTarifEdit] = useState(String(Number(resident.tarif_iuran_bulanan)));

  const handleSaveEdit = async () => {
    const namaTrimmed = namaKkEdit.trim();
    const tarifParsed = Number(tarifEdit);

    if (!namaTrimmed || !Number.isFinite(tarifParsed) || tarifParsed <= 0) {
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
    <>
      <div className="inline-flex gap-2">
        <Button
          type="button"
          size="xs"
          variant="outline"
          onClick={() => {
            setNamaKkEdit(resident.nama_kk);
            setTarifEdit(String(Number(resident.tarif_iuran_bulanan)));
            setEditOpen(true);
          }}
        >
          Edit
        </Button>
        <Button type="button" size="xs" variant="destructive" onClick={() => setDeleteOpen(true)}>
          Hapus
        </Button>
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
    </>
  );
}
