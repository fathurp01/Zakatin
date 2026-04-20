"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api, getApiError, type FieldErrors } from "@/lib/axios";
import { isUuid, type AppRole } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";

interface FormState {
  message: string;
  fieldErrors: FieldErrors;
}

interface WilayahRwOption {
  id: string;
  nama_kompleks: string;
  no_rw: string;
}

interface MasjidOption {
  id: string;
  nama_masjid: string;
  alamat: string;
  blok_wilayah_id: string;
  nama_blok: string;
  wilayah_rw_id: string;
  nama_kompleks: string;
  no_rw: string;
}

interface MasjidListResponse {
  data: {
    wilayah_rw: WilayahRwOption[];
    masjid: MasjidOption[];
  };
}

const initialState: FormState = {
  message: "",
  fieldErrors: {},
};

export default function RegisterPage() {
  const router = useRouter();

  const [role, setRole] = useState<AppRole>("RW");
  const [wilayahRwOptions, setWilayahRwOptions] = useState<WilayahRwOption[]>([]);
  const [masjidOptions, setMasjidOptions] = useState<MasjidOption[]>([]);
  const [selectedRwId, setSelectedRwId] = useState<string>("");
  const [isCatalogLoading, setIsCatalogLoading] = useState(false);

  useEffect(() => {
    if (role !== "PENGURUS_MASJID") {
      return;
    }

    if (masjidOptions.length > 0 || isCatalogLoading) {
      return;
    }

    const fetchCatalog = async () => {
      setIsCatalogLoading(true);
      try {
        const response = await api.get<MasjidListResponse>("/public/masjid-list");
        setWilayahRwOptions(response.data.data.wilayah_rw);
        setMasjidOptions(response.data.data.masjid);
      } catch (error) {
        const apiError = getApiError(error);
        toast.error(apiError.message);
      } finally {
        setIsCatalogLoading(false);
      }
    };

    fetchCatalog().catch(() => {
      toast.error("Gagal memuat daftar masjid.");
      setIsCatalogLoading(false);
    });
  }, [role, masjidOptions.length, isCatalogLoading]);

  const filteredMasjid = useMemo(() => {
    if (!selectedRwId) {
      return masjidOptions;
    }

    return masjidOptions.filter((masjid) => masjid.wilayah_rw_id === selectedRwId);
  }, [masjidOptions, selectedRwId]);

  const [formState, formAction, isPending] = useActionState<FormState, FormData>(
    async (_previousState, formData) => {
      const nama = String(formData.get("nama") ?? "").trim();
      const email = String(formData.get("email") ?? "").trim().toLowerCase();
      const noHp = String(formData.get("no_hp") ?? "").trim();
      const password = String(formData.get("password") ?? "");
      const selectedRole = String(formData.get("role") ?? "RW") as AppRole;
      const masjidId = String(formData.get("masjid_id") ?? "").trim();
      const blokWilayahIdInput = String(formData.get("blok_wilayah_id") ?? "").trim();

      const fieldErrors: FieldErrors = {};

      if (!nama) {
        fieldErrors.nama = "Nama wajib diisi.";
      }

      if (!email) {
        fieldErrors.email = "Email wajib diisi.";
      }

      if (!noHp) {
        fieldErrors.no_hp = "No HP wajib diisi.";
      }

      if (password.length < 8) {
        fieldErrors.password = "Password minimal 8 karakter.";
      }

      if (selectedRole !== "RW" && selectedRole !== "PENGURUS_MASJID") {
        fieldErrors.role = "Role tidak valid.";
      }

      const payload: Record<string, string> = {
        nama,
        email,
        no_hp: noHp,
        password,
        role: selectedRole,
      };

      if (selectedRole === "PENGURUS_MASJID") {
        if (!masjidId) {
          fieldErrors.masjid_id = "Masjid wajib dipilih untuk role Pengurus Masjid.";
        }

        if (masjidId && !isUuid(masjidId)) {
          fieldErrors.masjid_id = "masjid_id harus UUID valid.";
        }

        const matchedMasjid = masjidOptions.find((item) => item.id === masjidId);
        if (masjidId && matchedMasjid?.blok_wilayah_id) {
          payload.blok_wilayah_id = matchedMasjid.blok_wilayah_id;
        }

        if (masjidId) {
          payload.masjid_id = masjidId;
        }
      }

      if (selectedRole === "RW" && blokWilayahIdInput) {
        if (!isUuid(blokWilayahIdInput)) {
          fieldErrors.blok_wilayah_id = "blok_wilayah_id harus UUID valid.";
        } else {
          payload.blok_wilayah_id = blokWilayahIdInput;
        }
      }

      if (Object.keys(fieldErrors).length > 0) {
        return {
          message: "Periksa kembali input registrasi.",
          fieldErrors,
        };
      }

      try {
        await api.post("/auth/register", payload);
        toast.success("Registrasi berhasil. Silakan login.");
        router.push("/auth/login");

        return {
          message: "",
          fieldErrors: {},
        };
      } catch (error) {
        const apiError = getApiError(error);
        toast.error(apiError.message);

        return {
          message: apiError.message,
          fieldErrors: apiError.fieldErrors,
        };
      }
    },
    initialState
  );

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10 md:px-8">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Registrasi</CardTitle>
          <CardDescription>Buat akun sebagai RW atau Pengurus Masjid.</CardDescription>
        </CardHeader>

        <CardContent>
          <form action={formAction} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nama">Nama</Label>
                <Input id="nama" name="nama" aria-invalid={Boolean(formState.fieldErrors.nama)} disabled={isPending} />
                {formState.fieldErrors.nama ? (
                  <p className="text-xs text-destructive">{formState.fieldErrors.nama}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="no_hp">No HP</Label>
                <Input id="no_hp" name="no_hp" aria-invalid={Boolean(formState.fieldErrors.no_hp)} disabled={isPending} />
                {formState.fieldErrors.no_hp ? (
                  <p className="text-xs text-destructive">{formState.fieldErrors.no_hp}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  aria-invalid={Boolean(formState.fieldErrors.email)}
                  disabled={isPending}
                />
                {formState.fieldErrors.email ? (
                  <p className="text-xs text-destructive">{formState.fieldErrors.email}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  aria-invalid={Boolean(formState.fieldErrors.password)}
                  disabled={isPending}
                />
                {formState.fieldErrors.password ? (
                  <p className="text-xs text-destructive">{formState.fieldErrors.password}</p>
                ) : null}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <select
                id="role"
                name="role"
                value={role}
                onChange={(event) => {
                  const nextRole = event.target.value as AppRole;
                  setRole(nextRole);
                  if (nextRole !== "PENGURUS_MASJID") {
                    setSelectedRwId("");
                  }
                }}
                className="h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:opacity-50 dark:text-foreground"
                disabled={isPending}
                aria-invalid={Boolean(formState.fieldErrors.role)}
              >
                <option value="RW">RW</option>
                <option value="PENGURUS_MASJID">PENGURUS_MASJID</option>
              </select>
              {formState.fieldErrors.role ? (
                <p className="text-xs text-destructive">{formState.fieldErrors.role}</p>
              ) : null}
            </div>

            {role === "RW" ? (
              <div className="space-y-2">
                <Label htmlFor="blok_wilayah_id">Blok Wilayah ID (opsional, UUID)</Label>
                <Input
                  id="blok_wilayah_id"
                  name="blok_wilayah_id"
                  placeholder="550e8400-e29b-41d4-a716-446655440011"
                  aria-invalid={Boolean(formState.fieldErrors.blok_wilayah_id)}
                  disabled={isPending}
                />
                {formState.fieldErrors.blok_wilayah_id ? (
                  <p className="text-xs text-destructive">{formState.fieldErrors.blok_wilayah_id}</p>
                ) : null}
              </div>
            ) : null}

            {role === "PENGURUS_MASJID" ? (
              <Card size="sm" className="bg-white/60 dark:bg-card/30">
                <CardHeader>
                  <CardTitle className="text-sm">Pilih RW & Masjid</CardTitle>
                  <CardDescription>Gunakan filter RW bila diperlukan.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="rw_picker">Wilayah RW</Label>
                    {isCatalogLoading ? (
                      <Skeleton className="h-9 w-full rounded-lg" />
                    ) : (
                      <select
                        id="rw_picker"
                        value={selectedRwId}
                        onChange={(event) => setSelectedRwId(event.target.value)}
                        className="h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:opacity-50 dark:text-foreground"
                        disabled={isPending}
                      >
                        <option value="">Semua RW</option>
                        {wilayahRwOptions.map((rw) => (
                          <option key={rw.id} value={rw.id}>
                            {rw.nama_kompleks} - RW {rw.no_rw}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="masjid_id">Masjid</Label>
                    {isCatalogLoading ? (
                      <Skeleton className="h-9 w-full rounded-lg" />
                    ) : (
                      <select
                        id="masjid_id"
                        name="masjid_id"
                        className="h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:opacity-50 dark:text-foreground"
                        disabled={isPending}
                        aria-invalid={Boolean(formState.fieldErrors.masjid_id)}
                      >
                        <option value="">Pilih masjid</option>
                        {filteredMasjid.map((masjid) => (
                          <option key={masjid.id} value={masjid.id}>
                            {masjid.nama_masjid} - {masjid.nama_kompleks} RW {masjid.no_rw} ({masjid.nama_blok})
                          </option>
                        ))}
                      </select>
                    )}

                    {formState.fieldErrors.masjid_id ? (
                      <p className="text-xs text-destructive">{formState.fieldErrors.masjid_id}</p>
                    ) : null}

                    {isCatalogLoading ? (
                      <p className="text-xs text-slate-500 dark:text-muted-foreground">Memuat daftar RW dan masjid...</p>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {formState.message ? <p className="text-sm text-destructive">{formState.message}</p> : null}

            <Button type="submit" disabled={isPending} className="w-full justify-center" size="lg">
              {isPending ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  Memproses...
                </span>
              ) : (
                "Daftar"
              )}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex flex-col items-start gap-2">
          <p className="text-sm text-slate-500 dark:text-muted-foreground">
            Sudah punya akun?{" "}
            <Link
              href="/auth/login"
              className="font-medium text-slate-900 underline underline-offset-4 dark:text-foreground"
            >
              Login
            </Link>
          </p>
        </CardFooter>
      </Card>
    </main>
  );
}
