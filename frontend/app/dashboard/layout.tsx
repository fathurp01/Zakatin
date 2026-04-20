import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { AUTH_ROLE_COOKIE, isValidRole, type AppRole } from "@/lib/auth";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const roleFromCookie = cookieStore.get(AUTH_ROLE_COOKIE)?.value;
  const role: AppRole | null = isValidRole(roleFromCookie) ? roleFromCookie : null;

  return (
    <div className="flex flex-1 flex-col md:flex-row page-gradient min-h-screen">
      {/* Sidebar */}
      <aside className="
        md:w-72 md:min-h-screen md:flex-shrink-0
        border-b md:border-b-0 md:border-r
        border-slate-200/60 dark:border-white/8
        bg-white/80 dark:bg-card/80
        backdrop-blur-xl
        md:sticky md:top-0 md:h-screen md:overflow-y-auto
      ">
        <DashboardSidebar role={role} />
      </aside>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="bg-dot-grid absolute inset-0 pointer-events-none opacity-40 dark:opacity-20" />
        <div className="relative mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 md:px-8 md:py-8">
          {children}
        </div>
      </div>
    </div>
  );
}
