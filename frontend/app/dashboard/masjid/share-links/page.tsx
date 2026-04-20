"use client";

import { useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import ShareLinkManager from "@/components/dashboard/ShareLinkManager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function MasjidShareLinksPage() {
  const { user } = useAuth();
  const scopeId = useMemo(() => user?.masjid_ids?.[0] ?? "", [user]);

  if (!scopeId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Share Link Masjid</CardTitle>
        </CardHeader>
        <CardContent>Data masjid tidak ditemukan pada sesi login.</CardContent>
      </Card>
    );
  }

  return <ShareLinkManager scope="MASJID" scopeId={scopeId} />;
}
