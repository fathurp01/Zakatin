"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
  /**
   * "icon" — small square icon button (untuk navbar)
   * "pill" — pill dengan label teks (untuk sidebar footer)
   */
  variant?: "icon" | "pill";
}

export function ThemeToggle({ className, variant = "icon" }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = resolvedTheme === "dark";

  const toggle = () => setTheme(isDark ? "light" : "dark");

  if (!mounted) {
    // Placeholder saat SSR — sama ukurannya supaya layout tidak shift
    if (variant === "pill") {
      return (
        <div className={cn("h-10 rounded-2xl bg-slate-100 dark:bg-white/5 animate-pulse", className)} />
      );
    }
    return <div className={cn("size-9 rounded-xl bg-slate-100 dark:bg-white/5 animate-pulse", className)} />;
  }

  if (variant === "pill") {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        className={cn(
          "flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-colors duration-200",
          "text-slate-500 dark:text-muted-foreground",
          "hover:bg-slate-100/70 hover:text-slate-700 dark:hover:bg-white/5 dark:hover:text-foreground",
          className
        )}
      >
        {/* Track (toggle switch visual) */}
        <span
          className={cn(
            "relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full border-2 border-transparent",
            "transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            isDark
              ? "bg-indigo-600"
              : "bg-slate-200"
          )}
        >
          <span
            className={cn(
              "inline-block size-3.5 rounded-full bg-white shadow-sm",
              "transition-transform duration-300",
              isDark ? "translate-x-4" : "translate-x-0.5"
            )}
          />
        </span>

        {/* Icon + label */}
        <span className="inline-flex size-8 flex-shrink-0 items-center justify-center rounded-xl border border-slate-200/60 bg-white dark:border-white/8 dark:bg-white/5">
          {isDark ? (
            <Moon className="size-4 text-indigo-400" />
          ) : (
            <Sun className="size-4 text-amber-500" />
          )}
        </span>
        <span className="font-medium">
          {isDark ? "Dark Mode" : "Light Mode"}
        </span>
      </button>
    );
  }

  // icon variant (for navbar)
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-xl border transition-all duration-200",
        "border-slate-200/60 bg-white/80 text-slate-500 hover:bg-slate-100 hover:text-slate-700",
        "dark:border-white/10 dark:bg-white/5 dark:text-muted-foreground dark:hover:bg-white/10 dark:hover:text-foreground",
        className
      )}
    >
      {isDark ? (
        <Sun className="size-4 text-amber-400" />
      ) : (
        <Moon className="size-4 text-indigo-500" />
      )}
    </button>
  );
}
