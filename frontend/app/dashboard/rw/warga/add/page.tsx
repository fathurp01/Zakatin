"use client";

import { useActionState, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api, getApiError, type FieldErrors } from "@/lib/axios";
import { isUuid } from "@/lib/auth";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";

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

interface AddWargaFormState {
  message: string;
  fieldErrors: FieldErrors;
}

const initialState: AddWargaFormState = {
  message: "",
  fieldErrors: {},
};

const formatRupiah = (value: number): string => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
};

export default function AddWargaPage() {
  const router = useRouter();
  const [blokList, setBlokList] = useState<BlokWilayah[]>([]);
  const [selectedBlok, setSelectedBlok] = useState<string>("");
  const [isLoadingBlok, setIsLoadingBlok] = useState(true);
  const [nominalInput, setNominalInput] = useState<number>(100000);

  // Load blok list on mount
  useEffect(() => {
    const loadBlokList = async () => {
      try {
        const response = await api.get<BlokListResponse>("/rw/blok-wilayah");
        const bloks = response.data.data.blok_list;
        setBlokList(bloks);
        if (bloks.length > 0) {
          setSelectedBlok(bloks[0].id);
        }
      } catch (error) {
        const apiError = getApiError(error);
        toast.error(`Gagal memuat daftar blok: ${apiError.message}`);
      } finally {
        setIsLoadingBlok(false);
      }
    };

    loadBlokList();
  }, []);

  const [formState, formAction, isSubmitting] = useActionState<
    AddWargaFormState,
    FormData
  >(async (_previousState, formData) => {
    const namaKk = String(formData.get("nama_kk") ?? "").trim();
    const tarifsIuranInput = String(formData.get("tarif_iuran_bulanan") ?? "").trim();
    const tarifsIuran = Number(tarifsIuranInput);

    const fieldErrors: FieldErrors = {};

    if (!selectedBlok) {
      fieldErrors.blok_wilayah_id = "Blok wilayah wajib dipilih.";
    } else if (!isUuid(selectedBlok)) {
      fieldErrors.blok_wilayah_id = "Blok wilayah tidak valid.";
    }

    if (!namaKk) {
      fieldErrors.nama_kk = "Nama kepala keluarga wajib diisi.";
    } else if (namaKk.length < 2 || namaKk.length > 150) {
      fieldErrors.nama_kk = "Nama harus 2-150 karakter.";
    }

    if (!tarifsIuranInput) {
      fieldErrors.tarif_iuran_bulanan = "Tarif iuran wajib diisi.";
    } else if (!Number.isFinite(tarifsIuran) || tarifsIuran <= 0) {
      fieldErrors.tarif_iuran_bulanan = "Tarif iuran harus angka positif.";
    }

    if (Object.keys(fieldErrors).length > 0) {
      return {
        message: "Periksa kembali formulir Anda.",
        fieldErrors,
      };
    }

    try {
      await api.post("/rw/warga", {
        blok_wilayah_id: selectedBlok,
        nama_kk: namaKk,
        tarif_iuran_bulanan: tarifsIuran,
      });

      toast.success(`Warga "${namaKk}" berhasil ditambahkan dengan 12 bulan iuran.`);
      router.push("/dashboard/rw/warga");
      return {
        message: "",
        fieldErrors: {},
      };
    } catch (error) {
      const apiError = getApiError(error);
      return {
        message: apiError.message,
        fieldErrors: apiError.fieldErrors ?? {},
      };
    }
  }, initialState);

  if (isLoadingBlok) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Memuat data...</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-40 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4">
      <div className="max-w-2xl mx-auto">
        <Link href="/dashboard/rw/warga" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 mb-4">
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Daftar Iuran
        </Link>

        <Card>
          <CardHeader>
            <CardTitle>Tambah Warga Baru</CardTitle>
            <CardDescription>
              Masukkan data kepala keluarga baru. Sistem akan otomatis membuat 12 bulan iuran tahun ini.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form action={formAction} className="space-y-6">
              {/* Blok Wilayah Select */}
              <div className="space-y-2">
                <Label htmlFor="blok_wilayah_id">
                  Blok Wilayah <span className="text-red-500">*</span>
                </Label>
                <Select value={selectedBlok} onValueChange={setSelectedBlok}>
                  <SelectTrigger
                    id="blok_wilayah_id"
                    className={
                      formState.fieldErrors.blok_wilayah_id
                        ? "border-red-500"
                        : ""
                    }
                  >
                    <SelectValue placeholder="Pilih blok wilayah..." />
                  </SelectTrigger>
                  <SelectContent>
                    {blokList.map((blok) => (
                      <SelectItem key={blok.id} value={blok.id}>
                        {blok.nama_blok}
                        {blok.no_rt ? ` (RT ${blok.no_rt})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formState.fieldErrors.blok_wilayah_id && (
                  <p className="text-sm text-red-500">
                    {formState.fieldErrors.blok_wilayah_id}
                  </p>
                )}
              </div>

              {/* Nama KK */}
              <div className="space-y-2">
                <Label htmlFor="nama_kk">
                  Nama Kepala Keluarga <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="nama_kk"
                  name="nama_kk"
                  type="text"
                  placeholder="Misalnya: Budi Santoso"
                  maxLength={150}
                  disabled={isSubmitting}
                  className={
                    formState.fieldErrors.nama_kk ? "border-red-500" : ""
                  }
                />
                {formState.fieldErrors.nama_kk && (
                  <p className="text-sm text-red-500">
                    {formState.fieldErrors.nama_kk}
                  </p>
                )}
              </div>

              {/* Tarif Iuran */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="tarif_iuran_bulanan">
                    Tarif Iuran Bulanan <span className="text-red-500">*</span>
                  </Label>
                  <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Nominal: {formatRupiah(nominalInput)}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Input
                    id="tarif_iuran_bulanan"
                    name="tarif_iuran_bulanan"
                    type="number"
                    min="1"
                    step="1000"
                    value={nominalInput}
                    onChange={(e) => setNominalInput(Number(e.target.value))}
                    placeholder="100000"
                    disabled={isSubmitting}
                    className={
                      formState.fieldErrors.tarif_iuran_bulanan
                        ? "border-red-500"
                        : ""
                    }
                  />
                </div>

                {formState.fieldErrors.tarif_iuran_bulanan && (
                  <p className="text-sm text-red-500">
                    {formState.fieldErrors.tarif_iuran_bulanan}
                  </p>
                )}
              </div>

              {/* Error Message */}
              {formState.message && (
                <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-md">
                  <p className="text-sm text-red-700 dark:text-red-300">
                    {formState.message}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  {isSubmitting ? "Menyimpan..." : "Simpan Warga Baru"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={isSubmitting}
                >
                  Batal
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
