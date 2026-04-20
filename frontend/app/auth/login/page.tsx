"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api, getApiError, type FieldErrors } from "@/lib/axios";
import { useAuth } from "@/context/AuthContext";
import type { AppRole, AuthStoragePayload } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Loader2, Mail, Lock, ArrowRight, Landmark, HandCoins } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";

interface FormState {
  message: string;
  fieldErrors: FieldErrors;
}

const initialState: FormState = {
  message: "",
  fieldErrors: {},
};

const parseRole = (value: string | null): AppRole | null => {
  if (value === "RW" || value === "PENGURUS_MASJID") {
    return value;
  }

  return null;
};

const inferRoleFromNextPath = (nextPath: string | null): AppRole | null => {
  if (!nextPath) {
    return null;
  }

  if (nextPath.startsWith("/dashboard/rw")) {
    return "RW";
  }

  if (nextPath.startsWith("/dashboard/masjid")) {
    return "PENGURUS_MASJID";
  }

  return null;
};

const toRedirectPath = (role: AuthStoragePayload["user"]["role"], nextPath: string | null): string => {
  if (nextPath && nextPath.startsWith("/")) {
    return nextPath;
  }

  return role === "RW" ? "/dashboard/rw/warga" : "/dashboard/masjid";
};

export default function LoginPage() {
  const router = useRouter();
  const { setSession, isAuthenticated, user } = useAuth();
  const hasShownReasonRef = useRef(false);
  const [searchParamsState] = useState(() => {
    if (typeof window === "undefined") {
      return {
        nextPath: null as string | null,
        reason: null as string | null,
        role: null as AppRole | null,
      };
    }

    const params = new URLSearchParams(window.location.search);
    const nextPathFromQuery = params.get("next");

    return {
      nextPath: nextPathFromQuery,
      reason: params.get("reason"),
      role: parseRole(params.get("role")) ?? inferRoleFromNextPath(nextPathFromQuery),
    };
  });
  const [selectedRole, setSelectedRole] = useState<AppRole | null>(searchParamsState.role);

  const nextPath = searchParamsState.nextPath;
  const reason = searchParamsState.reason;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const url = new URL(window.location.href);

    if (selectedRole) {
      url.searchParams.set("role", selectedRole);
    } else {
      url.searchParams.delete("role");
    }

    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  }, [selectedRole]);

  useEffect(() => {
    if (!reason || hasShownReasonRef.current) {
      return;
    }

    hasShownReasonRef.current = true;

    if (reason === "approval_required") {
      toast.error("Akun Anda belum APPROVED. Silakan hubungi pengurus RW.");
      return;
    }

    if (reason === "unauthorized") {
      toast.error("Silakan login untuk mengakses dashboard.");
    }
  }, [reason]);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      return;
    }

    router.replace(toRedirectPath(user.role, nextPath));
  }, [isAuthenticated, user, nextPath, router]);

  const [formState, formAction, isPending] = useActionState<FormState, FormData>(
    async (_previousState, formData) => {
      const email = String(formData.get("email") ?? "").trim().toLowerCase();
      const password = String(formData.get("password") ?? "");
      const role = parseRole(String(formData.get("role") ?? "").trim());

      const fieldErrors: FieldErrors = {};

      if (!role) {
        fieldErrors.role = "Pilih jenis login terlebih dahulu.";
      }

      if (!email) {
        fieldErrors.email = "Email wajib diisi.";
      }

      if (!password) {
        fieldErrors.password = "Password wajib diisi.";
      }

      if (Object.keys(fieldErrors).length > 0) {
        return {
          message: "Periksa kembali input login.",
          fieldErrors,
        };
      }

      try {
        const response = await api.post<{ data: AuthStoragePayload }>("/auth/login", {
          email,
          password,
          role,
        });

        const session = response.data?.data;

        if (!session?.token || !session?.user) {
          toast.error("Respons login tidak valid dari server.");
          return {
            message: "Respons login tidak valid.",
            fieldErrors: {},
          };
        }

        if (session.user.role !== role) {
          toast.error("Role akun tidak sesuai dengan jenis login yang dipilih.");
          return {
            message: "Role akun tidak sesuai dengan jenis login yang dipilih.",
            fieldErrors: {
              role: "Pilih jenis login yang sesuai dengan akun Anda.",
            },
          };
        }

        setSession(session);
        toast.success("Login berhasil.");
        router.push(toRedirectPath(session.user.role, nextPath));

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
    <main className="flex flex-1 min-h-screen items-center justify-center px-4 py-12 hero-gradient">
      {/* Theme toggle — floating top-right */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      {/* Decorative blobs */}
      <div aria-hidden className="pointer-events-none fixed -top-40 -left-40 size-125 rounded-full bg-indigo-400/8 blur-3xl" />
      <div aria-hidden className="pointer-events-none fixed -bottom-40 -right-40 size-100 rounded-full bg-emerald-400/8 blur-3xl" />

      <div className="relative w-full max-w-md animate-fade-in">
        {/* Card */}
        <div className="rounded-3xl border border-slate-200/60 dark:border-white/8 bg-white/90 dark:bg-card/90 backdrop-blur-xl shadow-2xl shadow-slate-900/8 dark:shadow-black/30 p-8 sm:p-10">
          {/* Logo */}
          <div className="flex flex-col items-center gap-3 mb-8">
            <Link href="/" className="group">
              <span className="inline-flex size-16 items-center justify-center rounded-2xl bg-linear-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/30 group-hover:shadow-lg group-hover:shadow-indigo-500/40 transition-all duration-200">
                <Building2 className="size-8" />
              </span>
            </Link>
            <div className="text-center">
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-foreground">
                Pilih Login Sistem RWManage
              </h1>
              <p className="text-base text-slate-500 dark:text-muted-foreground mt-1">
                {selectedRole === "RW"
                  ? "Mode RW aktif. Lanjutkan dengan akun RW Anda."
                  : selectedRole === "PENGURUS_MASJID"
                    ? "Mode Pengurus Masjid aktif. Lanjutkan dengan akun pengurus."
                    : "Pilih dulu jenis login sebelum memasukkan email dan password."}
              </p>
            </div>
          </div>

          <form action={formAction} className="space-y-5">
            <input type="hidden" name="role" value={selectedRole ?? ""} />

            <div className="space-y-2">
              <Label className="text-base font-bold text-slate-700 dark:text-foreground/90">
                Jenis Login
              </Label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setSelectedRole("RW")}
                  disabled={isPending}
                  className={`rounded-2xl border px-4 py-4 text-left transition-colors ${
                    selectedRole === "RW"
                      ? "border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-950/40"
                      : "border-slate-200 hover:border-slate-300 dark:border-white/10 dark:hover:border-white/20"
                  }`}
                >
                  <span className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-foreground">
                    <Landmark className="size-4" />
                    Login sebagai RW
                  </span>
                  <span className="mt-1 block text-xs text-slate-500 dark:text-muted-foreground">
                    Kelola warga, iuran, kas RW, dan approval pengurus.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedRole("PENGURUS_MASJID")}
                  disabled={isPending}
                  className={`rounded-2xl border px-4 py-4 text-left transition-colors ${
                    selectedRole === "PENGURUS_MASJID"
                      ? "border-emerald-500 bg-emerald-50 dark:border-emerald-400 dark:bg-emerald-950/40"
                      : "border-slate-200 hover:border-slate-300 dark:border-white/10 dark:hover:border-white/20"
                  }`}
                >
                  <span className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-foreground">
                    <HandCoins className="size-4" />
                    Login sebagai Pengurus
                  </span>
                  <span className="mt-1 block text-xs text-slate-500 dark:text-muted-foreground">
                    Kelola kas masjid, transaksi ZIS, dan laporan masjid.
                  </span>
                </button>
              </div>
              {formState.fieldErrors.role ? (
                <p className="text-base text-destructive font-medium">{formState.fieldErrors.role}</p>
              ) : null}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-base font-bold text-slate-700 dark:text-foreground/90">
                Alamat Email
              </Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 size-5 text-slate-400 dark:text-muted-foreground" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="nama@email.com"
                  aria-invalid={Boolean(formState.fieldErrors.email)}
                  disabled={isPending || !selectedRole}
                  className="pl-12 h-14 text-base rounded-2xl"
                />
              </div>
              {formState.fieldErrors.email ? (
                <p className="text-base text-destructive font-medium">{formState.fieldErrors.email}</p>
              ) : null}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-base font-bold text-slate-700 dark:text-foreground/90">
                Kata Sandi
              </Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 size-5 text-slate-400 dark:text-muted-foreground" />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  aria-invalid={Boolean(formState.fieldErrors.password)}
                  disabled={isPending || !selectedRole}
                  className="pl-12 h-14 text-base rounded-2xl"
                />
              </div>
              {formState.fieldErrors.password ? (
                <p className="text-base text-destructive font-medium">{formState.fieldErrors.password}</p>
              ) : null}
            </div>

            {/* Global error */}
            {formState.message ? (
              <div className="rounded-2xl border-2 border-destructive/30 bg-destructive/8 px-5 py-4">
                <p className="text-base font-medium text-destructive">⚠️ {formState.message}</p>
              </div>
            ) : null}

            {/* Submit */}
            <Button
              type="submit"
              disabled={isPending || !selectedRole}
              variant="rw"
              size="elder"
              className="w-full justify-center gap-3 shadow-lg shadow-indigo-500/20"
            >
              {isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  {selectedRole === "RW"
                    ? "Masuk sebagai RW"
                    : selectedRole === "PENGURUS_MASJID"
                      ? "Masuk sebagai Pengurus"
                      : "Pilih Jenis Login"}
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-white/8">
            <p className="text-center text-sm text-slate-500 dark:text-muted-foreground">
              Belum punya akun?{" "}
              <Link
                href="/auth/register"
                className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline hover:underline-offset-4"
              >
                Daftar sekarang
              </Link>
            </p>
            <p className="text-center text-sm text-slate-500 dark:text-muted-foreground mt-2">
              atau{" "}
              <Link
                href="/"
                className="font-medium text-slate-700 dark:text-foreground hover:underline hover:underline-offset-4"
              >
                kembali ke beranda
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
