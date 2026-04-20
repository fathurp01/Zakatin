"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { api, getApiError } from "@/lib/axios";
import { Button } from "@/components/ui/button";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Building2, Plus, Search, Pencil } from "lucide-react";

interface BlokWilayah {
  id: string;
  nama_blok: string;
  no_rt: string | null;
}

interface BlokListResponse {
  data: {
    wilayah_rw: {
      id: string;
      nama_kompleks: string;
      no_rw: string;
    };
    blok_list: BlokWilayah[];
  };
}

interface RwMasjidItem {
  id: string;
  nama_masjid: string;
  alamat: string;
  blok_wilayah_id: string;
  blok_wilayah: {
    id: string;
    nama_blok: string;
    no_rt: string | null;
    wilayah_rw: {
      id: string;
      nama_kompleks: string;
      no_rw: string;
    };
  };
}

interface RwMasjidListResponse {
  data: RwMasjidItem[];
}

interface MasjidFormState {
  blok_wilayah_id: string;
  nama_masjid: string;
  alamat: string;
}

const initialFormState: MasjidFormState = {
  blok_wilayah_id: "",
  nama_masjid: "",
  alamat: "",
};

const formatAreaCode = (value: string | null | undefined): string => {
  if (!value) {
    return "-";
  }

  const normalized = value.trim();
  if (/^\d+$/.test(normalized)) {
    const parsed = Number.parseInt(normalized, 10);
    if (!Number.isNaN(parsed) && parsed >= 0 && parsed <= 99) {
      return String(parsed).padStart(2, "0");
    }

    return String(parsed);
  }

  return normalized;
};

const formatBlokName = (value: string): string => {
  const trimmed = value.trim();
  if (/^blok\s+/i.test(trimmed)) {
    return trimmed;
  }

  return `Blok ${trimmed}`;
};

const formatBlokLabel = (blok: BlokWilayah, rwCode: string) => {
  const rwPart = rwCode ? `RW ${formatAreaCode(rwCode)} • ` : "";
  const rtPart = blok.no_rt ? `RT ${formatAreaCode(blok.no_rt)}` : "Tanpa RT";

  return `${formatBlokName(blok.nama_blok)} (${rwPart}${rtPart})`;
};

export default function RwMasjidManagementPage() {
  const [blokList, setBlokList] = useState<BlokWilayah[]>([]);
  const [rwCode, setRwCode] = useState("");
  const [masjidList, setMasjidList] = useState<RwMasjidItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [filterBlokId, setFilterBlokId] = useState("ALL");
  const [isLoadingBlok, setIsLoadingBlok] = useState(true);
  const [isLoadingMasjid, setIsLoadingMasjid] = useState(false);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
  const [isSubmittingUpdate, setIsSubmittingUpdate] = useState(false);
  const [createForm, setCreateForm] = useState<MasjidFormState>(initialFormState);
  const [editingMasjid, setEditingMasjid] = useState<RwMasjidItem | null>(null);
  const [editForm, setEditForm] = useState<MasjidFormState>(initialFormState);

  const hasBlok = blokList.length > 0;

  const loadBlok = useCallback(async () => {
    setIsLoadingBlok(true);

    try {
      const response = await api.get<BlokListResponse>("/rw/blok-wilayah");
      const list = response.data.data.blok_list ?? [];
      setBlokList(list);
      setRwCode(response.data.data.wilayah_rw.no_rw ?? "");

      if (list.length > 0) {
        setCreateForm((previous) => ({
          ...previous,
          blok_wilayah_id: previous.blok_wilayah_id || list[0].id,
        }));
      }
    } catch (error) {
      const apiError = getApiError(error);
      toast.error(apiError.message);
      setBlokList([]);
    } finally {
      setIsLoadingBlok(false);
    }
  }, []);

  const fetchMasjid = useCallback(
    async (search: string, blokWilayahId: string) => {
      setIsLoadingMasjid(true);

      try {
        const response = await api.get<RwMasjidListResponse>("/rw/masjid", {
          params: {
            ...(search.trim() ? { search: search.trim() } : {}),
            ...(blokWilayahId !== "ALL" ? { blok_wilayah_id: blokWilayahId } : {}),
          },
        });

        setMasjidList(response.data.data ?? []);
      } catch (error) {
        const apiError = getApiError(error);
        toast.error(apiError.message);
        setMasjidList([]);
      } finally {
        setIsLoadingMasjid(false);
      }
    },
    []
  );

  useEffect(() => {
    loadBlok();
  }, [loadBlok]);

  useEffect(() => {
    fetchMasjid("", "ALL").catch(() => {
      toast.error("Gagal memuat daftar masjid.");
      setMasjidList([]);
      setIsLoadingMasjid(false);
    });
  }, [fetchMasjid]);

  const handleFilterSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setActiveSearch(searchTerm.trim());
    await fetchMasjid(searchTerm, filterBlokId);
  };

  const handleCreateSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!createForm.blok_wilayah_id || !createForm.nama_masjid.trim() || !createForm.alamat.trim()) {
      toast.error("Semua field wajib diisi untuk menambahkan masjid.");
      return;
    }

    setIsSubmittingCreate(true);

    try {
      await api.post("/rw/masjid", {
        blok_wilayah_id: createForm.blok_wilayah_id,
        nama_masjid: createForm.nama_masjid.trim(),
        alamat: createForm.alamat.trim(),
      });

      toast.success("Masjid berhasil ditambahkan.");

      setCreateForm((previous) => ({
        ...previous,
        nama_masjid: "",
        alamat: "",
      }));

      await fetchMasjid(activeSearch, filterBlokId);
    } catch (error) {
      const apiError = getApiError(error);
      toast.error(apiError.message);
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  const openEditDialog = (item: RwMasjidItem) => {
    setEditingMasjid(item);
    setEditForm({
      blok_wilayah_id: item.blok_wilayah_id,
      nama_masjid: item.nama_masjid,
      alamat: item.alamat,
    });
  };

  const handleUpdateSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!editingMasjid) {
      return;
    }

    if (!editForm.blok_wilayah_id || !editForm.nama_masjid.trim() || !editForm.alamat.trim()) {
      toast.error("Semua field wajib diisi untuk memperbarui masjid.");
      return;
    }

    setIsSubmittingUpdate(true);

    try {
      await api.patch(`/rw/masjid/${editingMasjid.id}`, {
        blok_wilayah_id: editForm.blok_wilayah_id,
        nama_masjid: editForm.nama_masjid.trim(),
        alamat: editForm.alamat.trim(),
      });

      toast.success("Data masjid berhasil diperbarui.");
      setEditingMasjid(null);
      await fetchMasjid(activeSearch, filterBlokId);
    } catch (error) {
      const apiError = getApiError(error);
      toast.error(apiError.message);
    } finally {
      setIsSubmittingUpdate(false);
    }
  };

  const blokOptions = useMemo(() => {
    return blokList.map((blok) => ({
      value: blok.id,
      label: formatBlokLabel(blok, rwCode),
    }));
  }, [blokList, rwCode]);

  return (
    <main className="flex flex-1 flex-col gap-6">
      <header className="flex items-center gap-3">
        <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-linear-to-br from-indigo-500 to-violet-600 text-white shadow-sm shadow-indigo-500/30">
          <Building2 className="size-5" />
        </span>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-foreground">
            Master Masjid Wilayah RW
          </h1>
          <p className="text-sm text-slate-500 dark:text-muted-foreground">
            Kelola daftar masjid berdasarkan blok wilayah RW Anda.
          </p>
        </div>
      </header>

      <Card>
        <CardHeader className="border-b border-slate-100 dark:border-white/8 pb-4">
          <CardTitle className="flex items-center gap-2">
            <Plus className="size-4 text-slate-500" />
            Tambah Masjid
          </CardTitle>
          <CardDescription>
            Tambahkan masjid baru agar bisa dipakai pada proses registrasi pengurus.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-5">
          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleCreateSubmit}>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="create-blok">Blok Wilayah</Label>
              <Select
                value={createForm.blok_wilayah_id}
                onValueChange={(value) => setCreateForm((previous) => ({ ...previous, blok_wilayah_id: value }))}
                disabled={isLoadingBlok || !hasBlok || isSubmittingCreate}
              >
                <SelectTrigger id="create-blok" className="w-full h-10 rounded-xl">
                  <SelectValue placeholder="Pilih blok wilayah" />
                </SelectTrigger>
                <SelectContent>
                  {blokOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-nama">Nama Masjid</Label>
              <Input
                id="create-nama"
                value={createForm.nama_masjid}
                onChange={(event) => setCreateForm((previous) => ({ ...previous, nama_masjid: event.target.value }))}
                placeholder="Contoh: Masjid Al-Ikhlas"
                disabled={isSubmittingCreate || !hasBlok}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-alamat">Alamat</Label>
              <Input
                id="create-alamat"
                value={createForm.alamat}
                onChange={(event) => setCreateForm((previous) => ({ ...previous, alamat: event.target.value }))}
                placeholder="Contoh: Jl. Melati Blok B2"
                disabled={isSubmittingCreate || !hasBlok}
              />
            </div>

            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" variant="rw" disabled={isSubmittingCreate || !hasBlok}>
                {isSubmittingCreate ? "Menyimpan..." : "Tambah Masjid"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-slate-100 dark:border-white/8 pb-4">
          <CardTitle>Daftar Masjid</CardTitle>
          <CardDescription>
            Filter berdasarkan blok wilayah atau cari berdasarkan nama/alamat.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-5 space-y-5">
          <form className="grid gap-3 md:grid-cols-4" onSubmit={handleFilterSubmit}>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="search">Cari Masjid</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Nama masjid / alamat"
                  className="pl-9"
                  disabled={isLoadingMasjid}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="filter-blok">Blok Wilayah</Label>
              <Select value={filterBlokId} onValueChange={setFilterBlokId} disabled={isLoadingMasjid}>
                <SelectTrigger id="filter-blok" className="w-full h-10 rounded-xl">
                  <SelectValue placeholder="Semua blok" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Blok</SelectItem>
                  {blokOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button type="submit" className="w-full" disabled={isLoadingMasjid}>
                {isLoadingMasjid ? "Memuat..." : "Terapkan Filter"}
              </Button>
            </div>
          </form>

          <div className="overflow-x-auto rounded-2xl border border-slate-200/60 dark:border-white/8">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 dark:bg-white/3">
                  <TableHead className="font-semibold">Nama Masjid</TableHead>
                  <TableHead className="font-semibold hidden md:table-cell">Alamat</TableHead>
                  <TableHead className="font-semibold">Blok</TableHead>
                  <TableHead className="text-right font-semibold">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {masjidList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10 text-center text-sm text-slate-500 dark:text-muted-foreground">
                      {isLoadingMasjid
                        ? "Memuat data masjid..."
                        : "Belum ada data masjid pada filter yang dipilih."}
                    </TableCell>
                  </TableRow>
                ) : (
                  masjidList.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <p className="font-semibold text-slate-900 dark:text-foreground">{item.nama_masjid}</p>
                        <p className="text-xs text-slate-500 dark:text-muted-foreground md:hidden">{item.alamat}</p>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-slate-600 dark:text-muted-foreground">
                        {item.alamat}
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-slate-700 dark:text-foreground/90">{formatBlokName(item.blok_wilayah.nama_blok)}</p>
                        <p className="text-xs text-slate-500 dark:text-muted-foreground">
                          {item.blok_wilayah.wilayah_rw.nama_kompleks} • RW {formatAreaCode(item.blok_wilayah.wilayah_rw.no_rw)}
                          {item.blok_wilayah.no_rt ? ` • RT ${formatAreaCode(item.blok_wilayah.no_rt)}` : ""}
                        </p>
                      </TableCell>
                      <TableCell className="text-right">
                        <Dialog
                          open={editingMasjid?.id === item.id}
                          onOpenChange={(open) => {
                            if (!open) {
                              setEditingMasjid(null);
                            }
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button type="button" variant="outline" size="sm" onClick={() => openEditDialog(item)}>
                              <Pencil className="size-4" />
                              Edit
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit Data Masjid</DialogTitle>
                              <DialogDescription>
                                Perbarui informasi masjid sesuai data terbaru.
                              </DialogDescription>
                            </DialogHeader>

                            <form className="space-y-4" onSubmit={handleUpdateSubmit}>
                              <div className="space-y-2">
                                <Label htmlFor="edit-blok">Blok Wilayah</Label>
                                <Select
                                  value={editForm.blok_wilayah_id}
                                  onValueChange={(value) => setEditForm((previous) => ({ ...previous, blok_wilayah_id: value }))}
                                  disabled={isSubmittingUpdate}
                                >
                                  <SelectTrigger id="edit-blok" className="w-full h-10 rounded-xl">
                                    <SelectValue placeholder="Pilih blok wilayah" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {blokOptions.map((option) => (
                                      <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="edit-nama">Nama Masjid</Label>
                                <Input
                                  id="edit-nama"
                                  value={editForm.nama_masjid}
                                  onChange={(event) => setEditForm((previous) => ({ ...previous, nama_masjid: event.target.value }))}
                                  disabled={isSubmittingUpdate}
                                />
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="edit-alamat">Alamat</Label>
                                <Input
                                  id="edit-alamat"
                                  value={editForm.alamat}
                                  onChange={(event) => setEditForm((previous) => ({ ...previous, alamat: event.target.value }))}
                                  disabled={isSubmittingUpdate}
                                />
                              </div>

                              <DialogFooter>
                                <Button type="submit" variant="rw" disabled={isSubmittingUpdate}>
                                  {isSubmittingUpdate ? "Menyimpan..." : "Simpan Perubahan"}
                                </Button>
                              </DialogFooter>
                            </form>
                          </DialogContent>
                        </Dialog>
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
