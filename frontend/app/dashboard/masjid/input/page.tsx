"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
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
  CalendarDays,
  Calculator,
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

type Step = 1 | 2 | 3;

function formatCurrencyId(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function ZisInputPage() {
  const { user } = useAuth();
  const defaultMasjidId = useMemo(() => user?.masjid_ids?.[0] ?? "", [user]);

  // Wizard state
  const [step, setStep] = useState<Step>(1);
  const [namaKk, setNamaKk] = useState("");
  const [alamat, setAlamat] = useState("");
  // Default to local current time format 'YYYY-MM-DDTHH:mm'
  const [waktuTransaksi, setWaktuTransaksi] = useState(() => {
    const now = new Date();
    // Adjust for local timezone offset
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });
  
  const [jumlahJiwa, setJumlahJiwa] = useState(1);
  const [jenisBayar, setJenisBayar] = useState<"UANG" | "BERAS">("UANG");
  const [nominalInfaq, setNominalInfaq] = useState("");
  
  // Local validation errors
  const [step1Errors, setStep1Errors] = useState<{nama?: string, alamat?: string, waktu?: string}>({});

  // Settings state
  const [hargaBeras, setHargaBeras] = useState(15000); // Default fallback

  const [successCode, setSuccessCode] = useState("");
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);

  // Fetch Pengaturan on mount to compute automatic equivalent
  useEffect(() => {
    if (!defaultMasjidId) return;
    api
      .get(`/zis/dashboard?masjid_id=${defaultMasjidId}`)
      .then((res) => {
        if (res.data.data?.pengaturan?.harga_beras_per_kg) {
          setHargaBeras(Number(res.data.data.pengaturan.harga_beras_per_kg));
        }
      })
      .catch(() => undefined);
  }, [defaultMasjidId]);

  const [formState, formAction, isSubmitting] = useActionState<ActionState, FormData>(
    async (_previousState, formData) => {
      const masjidId = String(formData.get("masjid_id") ?? "").trim();
      const namaKkVal = String(formData.get("nama_kk") ?? "").trim();
      const alamatVal = String(formData.get("alamat_muzaqi") ?? "").trim();
      const wktVal = String(formData.get("waktu_transaksi") ?? "").trim();
      const jiwaVal = String(formData.get("jumlah_jiwa") ?? "").trim();
      const jenisVal = String(formData.get("jenis_bayar") ?? "").trim();
      const infaqVal = String(formData.get("nominal_infaq") ?? "0").trim();

      const fieldErrors: FieldErrors = {};
      if (!masjidId) fieldErrors.masjid_id = "Data masjid tidak ditemukan. Coba login ulang ya.";
      if (!namaKkVal) fieldErrors.nama_kk = "Nama wajib diisi.";
      if (!alamatVal) fieldErrors.alamat_muzaqi = "Alamat wajib diisi.";
      if (!wktVal) fieldErrors.waktu_transaksi = "Waktu transaksi wajib diisi.";
      if (!jiwaVal || Number(jiwaVal) <= 0) fieldErrors.jumlah_jiwa = "Jumlah jiwa harus lebih dari 0.";
      if (jenisVal !== "UANG" && jenisVal !== "BERAS") fieldErrors.jenis_bayar = "Pilih jenis bayar.";
      if (Object.keys(fieldErrors).length > 0) {
        return { message: "Ada isian yang belum lengkap / tidak valid.", fieldErrors };
      }

      try {
        const response = await api.post<TransaksiZisResponse>("/zis/transaksi", {
          masjid_id: masjidId,
          nama_kk: namaKkVal,
          alamat_muzaqi: alamatVal,
          waktu_transaksi: new Date(wktVal).toISOString(),
          jumlah_jiwa: Number(jiwaVal),
          jenis_bayar: jenisVal,
          nominal_infaq: Number(infaqVal || 0),
          // Zakat will be automatically calculated on the server
        });

        const kode = response.data.data.kode_unik;
        setSuccessCode(kode);
        setIsSuccessOpen(true);
        toast.success("Transaksi ZIS berhasil disimpan ✅");

        // Reset wizard
        setStep(1);
        setNamaKk("");
        setAlamat("");
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        setWaktuTransaksi(now.toISOString().slice(0, 16));
        setJumlahJiwa(1);
        setJenisBayar("UANG");
        setNominalInfaq("");

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

  // Automatic Calculation based on standard Zakat logic (2.5 kg per jiwa)
  const autoTotalBeras = jumlahJiwa * 2.5; 
  const autoTotalUang = autoTotalBeras * hargaBeras; 

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
              Zakat dihitung otomatis per jiwa
            </p>
          </div>
        </div>
      </header>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {([1, 2, 3] as Step[]).map((s) => (
          <div key={s} className="flex flex-1 items-center">
            <div className={`flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-extrabold border-2 transition-all ${
              step === s
                ? "bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/30"
                : step > s
                ? "bg-emerald-100 border-emerald-300 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-700 dark:text-emerald-300"
                : "bg-white border-slate-300 text-slate-400 dark:bg-white/5 dark:border-white/15"
            }`}>
              {step > s ? "✓" : s}
            </div>
            {s < 3 && <div className={`flex-1 h-1 mx-2 rounded-full ${step > s ? "bg-emerald-400" : "bg-slate-200 dark:bg-white/10"}`} />}
          </div>
        ))}
        <p className="ml-2 w-32 shrink-0 text-sm font-semibold text-right text-slate-500 dark:text-muted-foreground">
          {step === 1 && "Data Dasar"}
          {step === 2 && "Rincian"}
          {step === 3 && "Konfirmasi"}
        </p>
      </div>

      {/* Step cards */}
      <form action={formAction}>
        <input type="hidden" name="masjid_id" value={defaultMasjidId} />
        <input type="hidden" name="nama_kk" value={namaKk} />
        <input type="hidden" name="alamat_muzaqi" value={alamat} />
        <input type="hidden" name="waktu_transaksi" value={waktuTransaksi} />
        <input type="hidden" name="jumlah_jiwa" value={String(jumlahJiwa)} />
        <input type="hidden" name="jenis_bayar" value={jenisBayar} />
        <input type="hidden" name="nominal_infaq" value={nominalInfaq || "0"} />

        {/* STEP 1: Data Dasar */}
        {step === 1 && (
          <div className="rounded-3xl border-2 border-slate-200 dark:border-white/10 bg-white dark:bg-card shadow-lg p-6 sm:p-8 space-y-6">
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-foreground">
              Langkah 1: Data Warga & Waktu
            </h2>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="step1_nama" className="text-base font-bold text-slate-700 dark:text-foreground">
                  Nama Kepala Keluarga
                </Label>
                <Input
                  id="step1_nama"
                  value={namaKk}
                  onChange={(e) => {
                    setNamaKk(e.target.value);
                    if (step1Errors.nama) setStep1Errors({ ...step1Errors, nama: undefined });
                  }}
                  placeholder="Contoh: Bapak Ahmad Santoso"
                  className={`h-14 text-base rounded-2xl border-2 ${step1Errors.nama ? 'border-destructive/50' : ''}`}
                  autoFocus
                />
                {step1Errors.nama && <p className="text-sm font-medium text-destructive">{step1Errors.nama}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="step1_alamat" className="text-base font-bold text-slate-700 dark:text-foreground">
                  <MapPin className="size-4 inline mr-1" />
                  Alamat Lengkap
                </Label>
                <Input
                  id="step1_alamat"
                  value={alamat}
                  onChange={(e) => {
                    setAlamat(e.target.value);
                    if (step1Errors.alamat) setStep1Errors({ ...step1Errors, alamat: undefined });
                  }}
                  placeholder="Contoh: Blok A No. 3"
                  className={`h-14 text-base rounded-2xl border-2 ${step1Errors.alamat ? 'border-destructive/50' : ''}`}
                />
                {step1Errors.alamat && <p className="text-sm font-medium text-destructive">{step1Errors.alamat}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="step1_waktu" className="text-base font-bold text-slate-700 dark:text-foreground">
                  <CalendarDays className="size-4 inline mr-1" />
                  Tanggal & Jam Transaksi
                </Label>
                <Input
                  id="step1_waktu"
                  type="datetime-local"
                  value={waktuTransaksi}
                  onChange={(e) => {
                    setWaktuTransaksi(e.target.value);
                    if (step1Errors.waktu) setStep1Errors({ ...step1Errors, waktu: undefined });
                  }}
                  className={`h-14 text-base rounded-2xl border-2 ${step1Errors.waktu ? 'border-destructive/50' : ''}`}
                />
                {step1Errors.waktu && <p className="text-sm font-medium text-destructive">{step1Errors.waktu}</p>}
              </div>
            </div>

            <Button
              type="button"
              variant="masjid"
              size="elder"
              className="w-full gap-3 shadow-lg shadow-emerald-500/20 mt-4"
              onClick={() => {
                const err: any = {};
                const namaTrimmed = namaKk.trim();
                const alamatTrimmed = alamat.trim();
                
                if (!namaTrimmed) {
                  err.nama = "Nama Kepala Keluarga wajib diisi.";
                } else if (namaTrimmed.length < 2) {
                  err.nama = "Nama Kepala Keluarga minimal 2 karakter.";
                }

                if (!alamatTrimmed) {
                  err.alamat = "Alamat wajib diisi.";
                } else if (alamatTrimmed.length < 3) {
                  err.alamat = "Alamat minimal 3 karakter.";
                }

                if (!waktuTransaksi) {
                  err.waktu = "Waktu transaksi wajib diisi.";
                }

                if (Object.keys(err).length > 0) {
                  setStep1Errors(err);
                  toast.error("Ada data yang belum lengkap, silakan cek form yang berwarna merah.");
                  return;
                }
                
                setStep1Errors({});
                setStep(2);
              }}
            >
              Lanjut Isi Rincian <ChevronRight className="size-6" />
            </Button>
          </div>
        )}

        {/* STEP 2: Rincian (Jiwa, Bayar, Infaq) */}
        {step === 2 && (
          <div className="rounded-3xl border-2 border-slate-200 dark:border-white/10 bg-white dark:bg-card shadow-lg p-6 sm:p-8 space-y-8">
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-foreground">
              Langkah 2: Rincian Zakat & Infaq
            </h2>

            {/* Jumlah Jiwa */}
            <div className="space-y-4">
              <Label className="text-base font-bold text-slate-700 dark:text-foreground">
                <Users className="size-4 inline mr-1" />
                Berapa Jumlah Jiwa?
              </Label>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="flex items-center gap-4 bg-slate-50 dark:bg-white/5 p-2 rounded-2xl border-2 border-slate-200 dark:border-white/10 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setJumlahJiwa((j) => Math.max(1, j - 1))}
                    className="size-14 rounded-xl bg-white dark:bg-card text-2xl font-bold shadow hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                  >
                    −
                  </button>
                  <div className="text-center w-20">
                    <span className="text-4xl font-black text-slate-900 border-b-2 border-emerald-500 dark:text-foreground">{jumlahJiwa}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setJumlahJiwa((j) => j + 1)}
                    className="size-14 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-2xl font-bold shadow hover:bg-emerald-200 dark:hover:bg-emerald-800 transition-colors"
                  >
                    +
                  </button>
                </div>
                <p className="text-sm text-slate-500 dark:text-muted-foreground w-full">
                  Tekan + / − untuk menyesuaikan total anggota keluarga.
                </p>
              </div>
            </div>

            {/* Jenis Bayar */}
            <div className="space-y-4">
              <Label className="text-base font-bold text-slate-700 dark:text-foreground">
                Bayar Menggunakan Apa?
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setJenisBayar("UANG")}
                  className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${
                    jenisBayar === "UANG" 
                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 shadow-sm"
                      : "border-slate-200 dark:border-white/10 hover:border-emerald-300 bg-white dark:bg-card"
                  }`}
                >
                  <Banknote className={`size-8 mb-2 ${jenisBayar === "UANG" ? "text-emerald-500" : "text-slate-400"}`} />
                  <span className={`font-bold ${jenisBayar === "UANG" ? "text-emerald-700 dark:text-emerald-300" : ""}`}>Uang Tunai</span>
                </button>
                <button
                  type="button"
                  onClick={() => setJenisBayar("BERAS")}
                  className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${
                    jenisBayar === "BERAS" 
                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 shadow-sm"
                      : "border-slate-200 dark:border-white/10 hover:border-emerald-300 bg-white dark:bg-card"
                  }`}
                >
                  <Wheat className={`size-8 mb-2 ${jenisBayar === "BERAS" ? "text-emerald-500" : "text-slate-400"}`} />
                  <span className={`font-bold ${jenisBayar === "BERAS" ? "text-emerald-700 dark:text-emerald-300" : ""}`}>Beras</span>
                </button>
              </div>
            </div>

            {/* Infaq */}
            <div className="space-y-2">
              <Label htmlFor="s2_infaq" className="text-base font-bold text-slate-700 dark:text-foreground">
                Membayar Infaq? <span className="text-slate-400 text-sm font-normal">(opsional)</span>
              </Label>
              <Input
                id="s2_infaq"
                type="number"
                min={0}
                step={1000}
                value={nominalInfaq}
                onChange={(e) => setNominalInfaq(e.target.value)}
                placeholder="Misal: 50000"
                className="h-14 font-semibold text-lg rounded-2xl border-2"
              />
            </div>

            {/* Navigasi Step 2 */}
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" size="xl" className="flex-1 gap-2" onClick={() => setStep(1)}>
                <ChevronLeft className="size-5" /> Kembali
              </Button>
              <Button 
                type="button" 
                variant="masjid" 
                size="xl" 
                className="flex-1 gap-2 shadow-md shadow-emerald-500/20" 
                onClick={() => {
                  if (jumlahJiwa < 1) return toast.error("Jumlah jiwa minimal 1.");
                  setStep(3);
                }}
              >
                Konfirmasi <ChevronRight className="size-5" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: Konfirmasi (Calculate Otomatis) */}
        {step === 3 && (
          <div className="rounded-3xl border-2 border-emerald-100 dark:border-emerald-900/50 bg-white dark:bg-card shadow-lg p-6 sm:p-8 space-y-6">
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-foreground text-center">
              Langkah 3: Cek Ringkasan Validasi 👀
            </h2>

            <div className="space-y-4">
              {/* Box Biodata */}
              <div className="rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 p-5 font-medium flex flex-col gap-2 relative">
                <span className="absolute top-4 right-5 text-sm text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded uppercase tracking-wider font-bold">Data</span>
                <p className="text-lg font-bold text-slate-900 dark:text-white pb-1">{namaKk}</p>
                <p className="text-slate-600 dark:text-slate-300">📍 {alamat}</p>
                <p className="text-slate-600 dark:text-slate-300">📅 Waktu: {new Date(waktuTransaksi).toLocaleString("id-ID")}</p>
              </div>

              {/* Box Kalkulasi */}
              <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border-2 border-emerald-100 dark:border-emerald-800/40 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Calculator className="size-6 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="text-lg font-extrabold text-emerald-900 dark:text-emerald-100">Otomatisasi Hitung Zakat</h3>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-semibold text-emerald-600/70 dark:text-emerald-400/70 mb-1">Total Jiwa</p>
                    <p className="text-3xl font-black text-slate-800 dark:text-white tabular-nums">{jumlahJiwa} <span className="text-lg font-semibold">Orang</span></p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-emerald-600/70 dark:text-emerald-400/70 mb-1">Membayar Melalui</p>
                    <p className="text-2xl font-black text-slate-800 dark:text-white">{jenisBayar === "UANG" ? "💰 UANG" : "🌾 BERAS"}</p>
                  </div>
                </div>

                <div className="h-0.5 bg-emerald-200 dark:bg-emerald-800/60 w-full my-4 rounded"></div>

                <div className="space-y-3">
                  <div className="flex justify-between items-end">
                    <p className="text-emerald-800 dark:text-emerald-200 font-bold">
                      Zakat Fitrah <br/><span className="text-xs font-normal opacity-80">(Total Zakat /jiwa = {jenisBayar === "UANG" ? formatCurrencyId(2.5 * hargaBeras) : "2.5 Kg"})</span>
                    </p>
                    <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
                      {jenisBayar === "UANG" ? formatCurrencyId(autoTotalUang) : `${autoTotalBeras.toFixed(1)} Kg`} 
                    </p>
                  </div>
                  
                  {Number(nominalInfaq) > 0 && (
                    <div className="flex justify-between items-end">
                      <p className="text-emerald-800 dark:text-emerald-200 font-semibold">Sumbangan Infaq</p>
                      <p className="text-xl font-bold text-emerald-600 dark:text-emerald-300">
                        {formatCurrencyId(Number(nominalInfaq))}
                      </p>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {formState.message ? (
              <div className="bg-rose-50 border-rose-200 border text-rose-600 p-3 rounded-xl text-sm font-semibold text-center">
                {formState.message}
              </div>
            ) : null}

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button type="button" variant="outline" size="xl" className="flex-1 gap-2 border-2" disabled={isSubmitting} onClick={() => setStep(2)}>
                <ChevronLeft className="size-5" /> Revisi Data
              </Button>
              <Button
                type="submit"
                variant="masjid"
                size="xl"
                className="flex-[2] gap-3 shadow-lg shadow-emerald-500/20 text-lg"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <><Loader2 className="size-6 animate-spin" /> Sedang Mengunci...</>
                ) : (
                  <><CheckCircle2 className="size-6" /> Kunci & Cetak Resi</>
                )}
              </Button>
            </div>
          </div>
        )}
      </form>

      {/* Dialog Nomor Resi */}
      <Dialog open={isSuccessOpen} onOpenChange={setIsSuccessOpen}>
        <DialogContent className="rounded-3xl border-2 border-emerald-300 dark:border-emerald-700 bg-white dark:bg-card shadow-2xl sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="sr-only">Transaksi Berhasil</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <span className="text-6xl">✅</span>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-foreground">Selesai!</h2>
            <p className="text-base text-slate-500 dark:text-muted-foreground">
              Sistem telah mencatat transaksi ini. Silakan catat <strong>Nomor Resi</strong> ini:
            </p>

            <div className="w-full rounded-3xl border-4 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 p-6">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400 mb-2">
                NO. BUKTI RESMI
              </p>
              <p className="text-3xl font-black text-emerald-700 dark:text-emerald-300 break-all leading-tight">
                {successCode}
              </p>
            </div>

            <Button
              type="button"
              variant="masjid"
              size="elder"
              className="w-full gap-3 mt-2 shadow-lg shadow-emerald-500/20"
              onClick={() => setIsSuccessOpen(false)}
            >
              Kembali Ke Awal
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
