"use client";

import dynamic from "next/dynamic";
import { Boxes, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/admin/PageHeader";

// The panel is a client-only CRUD island that talks to Supabase on mount — it has nothing useful to
// render on the server, so it is code-split (ssr:false) and kept out of the admin RSC payload,
// exactly like CabinCalculatorAdmin does with the calculator.
const MaterialMasterPanel = dynamic(() => import("@/components/admin/boq/MaterialMasterPanel"), {
  ssr: false,
  loading: () => (
    <div
      className="flex items-center justify-center rounded-2xl border border-border bg-card"
      style={{ minHeight: 420 }}
    >
      <Loader2 className="h-6 w-6 animate-spin text-amber" />
    </div>
  ),
});

export default function MaterialMaster() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Material Master"
        description="The single source of truth for every weight and rate the Material BOQ prices with — steel sections, sheets, panels, boards, openings, hardware, electrical, plumbing and finishing. Rate changes are effective-dated, so an old quotation always re-prices at the rate that was live on its own date."
        badge={
          <Badge variant="outline" className="font-mono">
            BOQ
          </Badge>
        }
      />

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Boxes className="h-4 w-4 text-amber" />
        The BOQ engine never invents a kg/m or a ₹ — a material with no unit weight or no rate raises a
        validation error instead of guessing.
      </div>

      <MaterialMasterPanel />
    </div>
  );
}
