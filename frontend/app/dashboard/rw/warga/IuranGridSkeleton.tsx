"use client";

import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const monthLabels = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

export function IuranGridSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200/60 bg-white/60 dark:border-border/60 dark:bg-card/30">
      <div className="px-4 py-4 md:px-5">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-44 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
      </div>

      <div className="border-t border-slate-200/60 dark:border-border/60">
        <Table className="min-w-275 text-sm">
          <TableHeader>
            <TableRow className="bg-slate-50/70 dark:bg-muted/30">
              <TableHead className="w-60">Nama KK</TableHead>
              <TableHead className="w-35">Tarif/Bulan</TableHead>
              {monthLabels.map((m) => (
                <TableHead key={m} className="text-center">
                  {m}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 6 }).map((_, rowIndex) => (
              <TableRow key={rowIndex}>
                <TableCell>
                  <Skeleton className="h-4 w-44 rounded-lg" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-24 rounded-lg" />
                </TableCell>
                {monthLabels.map((m) => (
                  <TableCell key={`${rowIndex}-${m}`} className="text-center">
                    <Skeleton className="mx-auto h-5 w-14 rounded-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
