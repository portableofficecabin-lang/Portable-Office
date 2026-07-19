"use client";

/**
 * MATERIAL MASTER — admin CRUD (spec §1).
 *
 * The engine (src/lib/boq/*) never invents a kg/m or a ₹: every weight and rate a BOQ prices with is
 * read from THIS table. So this screen's real job is not "edit rows", it is "make it impossible to
 * ship a master that cannot be priced":
 *   · rows where isPriceable() is false are painted RED — those are exactly the rows that will emit a
 *     missing_unit_weight / missing_rate validation error and zero out a BOQ line;
 *   · count chips at the top say, in one glance, how many of those exist;
 *   · a rate change goes through "Revise rate", which INSERTS a new effective-dated row instead of
 *     mutating history, so a quotation priced last month re-prices at last month's rate.
 *
 * fetchMaterials() degrades to SEED_MATERIALS when the migration has not been applied (a documented
 * fact of this repo). When that happens `source === "seed"` and we show the amber banner + the seed
 * button. WRITES throw in that state — every write here surfaces the thrown message verbatim.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Boxes,
  Database,
  IndianRupee,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";

import {
  deleteMaterial,
  fetchMaterials,
  isPriceable,
  isStaleRate,
  reviseRate,
  seedMaterials,
  today,
  upsertMaterial,
} from "@/lib/boq/materialMaster";
import type {
  Material,
  MaterialCategory,
  RateUnit,
  Uom,
  WeightBasis,
} from "@/lib/boq/types";
import { specOf } from "@/lib/boq/types";

import { AdminCard, AdminCardContent } from "@/components/admin/AdminCard";
import { NumberInput } from "@/components/admin/NumberInput";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { formatINR } from "@/lib/exportUtils";
import { cn } from "@/lib/utils";

/* ==========================================================================
 * Option lists — one label table per union in src/lib/boq/types.ts
 * ========================================================================== */

const CATEGORIES: { value: MaterialCategory; label: string }[] = [
  { value: "steel_section", label: "Steel section" },
  { value: "sheet", label: "Sheet" },
  { value: "panel", label: "Panel" },
  { value: "insulation", label: "Insulation" },
  { value: "board", label: "Board" },
  { value: "floor_finish", label: "Floor finish" },
  { value: "door", label: "Door" },
  { value: "window", label: "Window" },
  { value: "hardware", label: "Hardware" },
  { value: "electrical", label: "Electrical" },
  { value: "plumbing", label: "Plumbing" },
  { value: "finishing", label: "Finishing" },
  { value: "misc", label: "Miscellaneous" },
];

const UOMS: { value: Uom; label: string }[] = [
  { value: "m", label: "m" },
  { value: "sqm", label: "sqm" },
  { value: "kg", label: "kg" },
  { value: "nos", label: "nos" },
  { value: "ltr", label: "ltr" },
  { value: "sheet", label: "sheet" },
  { value: "lot", label: "lot" },
];

const WEIGHT_BASES: { value: WeightBasis; label: string }[] = [
  { value: "kg_per_m", label: "kg / m" },
  { value: "kg_per_sqm", label: "kg / sqm" },
  { value: "kg_per_nos", label: "kg / nos" },
  { value: "none", label: "No weight" },
];

const RATE_UNITS: { value: RateUnit; label: string }[] = [
  { value: "per_kg", label: "₹ / kg" },
  { value: "per_m", label: "₹ / m" },
  { value: "per_sqm", label: "₹ / sqm" },
  { value: "per_nos", label: "₹ / nos" },
  { value: "per_sheet", label: "₹ / sheet" },
  { value: "per_stock_length", label: "₹ / stock length" },
  { value: "per_ltr", label: "₹ / ltr" },
  { value: "per_lot", label: "₹ / lot" },
];

const categoryLabel = (c: MaterialCategory): string =>
  CATEGORIES.find((x) => x.value === c)?.label ?? c;
const weightBasisLabel = (w: WeightBasis): string =>
  WEIGHT_BASES.find((x) => x.value === w)?.label ?? w;
const rateUnitLabel = (r: RateUnit): string =>
  RATE_UNITS.find((x) => x.value === r)?.label ?? r;

const SEED_BANNER =
  "Material Master table not found in the database — showing built-in defaults. Apply migration " +
  "supabase/migrations/20260713140000_material_master_boq.sql in the Supabase SQL editor, then click " +
  "Seed default materials.";

/* ==========================================================================
 * Draft — the dialog edits STRINGS so a cleared numeric field means NULL and
 * not 0. `unitWeight: 0` and `unitWeight: null` are very different to the
 * engine: 0 is a weightless material, null is a validation error.
 * ========================================================================== */

interface MaterialDraft {
  id?: string;
  key: string;
  name: string;
  category: MaterialCategory;
  sectionSize: string;
  thicknessMm: string;
  grade: string;
  uom: Uom;
  unitWeight: string;
  weightBasis: WeightBasis;
  stockLengthM: string;
  sheetLengthM: string;
  sheetWidthM: string;
  coverWidthM: string;
  sideLapM: string;
  endLapM: string;
  standardLengthM: string;
  purchaseRate: string;
  rateUnit: RateUnit;
  wastagePercent: string;
  supplier: string;
  effectiveDate: string;
  isActive: boolean;
  notes: string;
}

const str = (n: number | null | undefined): string =>
  n === null || n === undefined || !Number.isFinite(n) ? "" : String(n);

const numOrNull = (s: string): number | null => {
  const t = s.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

const toDraft = (m: Material): MaterialDraft => ({
  id: m.id,
  key: m.key,
  name: m.name,
  category: m.category,
  sectionSize: m.sectionSize,
  thicknessMm: str(m.thicknessMm),
  grade: m.grade,
  uom: m.uom,
  unitWeight: str(m.unitWeight),
  weightBasis: m.weightBasis,
  stockLengthM: str(m.stockLengthM),
  sheetLengthM: str(m.sheetLengthM),
  sheetWidthM: str(m.sheetWidthM),
  coverWidthM: str(m.coverWidthM),
  sideLapM: str(m.sideLapM),
  endLapM: str(m.endLapM),
  standardLengthM: str(m.standardLengthM),
  purchaseRate: str(m.purchaseRate),
  rateUnit: m.rateUnit,
  wastagePercent: str(m.wastagePercent),
  supplier: m.supplier,
  effectiveDate: m.effectiveDate,
  isActive: m.isActive,
  notes: m.notes ?? "",
});

const fromDraft = (d: MaterialDraft): Material => ({
  id: d.id,
  key: d.key.trim(),
  name: d.name.trim(),
  category: d.category,
  sectionSize: d.sectionSize.trim(),
  thicknessMm: numOrNull(d.thicknessMm),
  grade: d.grade.trim(),
  uom: d.uom,
  unitWeight: numOrNull(d.unitWeight),
  weightBasis: d.weightBasis,
  stockLengthM: numOrNull(d.stockLengthM),
  sheetLengthM: numOrNull(d.sheetLengthM),
  sheetWidthM: numOrNull(d.sheetWidthM),
  coverWidthM: numOrNull(d.coverWidthM),
  sideLapM: numOrNull(d.sideLapM),
  endLapM: numOrNull(d.endLapM),
  standardLengthM: numOrNull(d.standardLengthM),
  purchaseRate: numOrNull(d.purchaseRate),
  rateUnit: d.rateUnit,
  wastagePercent: numOrNull(d.wastagePercent) ?? 0,
  supplier: d.supplier.trim(),
  effectiveDate: d.effectiveDate || today(),
  isActive: d.isActive,
  notes: d.notes,
});

const emptyDraft = (): MaterialDraft => ({
  key: "",
  name: "",
  category: "steel_section",
  sectionSize: "",
  thicknessMm: "",
  grade: "",
  uom: "m",
  unitWeight: "",
  weightBasis: "kg_per_m",
  stockLengthM: "6",
  sheetLengthM: "",
  sheetWidthM: "",
  coverWidthM: "",
  sideLapM: "",
  endLapM: "",
  standardLengthM: "",
  purchaseRate: "",
  rateUnit: "per_kg",
  wastagePercent: "3",
  supplier: "",
  effectiveDate: today(),
  isActive: true,
  notes: "",
});

/** A material the engine cannot weigh — mirrors the `missing_unit_weight` validation issue. */
const missingWeight = (m: Material): boolean =>
  m.weightBasis !== "none" && (m.unitWeight === null || !(m.unitWeight > 0));

/** A material the engine cannot price — mirrors the `missing_rate` validation issue. */
const missingRate = (m: Material): boolean =>
  m.purchaseRate === null || !Number.isFinite(m.purchaseRate);

const errorMessage = (e: unknown): string =>
  e instanceof Error ? e.message : typeof e === "string" ? e : "Unknown error";

const sheetSize = (m: Material): string =>
  m.sheetLengthM && m.sheetWidthM ? `${m.sheetLengthM} × ${m.sheetWidthM} m` : "—";

/* ==========================================================================
 * Count chip
 * ========================================================================== */

type ChipTone = "neutral" | "good" | "bad" | "warn";

const CHIP_TONES: Record<ChipTone, string> = {
  neutral: "border-border bg-muted/40 text-foreground",
  good: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  bad: "border-destructive/30 bg-destructive/10 text-destructive",
  warn: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
};

function CountChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: ChipTone;
}) {
  return (
    <Card className={cn("border shadow-none", CHIP_TONES[tone])}>
      <CardContent className="px-4 py-3">
        <div className="text-2xl font-display font-bold leading-none">{value}</div>
        <div className="text-[11px] uppercase tracking-wider font-semibold opacity-80 mt-1">
          {label}
        </div>
      </CardContent>
    </Card>
  );
}

/* ==========================================================================
 * Panel
 * ========================================================================== */

export default function MaterialMasterPanel() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [source, setSource] = useState<"db" | "seed">("db");
  const [loadError, setLoadError] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<MaterialCategory | "all">("all");
  const [showInactive, setShowInactive] = useState(false);

  const [draft, setDraft] = useState<MaterialDraft | null>(null);
  const [isNew, setIsNew] = useState(false);

  const [reviseTarget, setReviseTarget] = useState<Material | null>(null);
  const [reviseRateValue, setReviseRateValue] = useState("");
  const [reviseDate, setReviseDate] = useState(today());

  const [deleteTarget, setDeleteTarget] = useState<Material | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetchMaterials();
    setMaterials(res.materials);
    setSource(res.source);
    setLoadError(res.error);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /* ---- derived ---- */

  const stats = useMemo(() => {
    const total = materials.length;
    let priceable = 0;
    let noWeight = 0;
    let noRate = 0;
    let stale = 0;
    for (const m of materials) {
      if (isPriceable(m)) priceable += 1;
      if (missingWeight(m)) noWeight += 1;
      if (missingRate(m)) noRate += 1;
      if (isStaleRate(m)) stale += 1;
    }
    return { total, priceable, noWeight, noRate, stale };
  }, [materials]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return materials.filter((m) => {
      if (!showInactive && !m.isActive) return false;
      if (category !== "all" && m.category !== category) return false;
      if (!q) return true;
      return (
        m.key.toLowerCase().includes(q) ||
        m.name.toLowerCase().includes(q) ||
        m.sectionSize.toLowerCase().includes(q) ||
        m.grade.toLowerCase().includes(q) ||
        m.supplier.toLowerCase().includes(q)
      );
    });
  }, [materials, search, category, showInactive]);

  /* ---- writes ---- */

  const onSeed = async () => {
    setBusy(true);
    try {
      const n = await seedMaterials();
      toast({
        title: n > 0 ? `Seeded ${n} material${n === 1 ? "" : "s"}` : "Nothing to seed",
        description:
          n > 0
            ? "The default Material Master is now live in the database."
            : "Every default key already exists in the master — no rows were overwritten.",
      });
      await load();
    } catch (e) {
      toast({ title: "Seeding failed", description: errorMessage(e), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const openNew = () => {
    setDraft(emptyDraft());
    setIsNew(true);
  };

  const openEdit = (m: Material) => {
    setDraft(toDraft(m));
    setIsNew(false);
  };

  const onSave = async () => {
    if (!draft) return;
    const material = fromDraft(draft);
    if (!material.key) {
      toast({
        title: "Key is required",
        description: "The key is the stable id every take-off item references, e.g. rhs-100x50x3.",
        variant: "destructive",
      });
      return;
    }
    if (!material.name) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }

    setBusy(true);
    try {
      const saved = await upsertMaterial(material);
      toast({
        title: isNew ? "Material added" : "Material updated",
        description: `${saved.name} (${saved.key})`,
      });
      setDraft(null);
      await load();
    } catch (e) {
      toast({ title: "Save failed", description: errorMessage(e), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const openRevise = (m: Material) => {
    setReviseTarget(m);
    setReviseRateValue(str(m.purchaseRate));
    setReviseDate(today());
  };

  const onRevise = async () => {
    if (!reviseTarget) return;
    const rate = numOrNull(reviseRateValue);
    if (rate === null) {
      toast({ title: "Enter a new rate", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const saved = await reviseRate(
        reviseTarget.key,
        rate,
        reviseDate || today(),
        reviseTarget,
      );
      toast({
        title: "Rate revised",
        description: `${saved.name} — ${formatINR(rate)} ${rateUnitLabel(saved.rateUnit)} effective ${saved.effectiveDate}.`,
      });
      setReviseTarget(null);
      await load();
    } catch (e) {
      toast({ title: "Revision failed", description: errorMessage(e), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async () => {
    if (!deleteTarget) return;
    if (!deleteTarget.id) {
      toast({
        title: "Nothing to delete",
        description:
          "This is a built-in default that has never been written to the database, so there is no row to remove.",
        variant: "destructive",
      });
      setDeleteTarget(null);
      return;
    }
    setBusy(true);
    try {
      await deleteMaterial(deleteTarget.id);
      toast({ title: "Material deleted", description: deleteTarget.name });
      setDeleteTarget(null);
      await load();
    } catch (e) {
      toast({ title: "Delete failed", description: errorMessage(e), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  /* ---- render ---- */

  const patch = (p: Partial<MaterialDraft>) =>
    setDraft((d) => (d ? { ...d, ...p } : d));

  return (
    <div className="space-y-5">
      {source === "seed" && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0 space-y-3">
              <div>
                <p className="font-display font-bold text-amber-900 dark:text-amber-200">
                  Material Master is not live — pricing from built-in defaults
                </p>
                <p className="text-sm text-amber-800 dark:text-amber-300/90 mt-1">{SEED_BANNER}</p>
                {loadError && (
                  <p className="text-xs font-mono text-amber-800/80 dark:text-amber-300/70 mt-2 break-words">
                    {loadError}
                  </p>
                )}
              </div>
              <Button
                onClick={() => void onSeed()}
                disabled={busy}
                className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl"
              >
                {busy ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Database className="mr-2 h-4 w-4" />
                )}
                Seed default materials
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <CountChip label="Total" value={stats.total} tone="neutral" />
        <CountChip label="Priceable" value={stats.priceable} tone="good" />
        <CountChip label="Missing weight" value={stats.noWeight} tone={stats.noWeight ? "bad" : "neutral"} />
        <CountChip label="Missing rate" value={stats.noRate} tone={stats.noRate ? "bad" : "neutral"} />
        <CountChip label="Stale > 180 d" value={stats.stale} tone={stats.stale ? "warn" : "neutral"} />
      </div>

      <AdminCard>
        <AdminCardContent className="p-4 lg:p-6 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search key, name, section, grade or supplier…"
                className="pl-9 rounded-xl"
              />
            </div>

            <Select
              value={category}
              onValueChange={(v) => setCategory(v as MaterialCategory | "all")}
            >
              <SelectTrigger className="w-full lg:w-56 rounded-xl">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border"
              title="The master only returns active rows to the pricing engine, so a de-activated material disappears from every BOQ."
            >
              <Switch id="show-inactive" checked={showInactive} onCheckedChange={setShowInactive} />
              <Label htmlFor="show-inactive" className="text-sm whitespace-nowrap cursor-pointer">
                Show inactive
              </Label>
            </div>

            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => void load()}
              disabled={loading || busy}
            >
              <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
              Reload
            </Button>

            <Button onClick={openNew} className="rounded-xl">
              <Plus className="mr-2 h-4 w-4" />
              New material
            </Button>
          </div>

          {stats.noWeight + stats.noRate > 0 && (
            <p className="text-sm text-destructive flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              Rows highlighted in red cannot be priced — the BOQ will raise a validation error and bill
              them at zero until a unit weight and a rate are supplied.
            </p>
          )}

          <div className="rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[220px]">Material</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="min-w-[150px]">Section / profile</TableHead>
                  <TableHead className="text-right">Thk (mm)</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>UOM</TableHead>
                  <TableHead className="text-right">Unit weight</TableHead>
                  <TableHead>Weight basis</TableHead>
                  <TableHead className="text-right">Stock len (m)</TableHead>
                  <TableHead>Sheet size</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead>Rate unit</TableHead>
                  <TableHead className="text-right">Wastage</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Effective</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={17} className="h-32 text-center text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin inline-block mr-2 align-middle" />
                      Loading Material Master…
                    </TableCell>
                  </TableRow>
                )}

                {!loading && visible.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={17} className="h-32 text-center text-muted-foreground">
                      <Boxes className="h-6 w-6 mx-auto mb-2 opacity-50" />
                      No materials match this filter.
                    </TableCell>
                  </TableRow>
                )}

                {!loading &&
                  visible.map((m) => {
                    const broken = !isPriceable(m);
                    const stale = isStaleRate(m);
                    return (
                      <TableRow
                        key={`${m.key}:${m.effectiveDate}`}
                        onClick={() => openEdit(m)}
                        className={cn(
                          "cursor-pointer",
                          broken && "bg-destructive/10 hover:bg-destructive/20",
                          !m.isActive && "opacity-60",
                        )}
                      >
                        <TableCell>
                          <div className="font-semibold text-foreground flex items-center gap-2">
                            {m.name}
                            {broken && (
                              <Badge variant="destructive" className="text-[10px]">
                                {missingWeight(m) && missingRate(m)
                                  ? "no weight + no rate"
                                  : missingWeight(m)
                                    ? "no weight"
                                    : "no rate"}
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs font-mono text-muted-foreground">{m.key}</div>
                          <div className="text-[11px] text-muted-foreground">{specOf(m)}</div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Badge variant="secondary" className="font-normal">
                            {categoryLabel(m.category)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{m.sectionSize || "—"}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {m.thicknessMm ?? "—"}
                        </TableCell>
                        <TableCell className="text-sm">{m.grade || "—"}</TableCell>
                        <TableCell className="font-mono text-xs">{m.uom}</TableCell>
                        <TableCell
                          className={cn(
                            "text-right tabular-nums",
                            missingWeight(m) && "text-destructive font-bold",
                          )}
                        >
                          {m.unitWeight ?? "—"}
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap">
                          {weightBasisLabel(m.weightBasis)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {m.stockLengthM ?? "—"}
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap">{sheetSize(m)}</TableCell>
                        <TableCell
                          className={cn(
                            "text-right tabular-nums whitespace-nowrap",
                            missingRate(m) && "text-destructive font-bold",
                          )}
                        >
                          {m.purchaseRate === null ? "—" : formatINR(m.purchaseRate)}
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap">
                          {rateUnitLabel(m.rateUnit)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{m.wastagePercent}%</TableCell>
                        <TableCell className="text-sm">{m.supplier || "—"}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          <span className="text-xs font-mono">{m.effectiveDate}</span>
                          {stale && (
                            <Badge
                              variant="outline"
                              className="ml-2 text-[10px] border-amber-500/40 text-amber-700 dark:text-amber-400"
                            >
                              stale
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {m.isActive ? (
                            <Badge variant="outline" className="text-[10px]">
                              active
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px]">
                              inactive
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <div
                            className="flex items-center justify-end gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2"
                              title="Revise rate (keeps history)"
                              onClick={() => openRevise(m)}
                            >
                              <IndianRupee className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2"
                              title="Edit material"
                              onClick={() => openEdit(m)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2 text-destructive hover:text-destructive"
                              title="Delete material"
                              onClick={() => setDeleteTarget(m)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </div>

          <p className="text-xs text-muted-foreground">
            Showing {visible.length} of {stats.total} materials · source:{" "}
            <span className="font-mono">{source}</span>. The BOQ engine reads weights and rates only
            from this table — it never guesses a kg/m or a ₹.
          </p>
        </AdminCardContent>
      </AdminCard>

      {/* ---------------- Edit / create dialog ---------------- */}
      <Dialog open={draft !== null} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isNew ? "New material" : "Edit material"}</DialogTitle>
            <DialogDescription>
              Every weight and rate the BOQ engine uses comes from here. Editing the rate on this form
              REWRITES history — use “Revise rate” instead if old quotations must stay reproducible.
            </DialogDescription>
          </DialogHeader>

          {draft && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="f-key">Key *</Label>
                <Input
                  id="f-key"
                  value={draft.key}
                  onChange={(e) => patch({ key: e.target.value })}
                  placeholder="rhs-100x50x3"
                  className="font-mono"
                />
                <p className="text-[11px] text-muted-foreground">
                  Stable business key referenced by every take-off item. Changing it on an existing
                  material orphans the take-offs that point at it.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="f-name">Name *</Label>
                <Input
                  id="f-name"
                  value={draft.name}
                  onChange={(e) => patch({ name: e.target.value })}
                  placeholder="MS Rectangular Tube 100 × 50 × 3 mm"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select
                  value={draft.category}
                  onValueChange={(v) => patch({ category: v as MaterialCategory })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="f-section">Section / profile size</Label>
                <Input
                  id="f-section"
                  value={draft.sectionSize}
                  onChange={(e) => patch({ sectionSize: e.target.value })}
                  placeholder="100 × 50 mm RHS"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="f-thk">Thickness (mm)</Label>
                <NumberInput
                  id="f-thk"
                  value={draft.thicknessMm}
                  onChange={(e) => patch({ thicknessMm: e.target.value })}
                  step="0.1"
                  placeholder="blank = not applicable"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="f-grade">Grade</Label>
                <Input
                  id="f-grade"
                  value={draft.grade}
                  onChange={(e) => patch({ grade: e.target.value })}
                  placeholder="IS 4923 YSt 210"
                />
              </div>

              <div className="space-y-1.5">
                <Label>UOM (billed unit)</Label>
                <Select value={draft.uom} onValueChange={(v) => patch({ uom: v as Uom })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UOMS.map((u) => (
                      <SelectItem key={u.value} value={u.value}>
                        {u.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Weight basis</Label>
                <Select
                  value={draft.weightBasis}
                  onValueChange={(v) => patch({ weightBasis: v as WeightBasis })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WEIGHT_BASES.map((w) => (
                      <SelectItem key={w.value} value={w.value}>
                        {w.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="f-weight">Unit weight ({weightBasisLabel(draft.weightBasis)})</Label>
                <NumberInput
                  id="f-weight"
                  value={draft.unitWeight}
                  onChange={(e) => patch({ unitWeight: e.target.value })}
                  step="0.01"
                  placeholder="6.71"
                />
                <p className="text-[11px] text-muted-foreground">
                  Blank ⇒ the engine raises a <span className="font-mono">missing_unit_weight</span>{" "}
                  error and prices the line at zero. It never guesses.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="f-stock">Standard stock length (m)</Label>
                <NumberInput
                  id="f-stock"
                  value={draft.stockLengthM}
                  onChange={(e) => patch({ stockLengthM: e.target.value })}
                  step="0.1"
                  placeholder="6"
                />
                <p className="text-[11px] text-muted-foreground">
                  Steel only. Blank ⇒ no bar nesting — the purchase report buys the exact length.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="f-sheetl">Standard sheet length (m)</Label>
                <NumberInput
                  id="f-sheetl"
                  value={draft.sheetLengthM}
                  onChange={(e) => patch({ sheetLengthM: e.target.value })}
                  step="0.01"
                  placeholder="3"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="f-sheetw">Standard sheet width (m)</Label>
                <NumberInput
                  id="f-sheetw"
                  value={draft.sheetWidthM}
                  onChange={(e) => patch({ sheetWidthM: e.target.value })}
                  step="0.01"
                  placeholder="1"
                />
              </div>

              {/* Lapped-layout config (spec §12–§14). Sheets/panels only. Set a side/end lap to switch
                  this material from the plain area count to a row-by-row lapped layout. */}
              <div className="space-y-1.5">
                <Label htmlFor="f-cover">Effective cover width (m)</Label>
                <NumberInput
                  id="f-cover"
                  value={draft.coverWidthM}
                  onChange={(e) => patch({ coverWidthM: e.target.value })}
                  step="0.01"
                  placeholder="(sheet width)"
                />
                <p className="text-[11px] text-muted-foreground">
                  Blank ⇒ uses the sheet width. The usable width before the side-lap deduction.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="f-sidelap">Side lap (m)</Label>
                <NumberInput
                  id="f-sidelap"
                  value={draft.sideLapM}
                  onChange={(e) => patch({ sideLapM: e.target.value })}
                  step="0.005"
                  placeholder="0"
                />
                <p className="text-[11px] text-muted-foreground">
                  A side or end lap &gt; 0 turns on lapped layout (rows, full/cut, off-cut). Blank/0 ⇒ plain area count.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="f-endlap">End lap (m)</Label>
                <NumberInput
                  id="f-endlap"
                  value={draft.endLapM}
                  onChange={(e) => patch({ endLapM: e.target.value })}
                  step="0.01"
                  placeholder="0"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="f-stdlen">Standard sheet length for layout (m)</Label>
                <NumberInput
                  id="f-stdlen"
                  value={draft.standardLengthM}
                  onChange={(e) => patch({ standardLengthM: e.target.value })}
                  step="0.01"
                  placeholder="(sheet length)"
                />
                <p className="text-[11px] text-muted-foreground">
                  Blank ⇒ uses the sheet length. A run longer than this is split into lapped rows.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="f-rate">Purchase rate (₹)</Label>
                <NumberInput
                  id="f-rate"
                  value={draft.purchaseRate}
                  onChange={(e) => patch({ purchaseRate: e.target.value })}
                  step="0.01"
                  placeholder="68"
                />
                <p className="text-[11px] text-muted-foreground">
                  Blank ⇒ <span className="font-mono">missing_rate</span> error.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label>Rate unit</Label>
                <Select
                  value={draft.rateUnit}
                  onValueChange={(v) => patch({ rateUnit: v as RateUnit })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RATE_UNITS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  ₹/kg needs a unit weight · ₹/sheet needs a sheet size · ₹/stock length needs a stock
                  length.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="f-wastage">Wastage (%)</Label>
                <NumberInput
                  id="f-wastage"
                  value={draft.wastagePercent}
                  onChange={(e) => patch({ wastagePercent: e.target.value })}
                  step="0.5"
                  placeholder="3"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="f-supplier">Supplier</Label>
                <Input
                  id="f-supplier"
                  value={draft.supplier}
                  onChange={(e) => patch({ supplier: e.target.value })}
                  placeholder="Vendor name"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="f-eff">Effective date</Label>
                <Input
                  id="f-eff"
                  type="date"
                  value={draft.effectiveDate}
                  onChange={(e) => patch({ effectiveDate: e.target.value })}
                />
                <p className="text-[11px] text-muted-foreground">
                  A quotation prices with the latest row whose effective date is on or before its own
                  date.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-6">
                <Switch
                  id="f-active"
                  checked={draft.isActive}
                  onCheckedChange={(v) => patch({ isActive: v })}
                />
                <Label htmlFor="f-active" className="cursor-pointer">
                  Active
                </Label>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="f-notes">Notes</Label>
                <Textarea
                  id="f-notes"
                  value={draft.notes}
                  onChange={(e) => patch({ notes: e.target.value })}
                  rows={2}
                  placeholder="Anything the purchase team needs to know about this item."
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDraft(null)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={() => void onSave()} disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isNew ? "Add material" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------------- Revise rate dialog ---------------- */}
      <Dialog open={reviseTarget !== null} onOpenChange={(o) => !o && setReviseTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Revise rate</DialogTitle>
            <DialogDescription>
              A revision <strong>inserts a new effective-dated row</strong> rather than mutating the
              existing one, so rate history is preserved and every old quotation still re-prices at the
              rate that was live on its own date.
            </DialogDescription>
          </DialogHeader>

          {reviseTarget && (
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-muted/40 px-4 py-3">
                <div className="font-semibold">{reviseTarget.name}</div>
                <div className="text-xs font-mono text-muted-foreground">{reviseTarget.key}</div>
                <div className="text-sm mt-2">
                  Current:{" "}
                  <span className="font-semibold">
                    {reviseTarget.purchaseRate === null
                      ? "— (no rate)"
                      : formatINR(reviseTarget.purchaseRate)}
                  </span>{" "}
                  <span className="text-muted-foreground">
                    {rateUnitLabel(reviseTarget.rateUnit)} · effective {reviseTarget.effectiveDate}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="r-rate">New rate (₹)</Label>
                  <NumberInput
                    id="r-rate"
                    value={reviseRateValue}
                    onChange={(e) => setReviseRateValue(e.target.value)}
                    step="0.01"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="r-date">Effective from</Label>
                  <Input
                    id="r-date"
                    type="date"
                    value={reviseDate}
                    onChange={(e) => setReviseDate(e.target.value)}
                  />
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Revising the same material twice on the same date overwrites that day’s row — the unique
                key is (material key, effective date).
              </p>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setReviseTarget(null)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={() => void onRevise()} disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save revision
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------------- Delete confirm ---------------- */}
      <Dialog open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete material?
            </DialogTitle>
            <DialogDescription>
              {deleteTarget ? (
                <>
                  <span className="font-semibold text-foreground">{deleteTarget.name}</span> (
                  <span className="font-mono">{deleteTarget.key}</span>) will be removed from the
                  Material Master. Any take-off item that still references this key will raise an{" "}
                  <span className="font-mono">unknown_material</span> error. Deactivate it instead if
                  old quotations must keep re-pricing.
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void onDelete()} disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
