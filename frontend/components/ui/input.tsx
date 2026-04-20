import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // Base layout
        "h-10 w-full min-w-0 rounded-xl",
        // Colors & border
        "border border-input bg-white dark:bg-input/20 dark:border-white/10",
        // Typography
        "px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground",
        // Transitions
        "transition-all duration-200 outline-none",
        // Focus
        "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25",
        "dark:focus-visible:ring-ring/30",
        // File input
        "file:inline-flex file:h-8 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        // Disabled
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        // Invalid
        "aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20",
        "dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }
