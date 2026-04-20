"use client";

import { useActionState, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { api, getApiError, type FieldErrors } from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ShieldCheck, Search, CheckCircle2, XCircle, Clock } from "lucide-react";

interface PendingPengurusItem {
  user_id: string;
  nama: string;
  email: string;
  no_hp: string;
  role: "PENGURUS_MASJID";
  status_akun: "PENDING";
  created_at: string;
  masjid: {
    id: string;
    nama_masjid: string;
    alamat: string;
    nama_blok: string;
    wilayah_rw_id: string;
    nama_kompleks: string;
    no_rw: string;
  };
}

interface PendingPengurusResponse {
  data: PendingPengurusItem[];
}

interface ActionState {
  message: string;
  fieldErrors: FieldErrors;
}

const initialState: ActionState = {
  message: "",
  fieldErrors: {},
};

const formatDateTime = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export default function ApprovalDashboardPage() {
  const [pendingItems, setPendingItems] = useState<PendingPengurusItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const fetchPending = useCallback(async (search: string) => {
    setIsLoading(true);

    try {
      const response = await api.get<PendingPengurusResponse>("/auth/pending-pengurus", {
        params: {
          ...(search.trim() ? { search: search.trim() } : {}),
        },
      });

      setPendingItems(response.data.data ?? []);
    } catch (error) {
      const apiError = getApiError(error);
      toast.error(apiError.message);
      setPendingItems([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPending("").catch(() => {
      toast.error("Gagal memuat daftar approval.");
      setIsLoading(false);
    });
  }, [fetchPending]);

  const [filterState, filterAction, isFiltering] = useActionState<ActionState, FormData>(
    async (_previousState, formData) => {
      const search = String(formData.get("search") ?? "").trim();
      await fetchPending(search);
      setActiveSearch(search);

      return { message: "", fieldErrors: {} };
    },
    initialState
  );

  const [approveState, approveAction, isSubmittingApproval] = useActionState<ActionState, FormData>(
    async (_previousState, formData) => {
      const userId = String(formData.get("user_id") ?? "").trim();
      const statusAkun = String(formData.get("status_akun") ?? "").trim();

      const fieldErrors: FieldErrors = {};

      if (!userId) fieldErrors.user_id = "user_id wajib diisi.";
      if (statusAkun !== "APPROVED" && statusAkun !== "REJECTED") {
        fieldErrors.status_akun = "status_akun tidak valid.";
      }

      if (Object.keys(fieldErrors).length > 0) {
        return { message: "Periksa kembali data approval.", fieldErrors };
      }

      try {
        await api.patch("/auth/approve-pengurus", {
          user_id: userId,
          status_akun: statusAkun,
        });

        toast.success("Pengurus berhasil di-approve.");
        await fetchPending(activeSearch);

        return { message: "", fieldErrors: {} };
      } catch (error) {
        const apiError = getApiError(error);
        toast.error(apiError.message);
        return { message: apiError.message, fieldErrors: apiError.fieldErrors };
      }
    },
    initialState
  );

  return (
    <main className="flex flex-1 flex-col gap-6">
      {/* Page header */}
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm shadow-indigo-500/30">
            <ShieldCheck className="size-5" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-foreground">
              Approval Pengurus
            </h1>
            <p className="text-sm text-slate-500 dark:text-muted-foreground">
              Tinjau dan kelola pengajuan akun pengurus masjid
            </p>
          </div>
        </div>
      </header>

      {/* Pending count badge */}
      {!isLoading && pendingItems.length > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-200/60 dark:border-amber-800/30 bg-amber-50/60 dark:bg-amber-950/20 px-4 py-3">
          <Clock className="size-4 text-amber-500 flex-shrink-0" />
          <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
            {pendingItems.length} pengajuan menunggu persetujuan
          </p>
        </div>
      )}

      {/* Filter */}
      <Card>
        <CardHeader className="border-b border-slate-100 dark:border-white/8 pb-4">
          <CardTitle className="flex items-center gap-2">
            <Search className="size-4 text-slate-400" />
            Cari Pengajuan
          </CardTitle>
          <CardDescription>Cari berdasarkan nama, email, atau nomor HP.</CardDescription>
        </CardHeader>
        <CardContent className="pt-5">
          <form action={filterAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="search" className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-muted-foreground">Keyword</Label>
              <Input
                id="search"
                name="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Contoh: ahmad / 0812 / masjid"
                disabled={isFiltering || isLoading}
              />
            </div>

            <Button type="submit" variant="rw" size="default" disabled={isFiltering || isLoading} className="w-full sm:w-auto whitespace-nowrap">
              {isFiltering || isLoading ? "Memuat..." : "Terapkan Filter"}
            </Button>
          </form>

          {filterState.message ? <p className="mt-3 text-sm text-destructive">{filterState.message}</p> : null}
          {approveState.message ? <p className="mt-2 text-sm text-destructive">{approveState.message}</p> : null}
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="border-b border-slate-100 dark:border-white/8 pb-4">
          <CardTitle>Daftar Pengurus PENDING</CardTitle>
          <CardDescription>Total saat ini: {pendingItems.length} pengajuan.</CardDescription>
        </CardHeader>
        <CardContent className="pt-0 px-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 dark:bg-white/3">
                  <TableHead className="pl-5 font-semibold">Pengurus</TableHead>
                  <TableHead className="font-semibold hidden sm:table-cell">Masjid</TableHead>
                  <TableHead className="font-semibold hidden lg:table-cell">Diajukan</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="text-right pr-5 font-semibold">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-12 text-center text-sm text-slate-500 dark:text-muted-foreground">
                      {isLoading ? "Memuat data..." : (
                        <div className="flex flex-col items-center gap-2">
                          <CheckCircle2 className="size-8 text-emerald-400" />
                          <span>Tidak ada pengajuan pending saat ini.</span>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  pendingItems.map((item) => (
                    <TableRow key={item.user_id} className="hover:bg-slate-50/70 dark:hover:bg-white/3">
                      <TableCell className="pl-5">
                        <div className="flex items-center gap-3">
                          {/* Avatar initials */}
                          <span className="inline-flex size-9 flex-shrink-0 items-center justify-center rounded-2xl bg-indigo-100 dark:bg-indigo-950/40 text-xs font-extrabold text-indigo-600 dark:text-indigo-400">
                            {getInitials(item.nama)}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 dark:text-foreground truncate">{item.nama}</p>
                            <p className="text-xs text-slate-400 dark:text-muted-foreground truncate">{item.email}</p>
                            <p className="text-xs text-slate-400 dark:text-muted-foreground sm:hidden truncate">{item.no_hp}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <p className="text-sm font-semibold text-slate-900 dark:text-foreground">{item.masjid.nama_masjid}</p>
                        <p className="text-xs text-slate-400 dark:text-muted-foreground">
                          {item.masjid.nama_kompleks} RW {item.masjid.no_rw} · {item.masjid.nama_blok}
                        </p>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-slate-500 dark:text-muted-foreground whitespace-nowrap">
                        {formatDateTime(item.created_at)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="pending">
                          <Clock className="size-3" />
                          {item.status_akun}
                        </Badge>
                      </TableCell>
                      <TableCell className="pr-5">
                        <div className="flex justify-end gap-2">
                          <form action={approveAction}>
                            <input type="hidden" name="user_id" value={item.user_id} />
                            <input type="hidden" name="status_akun" value="APPROVED" />
                            <Button type="submit" variant="masjid" size="sm" disabled={isSubmittingApproval} className="gap-1.5">
                              <CheckCircle2 className="size-3.5" />
                              Approve
                            </Button>
                          </form>

                          <RejectDialog
                            userId={item.user_id}
                            disabled={isSubmittingApproval}
                            onRejected={() => fetchPending(activeSearch)}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

function RejectDialog({
  userId,
  disabled,
  onRejected,
}: {
  userId: string;
  disabled: boolean;
  onRejected: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [rejectState, rejectAction, isSubmitting] = useActionState<ActionState, FormData>(
    async (_previousState, formData) => {
      const userIdFromForm = String(formData.get("user_id") ?? "").trim();
      const alasanPenolakan = String(formData.get("alasan_penolakan") ?? "").trim();

      const fieldErrors: FieldErrors = {};
      if (!userIdFromForm) fieldErrors.user_id = "user_id tidak valid.";
      if (!alasanPenolakan) fieldErrors.alasan_penolakan = "Alasan penolakan wajib diisi.";

      if (Object.keys(fieldErrors).length > 0) {
        return { message: "Periksa kembali alasan penolakan.", fieldErrors };
      }

      try {
        await api.patch("/auth/approve-pengurus", {
          user_id: userIdFromForm,
          status_akun: "REJECTED",
          alasan_penolakan: alasanPenolakan,
        });

        toast.success("Pengurus berhasil di-reject.");
        await onRejected();
        setOpen(false);

        return { message: "", fieldErrors: {} };
      } catch (error) {
        const apiError = getApiError(error);
        toast.error(apiError.message);
        return { message: apiError.message, fieldErrors: apiError.fieldErrors };
      }
    },
    initialState
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="destructive" size="sm" disabled={disabled || isSubmitting} className="gap-1.5">
          <XCircle className="size-3.5" />
          Reject
        </Button>
      </DialogTrigger>

      <DialogContent className="rounded-3xl border border-slate-200/60 dark:border-white/8 bg-white/95 dark:bg-card/95 backdrop-blur-xl shadow-2xl">
        <DialogHeader>
          <DialogTitle>Tolak Pengajuan</DialogTitle>
          <DialogDescription>Masukkan alasan penolakan agar pengurus dapat memahami tindak lanjutnya.</DialogDescription>
        </DialogHeader>

        <form action={rejectAction} className="space-y-4 mt-2">
          <input type="hidden" name="user_id" value={userId} />

          <div className="space-y-1.5">
            <Label htmlFor={`alasan-${userId}`} className="text-xs font-semibold uppercase tracking-wide text-slate-500">Alasan Penolakan</Label>
            <textarea
              id={`alasan-${userId}`}
              name="alasan_penolakan"
              rows={4}
              required
              disabled={isSubmitting}
              className="w-full rounded-2xl border border-input bg-white dark:bg-input/20 dark:border-white/10 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all duration-200 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25 disabled:opacity-50 resize-none"
              placeholder="Contoh: Data administrasi belum lengkap atau tidak sesuai"
            />
            {rejectState.fieldErrors.alasan_penolakan ? (
              <p className="text-xs text-destructive">{rejectState.fieldErrors.alasan_penolakan}</p>
            ) : null}
          </div>

          {rejectState.message ? <p className="text-sm text-destructive">{rejectState.message}</p> : null}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => setOpen(false)}>Batal</Button>
            <Button type="submit" variant="destructive" disabled={isSubmitting}>
              {isSubmitting ? "Memproses..." : "Konfirmasi Reject"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
