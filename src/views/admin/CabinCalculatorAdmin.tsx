"use client";

import dynamic from "next/dynamic";
import { Loader2, Calculator } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/admin/PageHeader";
import { AdminCard, AdminCardContent } from "@/components/admin/AdminCard";

// SAME component the homepage serves — imported, never forked. It is a very large client island
// (~2,800 lines), so it is code-split into its own deferred chunk (ssr:false → it is not in the
// admin RSC payload and never runs on the server) exactly like CabinCalculatorLoader does for the
// public page. `adminTools` is the ONLY difference: it turns on the drawing PDF + watermark toggle.
const CabinCalculator = dynamic(() => import("@/components/home/cabin-calculator/CabinCalculator"), {
  ssr: false,
  // Reserve the calculator's height so the card never collapses while the chunk streams in.
  loading: () => (
    <div className="flex items-center justify-center rounded-2xl border border-border bg-card" style={{ minHeight: 520 }}>
      <Loader2 className="h-6 w-6 animate-spin text-amber" />
    </div>
  ),
});

export default function CabinCalculatorAdmin() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Cabin Design Calculator"
        description="The same cabin calculator customers use on the website — plus a drawing download (PDF) and a watermark toggle you can switch on or off before exporting."
        badge={<Badge variant="outline" className="font-mono">Admin</Badge>}
      />

      <AdminCard>
        <AdminCardContent>
          <h3 className="font-display font-bold flex items-center gap-2 mb-4">
            <Calculator className="h-4 w-4 text-amber" /> Customer cabin calculator
          </h3>
          <CabinCalculator adminTools />
        </AdminCardContent>
      </AdminCard>
    </div>
  );
}
