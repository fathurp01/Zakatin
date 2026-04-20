"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/context/AuthContext";
import type { ReactNode } from "react";

export const AppProviders = ({ children }: { children: ReactNode }) => {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <AuthProvider>
        {children}
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </ThemeProvider>
  );
};
