"use client";

import dynamic from "next/dynamic";
import { Loader2, Table2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/admin/PageHeader";

// The panel is a client-only CRUD island that talks to Supabase on mount — it has nothing useful to
// render on the server, so it is code-split (ssr:false) and kept out of the admin RSC payload,
// exactly like MaterialMaster does with the Material Master panel.
const TableConfigPanel = dynamic(() => import("@/components/admin/boq/TableConfigPanel"), {
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

export default function TableConfig() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Table Configuration"
        description="The catalogue behind the cabin design calculator's furniture — table types, shapes, standard size presets, supports, accessories, per-type margin/GST/wastage and the minimum clearances every collision check measures against."
        badge={
          <Badge variant="outline" className="font-mono">
            TABLES
          </Badge>
        }
      />

      <div className="flex items-start gap-2 text-sm text-muted-foreground">
        <Table2 className="h-4 w-4 text-amber flex-shrink-0 mt-0.5" />
        A table type added here is live in the calculator, the drawings, the BOQ and the quotation
        immediately — no code change and no deploy. Rates and weights are never stored here; they are
        read from the Material Master.
      </div>

      <TableConfigPanel />
    </div>
  );
}
