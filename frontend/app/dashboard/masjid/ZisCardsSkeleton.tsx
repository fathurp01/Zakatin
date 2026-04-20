"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function ZisCardsSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <Card key={index} className="bg-white/60 dark:bg-card/30">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-28 rounded-lg" />
              <Skeleton className="h-7 w-36 rounded-lg" />
            </div>
            <Skeleton className="size-10 rounded-2xl" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-40 rounded-lg" />
          </CardContent>
        </Card>
      ))}

      <Card className="bg-white/60 dark:bg-card/30 lg:col-span-3">
        <CardHeader>
          <Skeleton className="h-5 w-56 rounded-lg" />
          <Skeleton className="mt-2 h-4 w-72 rounded-lg" />
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full rounded-2xl" />
          ))}
        </CardContent>
      </Card>

      <Card className="bg-white/60 dark:bg-card/30 lg:col-span-3">
        <CardHeader>
          <Skeleton className="h-5 w-56 rounded-lg" />
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full rounded-2xl" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
