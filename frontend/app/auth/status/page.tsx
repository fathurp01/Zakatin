import Link from "next/link";
import { cookies } from "next/headers";
import { AlertTriangle, Clock3, ShieldX } from "lucide-react";
import { AUTH_STATUS_COOKIE, isValidStatusAkun, type StatusAkun } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const statusMeta: Record<StatusAkun, { title: string; description: string; icon: typeof Clock3 }> = {
  PENDING: {
    title: "Akun Anda sedang diproses",
    description:
      "Pengajuan akun Pengurus Masjid sudah diterima. Mohon tunggu proses verifikasi dari RW.",
    icon: Clock3,
  },
  REJECTED: {
    title: "Pengajuan akun ditolak",
    description:
      "Akun belum dapat diaktifkan. Silakan periksa data pengajuan atau hubungi pengurus RW.",
    icon: ShieldX,
  },
  APPROVED: {
    title: "Akun sudah disetujui",
    description: "Akun sudah aktif. Silakan kembali ke dashboard.",
    icon: AlertTriangle,
  },
};

export default async function AuthStatusPage() {
  const cookieStore = await cookies();
  const rawStatus = cookieStore.get(AUTH_STATUS_COOKIE)?.value;
  const resolvedStatus: StatusAkun = isValidStatusAkun(rawStatus) ? rawStatus : "PENDING";
  const meta = statusMeta[resolvedStatus];
  const Icon = meta.icon;

  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-12 md:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,#dbeafe_0%,transparent_45%),radial-gradient(circle_at_bottom_right,#ecfeff_0%,transparent_40%)] dark:bg-[radial-gradient(circle_at_top_left,#172554_0%,transparent_45%),radial-gradient(circle_at_bottom_right,#022c22_0%,transparent_40%)]" />

      <Card className="relative w-full max-w-2xl rounded-3xl border border-slate-100 bg-white/70 shadow-sm backdrop-blur dark:border-border/60 dark:bg-card/40">
        <CardHeader className="space-y-3">
          <Badge variant={resolvedStatus === "REJECTED" ? "destructive" : "pending"} className="w-fit">
            Status: {resolvedStatus}
          </Badge>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Icon className="size-5" />
            {meta.title}
          </CardTitle>
          <CardDescription>{meta.description}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="rounded-2xl border border-slate-100 bg-white/60 p-4 text-sm text-slate-600 shadow-sm dark:border-border/60 dark:bg-card/30 dark:text-muted-foreground">
            Jika Anda membutuhkan bantuan, siapkan email pendaftaran dan hubungi pengurus RW agar proses verifikasi lebih cepat.
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/auth/login"
              className="inline-flex h-9 items-center rounded-xl bg-slate-900 px-4 text-sm font-medium text-white transition-colors hover:bg-slate-800"
            >
              Kembali ke Login
            </Link>
            <Link
              href="/"
              className="inline-flex h-9 items-center rounded-xl border border-slate-200 bg-white/80 px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Ke Halaman Utama
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
