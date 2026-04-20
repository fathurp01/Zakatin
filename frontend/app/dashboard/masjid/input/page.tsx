"use client";

import { useActionState, useMemo, useState } from "react";
import { toast } from "sonner";
import { api, getApiError, type FieldErrors } from "@/lib/axios";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Banknote,
  Wheat,
  Users,
  MapPin,
  CheckCircle2,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface ActionState {
  message: string;
  fieldErrors: FieldErrors;
  kodeUnik?: string;
}

interface TransaksiZisResponse {
  data: {
    kode_unik: string;
  };
}

const initialState: ActionState = { message: "", fieldErrors: {} };

type Step = 1 | 2 | 3 | 4;

export default function ZisInputPage() {
  const { user } = useAuth();
  const defaultMasjidId = useMemo(() => user?.masjid_ids?.[0] ?? "", [user]);

  // Wizard state
  const [step, setStep] = useState<Step>(1);
  const [namaKk, setNamaKk] = useState("");
  const [alamat, setAlamat] = useState("");
  const [jumlahJiwa, setJumlahJiwa] = useState(1);
  const [jenisBayar, setJenisBayar] = useState<"UANG" | "BERAS">("UANG");
  const [nominalZakat, setNominalZakat] = useState("");
  const [nominalInfaq, setNominalInfaq] = useState("");
  const [totalBeras, setTotalBeras] = useState("");

  const [successCode, setSuccessCode] = useState("");
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);

  const [formState, formAction, isSubmitting] = useActionState<ActionState, FormData>(
    async (_previousState, formData) => {
      const masjidId = String(formData.get("masjid_id") ?? "").trim();
      const namaKkVal = String(formData.get("nama_kk") ?? "").trim();
      const alamatVal = String(formData.get("alamat_muzaqi") ?? "").trim();
      const jiwaVal = String(formData.get("jumlah_jiwa") ?? "").trim();
      const jenisVal = String(formData.get("jenis_bayar") ?? "").trim();
      const zakatVal = String(formData.get("nominal_zakat") ?? "0").trim();
      const infaqVal = String(formData.get("nominal_infaq") ?? "0").trim();
      const berasVal = String(formData.get("total_beras_kg") ?? "0").trim();

      const fieldErrors: FieldErrors = {};
      if (!masjidId) fieldErrors.masjid_id = "Data masjid tidak ditemukan. Coba login ulang ya.";
      if (!namaKkVal) fieldErrors.nama_kk = "Nama wajib diisi.";
      if (!alamatVal) fieldErrors.alamat_muzaqi = "Alamat wajib diisi.";
      if (!jiwaVal || Number(jiwaVal) <= 0) fieldErrors.jumlah_jiwa = "Jumlah jiwa harus lebih dari 0.";
      if (jenisVal !== "UANG" && jenisVal !== "BERAS") fieldErrors.jenis_bayar = "Pilih jenis bayar.";
      if (jenisVal === "UANG" && Number(zakatVal) + Number(infaqVal) <= 0) {
        fieldErrors.nominal_zakat = "Isi minimal zakat atau infaq lebih dari nol ya.";
      }
      if (jenisVal === "BERAS" && Number(berasVal) <= 0) {
        fieldErrors.total_beras_kg = "Jumlah beras harus lebih dari 0 kg.";
      }
      if (Object.keys(fieldErrors).length > 0) {
        return { message: "Ada isian yang belum lengkap.", fieldErrors };
      }

      try {
        const response = await api.post<TransaksiZisResponse>("/zis/transaksi", {
          masjid_id: masjidId,
          nama_kk: namaKkVal,
          alamat_muzaqi: alamatVal,
          jumlah_jiwa: Number(jiwaVal),
          jenis_bayar: jenisVal,
          nominal_zakat: Number(zakatVal || 0),
          nominal_infaq: Number(infaqVal || 0),
          total_beras_kg: Number(berasVal || 0),
        });

        const kode = response.data.data.kode_unik;
        setSuccessCode(kode);
        setIsSuccessOpen(true);
        toast.success("Transaksi ZIS berhasil disimpan ✅");

        // Reset wizard
        setStep(1);
        setNamaKk("");
        setAlamat("");
        setJumlahJiwa(1);
        setJenisBayar("UANG");
        setNominalZakat("");
        setNominalInfaq("");
        setTotalBeras("");

        return { message: "", fieldErrors: {} };
      } catch (error) {
        const apiError = getApiError(error);
        toast.error(apiError.message);
        return { message: apiError.message, fieldErrors: apiError.fieldErrors };
      }
    },
    initialState
  );

  if (!defaultMasjidId) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 text-center py-20">
        <span className="text-6xl">🕌</span>
        <h1 className="text-2xl font-extrabold">Data masjid tidak ditemukan</h1>
        <p className="text-base text-slate-500">Silakan login ulang sebagai Pengurus Masjid.</p>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-6">
      {/* Header */}
      <header>
        <div className="flex items-center gap-3">
          <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/30">
            <Wheat className="size-6" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-foreground">
              Catat ZIS Baru
            </h1>
            <p className="text-base text-slate-500 dark:text-muted-foreground">
              Zakat, Infaq, dan Sedekah warga
            </p>
          </div>
        </div>
      </header>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {([1, 2, 3, 4] as Step[]).map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`flex size-9 items-center justify-center rounded-full text-sm font-extrabold border-2 transition-all ${
              step === s
                ? "bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/30"
                : step > s
                ? "bg-emerald-100 border-emerald-300 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-700 dark:text-emerald-300"
                : "bg-white border-slate-300 text-slate-400 dark:bg-white/5 dark:border-white/15"
            }`}>
              {step > s ? "✓" : s}
            </div>
            {s < 4 && <div className={`h-0.5 w-6 sm:w-12 rounded-full ${step > s ? "bg-emerald-400" : "bg-slate-200 dark:bg-white/10"}`} />}
          </div>
        ))}
        <p className="ml-2 text-sm font-semibold text-slate-500 dark:text-muted-foreground">
          {step === 1 && "Data Warga"}
          {step === 2 && "Jumlah Jiwa"}
          {step === 3 && "Jenis Bayar"}
          {step === 4 && "Nominal"}
        </p>
      </div>

      {/* Step cards */}
      <form action={formAction}>
        <input type="hidden" name="masjid_id" value={defaultMasjidId} />
        <input type="hidden" name="nama_kk" value={namaKk} />
        <input type="hidden" name="alamat_muzaqi" value={alamat} />
        <input type="hidden" name="jumlah_jiwa" value={String(jumlahJiwa)} />
        <input type="hidden" name="jenis_bayar" value={jenisBayar} />
        <input type="hidden" name="nominal_zakat" value={nominalZakat || "0"} />
        <input type="hidden" name="nominal_infaq" value={nominalInfaq || "0"} />
        <input type="hidden" name="total_beras_kg" value={totalBeras || "0"} />

        {/* STEP 1: Data Warga */}
        {step === 1 && (
          <div className="rounded-3xl border-2 border-slate-200 dark:border-white/10 bg-white dark:bg-card shadow-lg p-6 sm:p-8 space-y-5">
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-foreground">
              Langkah 1: Data Warga
            </h2>

            <div className="space-y-2">
              <Label htmlFor="step1_nama" className="text-base font-bold text-slate-700 dark:text-foreground">
                Nama Kepala Keluarga
              </Label>
              <Input
                id="step1_nama"
                value={namaKk}
                onChange={(e) => setNamaKk(e.target.value)}
                placeholder="Contoh: Bapak Ahmad Santoso"
                className="h-14 text-base rounded-2xl border-2"
                autoFocus
              />
              {formState.fieldErrors.nama_kk ? (
                <p className="text-base text-destructive font-medium">{formState.fieldErrors.nama_kk}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="step1_alamat" className="text-base font-bold text-slate-700 dark:text-foreground">
                <MapPin className="size-4 inline mr-1" />
                Alamat Rumah
              </Label>
              <Input
                id="step1_alamat"
                value={alamat}
                onChange={(e) => setAlamat(e.target.value)}
                placeholder="Contoh: Blok A No. 3"
                className="h-14 text-base rounded-2xl border-2"
              />
              {formState.fieldErrors.alamat_muzaqi ? (
                <p className="text-base text-destructive font-medium">{formState.fieldErrors.alamat_muzaqi}</p>
              ) : null}
            </div>

            <Button
              type="button"
              variant="masjid"
              size="elder"
              className="w-full gap-3 shadow-lg shadow-emerald-500/20 mt-2"
              onClick={() => {
                if (!namaKk.trim()) { toast.error("Nama wajib diisi dulu ya 😊"); return; }
                if (!alamat.trim()) { toast.error("Alamat wajib diisi dulu ya 😊"); return; }
                setStep(2);
              }}
            >
              Lanjut <ChevronRight className="size-6" />
            </Button>
          </div>
        )}

        {/* STEP 2: Jumlah Jiwa */}
        {step === 2 && (
          <div className="rounded-3xl border-2 border-slate-200 dark:border-white/10 bg-white dark:bg-card shadow-lg p-6 sm:p-8 space-y-6">
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-foreground">
              Langkah 2: Jumlah Jiwa dalam Keluarga
            </h2>
            <p className="text-base text-slate-500 dark:text-muted-foreground -mt-2">
              Termasuk suami, istri, dan anak-anak
            </p>

            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-6">
                <button
                  type="button"
                  onClick={() => setJumlahJiwa((j) => Math.max(1, j - 1))}
                  className="size-16 rounded-2xl border-2 border-slate-300 dark:border-white/20 bg-white dark:bg-white/5 text-4xl font-bold text-slate-700 dark:text-foreground transition-all hover:bg-slate-100 dark:hover:bg-white/10 active:scale-95 shadow"
                >
                  −
                </button>
                <div className="text-center">
                  <span className="text-7xl font-black text-slate-900 dark:text-foreground tabular-nums">{jumlahJiwa}</span>
                  <p className="text-lg font-semibold text-slate-500 dark:text-muted-foreground mt-1">jiwa</p>
                </div>
                <button
                  type="button"
                  onClick={() => setJumlahJiwa((j) => j + 1)}
                  className="size-16 rounded-2xl border-2 border-emerald-400 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/30 text-4xl font-bold text-emerald-600 dark:text-emerald-400 transition-all hover:bg-emerald-100 dark:hover:bg-emerald-900/40 active:scale-95 shadow"
                >
                  +
                </button>
              </div>
              <p className="text-sm text-slate-400 dark:text-muted-foreground">Tekan + atau − untuk mengubah angka</p>
            </div>

            {/* Quick select */}
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setJumlahJiwa(n)}
                  className={`h-12 rounded-xl border-2 font-bold text-base transition-all ${
                    jumlahJiwa === n
                      ? "border-emerald-500 bg-emerald-500 text-white shadow-md"
                      : "border-slate-200 dark:border-white/15 bg-white dark:bg-white/5 text-slate-700 dark:text-foreground hover:border-emerald-300"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <Button type="button" variant="outline" size="xl" className="flex-1 gap-2" onClick={() => setStep(1)}>
                <ChevronLeft className="size-5" /> Kembali
              </Button>
              <Button type="button" variant="masjid" size="xl" className="flex-1 gap-2 shadow-md shadow-emerald-500/20" onClick={() => setStep(3)}>
                Lanjut <ChevronRight className="size-5" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: Jenis Bayar */}
        {step === 3 && (
          <div className="rounded-3xl border-2 border-slate-200 dark:border-white/10 bg-white dark:bg-card shadow-lg p-6 sm:p-8 space-y-5">
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-foreground">
              Langkah 3: Bayar Pakai Apa?
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Uang */}
              <button
                type="button"
                onClick={() => setJenisBayar("UANG")}
                className={`relative flex flex-col items-center justify-center gap-3 rounded-3xl border-2 p-8 transition-all duration-150 ${
                  jenisBayar === "UANG"
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 shadow-lg shadow-emerald-500/20"
                    : "border-slate-200 dark:border-white/15 bg-white dark:bg-white/5 hover:border-emerald-300"
                }`}
              >
                {jenisBayar === "UANG" && (
                  <span className="absolute top-3 right-3 text-emerald-500">✅</span>
                )}
                <Banknote className={`size-12 ${jenisBayar === "UANG" ? "text-emerald-500" : "text-slate-400"}`} />
                <span className={`text-xl font-extrabold ${jenisBayar === "UANG" ? "text-emerald-700 dark:text-emerald-300" : "text-slate-700 dark:text-foreground"}`}>
                  Bayar Pakai Uang
                </span>
                <span className="text-sm text-slate-500">Zakat &amp; Infaq tunai</span>
              </button>

              {/* Beras */}
              <button
                type="button"
                onClick={() => setJenisBayar("BERAS")}
                className={`relative flex flex-col items-center justify-center gap-3 rounded-3xl border-2 p-8 transition-all duration-150 ${
                  jenisBayar === "BERAS"
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 shadow-lg shadow-emerald-500/20"
                    : "border-slate-200 dark:border-white/15 bg-white dark:bg-white/5 hover:border-emerald-300"
                }`}
              >
                {jenisBayar === "BERAS" && (
                  <span className="absolute top-3 right-3 text-emerald-500">✅</span>
                )}
                <Wheat className={`size-12 ${jenisBayar === "BERAS" ? "text-emerald-500" : "text-slate-400"}`} />
                <span className={`text-xl font-extrabold ${jenisBayar === "BERAS" ? "text-emerald-700 dark:text-emerald-300" : "text-slate-700 dark:text-foreground"}`}>
                  Bayar Pakai Beras
                </span>
                <span className="text-sm text-slate-500">Zakat fitrah beras</span>
              </button>
            </div>

            <div className="flex gap-3">
              <Button type="button" variant="outline" size="xl" className="flex-1 gap-2" onClick={() => setStep(2)}>
                <ChevronLeft className="size-5" /> Kembali
              </Button>
              <Button type="button" variant="masjid" size="xl" className="flex-1 gap-2 shadow-md shadow-emerald-500/20" onClick={() => setStep(4)}>
                Lanjut <ChevronRight className="size-5" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4: Nominal + Submit */}
        {step === 4 && (
          <div className="rounded-3xl border-2 border-slate-200 dark:border-white/10 bg-white dark:bg-card shadow-lg p-6 sm:p-8 space-y-5">
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-foreground">
              Langkah 4: Masukkan Jumlah
            </h2>

            {/* Ringkasan */}
            <div className="rounded-2xl border-2 border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/60 dark:bg-emerald-950/20 p-4 space-y-1">
              <p className="text-base font-bold text-slate-900 dark:text-foreground">{namaKk}</p>
              <p className="text-sm text-slate-500">Alamat: {alamat}</p>
              <p className="text-sm text-slate-500 flex items-center gap-1">
                <Users className="size-3.5" /> {jumlahJiwa} jiwa
                <span className="ml-3">{jenisBayar === "UANG" ? "💰 Uang" : "🌾 Beras"}</span>
              </p>
            </div>

            {jenisBayar === "UANG" ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="s4_zakat" className="text-base font-bold text-slate-700 dark:text-foreground">
                    💰 Jumlah Zakat (Rp)
                  </Label>
                  <Input
                    id="s4_zakat"
                    type="number"
                    min={0}
                    step={1000}
                    value={nominalZakat}
                    onChange={(e) => setNominalZakat(e.target.value)}
                    placeholder="0"
                    className="h-14 text-xl font-bold rounded-2xl border-2"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="s4_infaq" className="text-base font-bold text-slate-700 dark:text-foreground">
                    💰 Jumlah Infaq (Rp) — opsional
                  </Label>
                  <Input
                    id="s4_infaq"
                    type="number"
                    min={0}
                    step={1000}
                    value={nominalInfaq}
                    onChange={(e) => setNominalInfaq(e.target.value)}
                    placeholder="0"
                    className="h-14 text-xl font-bold rounded-2xl border-2"
                  />
                </div>
                {formState.fieldErrors.nominal_zakat ? (
                  <p className="text-base text-destructive font-medium">{formState.fieldErrors.nominal_zakat}</p>
                ) : null}
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="s4_beras" className="text-base font-bold text-slate-700 dark:text-foreground">
                  🌾 Jumlah Beras (kg)
                </Label>
                <Input
                  id="s4_beras"
                  type="number"
                  min={0}
                  step={0.5}
                  value={totalBeras}
                  onChange={(e) => setTotalBeras(e.target.value)}
                  placeholder="Contoh: 3.5"
                  className="h-14 text-xl font-bold rounded-2xl border-2"
                />
                {formState.fieldErrors.total_beras_kg ? (
                  <p className="text-base text-destructive font-medium">{formState.fieldErrors.total_beras_kg}</p>
                ) : null}
              </div>
            )}

            {formState.message ? (
              <p className="text-base text-destructive font-medium text-center">{formState.message}</p>
            ) : null}

            <div className="flex flex-col gap-3">
              <Button
                type="submit"
                variant="masjid"
                size="elder"
                className="w-full gap-3 shadow-lg shadow-emerald-500/20"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <><Loader2 className="size-6 animate-spin" /> Menyimpan...</>
                ) : (
                  <><CheckCircle2 className="size-6" /> Simpan &amp; Cetak Nomor Resi</>
                )}
              </Button>
              <Button type="button" variant="outline" size="xl" className="w-full gap-2" disabled={isSubmitting} onClick={() => setStep(3)}>
                <ChevronLeft className="size-5" /> Kembali
              </Button>
            </div>
          </div>
        )}
      </form>

      {/* Dialog Nomor Resi — BESAR agar bisa difoto */}
      <Dialog open={isSuccessOpen} onOpenChange={setIsSuccessOpen}>
        <DialogContent className="rounded-3xl border-2 border-emerald-300 dark:border-emerald-700 bg-white dark:bg-card shadow-2xl sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="sr-only">Transaksi Berhasil</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <span className="text-6xl">✅</span>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-foreground">Berhasil Dicatat!</h2>
            <p className="text-base text-slate-500 dark:text-muted-foreground">
              Foto atau catat <strong>Nomor Resi</strong> ini sebagai bukti resmi:
            </p>

            <div className="w-full rounded-3xl border-4 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 p-6">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400 mb-2">
                NOMOR RESI
              </p>
              <p className="text-3xl font-black text-emerald-700 dark:text-emerald-300 break-all leading-tight">
                {successCode}
              </p>
            </div>

            <p className="text-sm text-slate-400 dark:text-muted-foreground">
              📸 Silakan screenshot atau foto layar ini untuk dokumentasi
            </p>

            <Button
              type="button"
              variant="masjid"
              size="elder"
              className="w-full gap-3 shadow-lg shadow-emerald-500/20"
              onClick={() => setIsSuccessOpen(false)}
            >
              <CheckCircle2 className="size-6" /> Selesai
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
