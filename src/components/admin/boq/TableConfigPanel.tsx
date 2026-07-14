"use client";

/**
 * TABLE CONFIGURATION — admin CRUD (spec §24).
 *
 * Spec §24's hard requirement is "add new table types WITHOUT changing the application code". That is
 * exactly what this screen is: `cabin_table_types` is the live catalogue, TABLE_TYPES is only the
 * built-in fallback + the seed, and tableCatalog.ts merges the DB over the built-ins at runtime. So a
 * type the admin creates here shows up in the customer's table editor, the 2D plan, the BOQ take-off
 * and the quotation with no deploy.
 *
 * Two consequences of that merge shape this UI, and both are surfaced to the admin rather than hidden:
 *   · a DB row WINS over a built-in of the same key — editing "Executive Table" writes an OVERRIDE;
 *   · deleting that row does not remove the type, it reverts it to the built-in. The only way to take
 *     a built-in out of the catalogue is to de-activate it (which writes an override with is_active
 *     false). Custom, DB-only types delete for real.
 *
 * fetchTableTypes()/fetchClearances() degrade to the built-ins when the migration has not been applied
 * (a documented fact of this repo) and report source "builtin" — that is the amber banner. Reads never
 * throw, WRITES do, and every write here surfaces the thrown message verbatim.
 *
 * NO RATE LIVES HERE (spec §23). Every ₹ and every kg a table is priced with is read from the Material
 * Master; the Materials & Rates tab is a read-only window onto it, not a second master.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Boxes,
  Database,
  ExternalLink,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Ruler,
  Save,
  Search,
  Table2,
  Trash2,
} from "lucide-react";

import {
  deleteTableType,
  fetchClearances,
  fetchTableTypes,
  saveClearances,
  seedTableTypes,
  upsertTableType,
  BUILTIN_TYPES,
  type TableTypeRecord,
} from "@/features/cabin-design/furniture/tables/tableCatalog";
import {
  DEFAULT_CLEARANCES,
  type ClearanceRules,
  type TableShape,
} from "@/features/cabin-design/furniture/tables/tableSchema";
import {
  ACCESSORIES,
  ACCESSORY_GROUPS,
  ELECTRICAL_ACCESSORY_IDS,
  SUPPORT_TYPES,
  TABLE_SHAPES,
  TABLE_TYPE_GROUPS,
  findSupport,
  type SeatingModel,
  type TablePreset,
  type TableTypeDef,
} from "@/features/cabin-design/furniture/tables/tableTypes";
import { TABLETOP_MATERIAL_KEYS } from "@/lib/boq/furnitureMaterials";
import { fetchMaterials } from "@/lib/boq/materialMaster";
import type { Material, RateUnit, WeightBasis } from "@/lib/boq/types";

import { AdminCard, AdminCardContent } from "@/components/admin/AdminCard";
import { NumberInput } from "@/components/admin/NumberInput";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { formatINR } from "@/lib/exportUtils";
import { cn } from "@/lib/utils";

/* ==========================================================================
 * Option lists — one label table per union in tableTypes.ts / tableSchema.ts
 * ========================================================================== */

const SEATING_MODELS: { value: SeatingModel; label: string; note: string }[] = [
  { value: "single", label: "Single user", note: "1 seat — staff / executive / computer desk" },
  { value: "perimeter", label: "Perimeter", note: "Seats fit round the top — conference / dining" },
  { value: "workstation", label: "Workstation", note: "Seats = number of users" },
  { value: "counter", label: "Counter", note: "Reception — staff side + visitor side" },
  { value: "none", label: "No seating", note: "Wall-mounted / folding" },
];

type TableSymbol = NonNullable<TableTypeDef["symbol"]>;

const SYMBOLS: { value: TableSymbol; label: string }[] = [
  { value: "desk", label: "Desk" },
  { value: "conference", label: "Conference" },
  { value: "round", label: "Round" },
  { value: "workstation", label: "Workstation" },
  { value: "reception", label: "Reception" },
  { value: "counter", label: "Counter" },
  { value: "wall", label: "Wall-mounted" },
];

type TablePanel = NonNullable<TableTypeDef["panels"]>[number];

const PANELS: { value: TablePanel; label: string }[] = [
  { value: "workstation", label: "Workstation block" },
  { value: "conference", label: "Conference block" },
  { value: "reception", label: "Reception block" },
  { value: "wallMount", label: "Wall-mount block" },
];

const CLEARANCE_FIELDS: { key: keyof ClearanceRules; label: string; note: string }[] = [
  { key: "chairMovementMm", label: "Chair movement", note: "Pull-out space behind a seated edge." },
  { key: "walkingPassageMm", label: "Walking passage", note: "Normal circulation between furniture." },
  { key: "mainPassageMm", label: "Main passage", note: "Primary circulation route through the cabin." },
  { key: "tableFromWallMm", label: "Table from wall", note: "When NO chair sits on that edge." },
  { key: "seatedTableFromWallMm", label: "Seated table from wall", note: "When a chair DOES sit on that edge." },
  { key: "drawerOpeningMm", label: "Drawer opening", note: "Space to pull a drawer / open a cabinet." },
  { key: "doorSwingMarginMm", label: "Door-swing margin", note: "Extra margin around a door's swing arc." },
  { key: "workstationAisleMm", label: "Workstation aisle", note: "Aisle between workstation rows." },
];

const WEIGHT_BASIS_LABEL: Record<WeightBasis, string> = {
  kg_per_m: "kg / m",
  kg_per_sqm: "kg / sqm",
  kg_per_nos: "kg / nos",
  none: "—",
};

const RATE_UNIT_LABEL: Record<RateUnit, string> = {
  per_kg: "₹ / kg",
  per_m: "₹ / m",
  per_sqm: "₹ / sqm",
  per_nos: "₹ / nos",
  per_sheet: "₹ / sheet",
  per_stock_length: "₹ / stock length",
  per_ltr: "₹ / ltr",
  per_lot: "₹ / lot",
};

const MIGRATION_FILE = "supabase/migrations/20260714100000_table_customisation_module.sql";

/** Every Material Master key the table module can consume — the Materials & Rates tab's filter. */
const FURNITURE_KEY_PREFIXES = [
  "board-", "top-", "laminate", "powdercoat", "edgeband-", "adhesive-",
  "shs-", "rhs-", "ms-flat", "ss-pipe", "alu-profile", "cable-tray",
  "partition-", "hw-", "acc-", "chair-", "elec-", "lab-",
];

const isFurnitureKey = (key: string): boolean =>
  FURNITURE_KEY_PREFIXES.some((p) => key.startsWith(p));

const BUILTIN_KEYS = new Set(BUILTIN_TYPES.map((t) => t.id));

const shapeLabel = (s: TableShape): string =>
  TABLE_SHAPES.find((x) => x.id === s)?.label ?? s;

const seatingLabel = (s: SeatingModel): string =>
  SEATING_MODELS.find((x) => x.value === s)?.label ?? s;

const errorMessage = (e: unknown): string =>
  e instanceof Error ? e.message : typeof e === "string" ? e : "Unknown error";

/* ==========================================================================
 * Drafts — the dialog edits STRINGS so a cleared numeric field means "inherit"
 * and not 0. A per-type margin of `null` means "use the global BOQ margin"; a
 * margin of 0 means "this type carries no margin". They are not the same thing.
 * ========================================================================== */

interface PresetDraft {
  id: string;
  label: string;
  lengthMm: string;
  depthMm: string;
  heightMm: string;
  diameterMm: string;
  seats: string;
}

interface TypeDraft {
  dbId?: string;
  key: string;
  label: string;
  short: string;
  group: TableTypeDef["group"];
  shapes: TableShape[];
  defaultShape: TableShape;
  presets: PresetDraft[];
  defaultSupportId: string;
  defaultMaterialKey: string;
  defaultAccessories: string[];
  seatingModel: SeatingModel;
  panels: TablePanel[];
  symbol: TableSymbol;
  marginPercent: string;
  gstPercent: string;
  wastagePercent: string;
  sortOrder: string;
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

const presetToDraft = (p: TablePreset): PresetDraft => ({
  id: p.id,
  label: p.label,
  lengthMm: str(p.lengthMm),
  depthMm: str(p.depthMm),
  heightMm: str(p.heightMm),
  diameterMm: str(p.diameterMm),
  seats: str(p.seats),
});

const presetFromDraft = (d: PresetDraft): TablePreset => {
  const lengthMm = numOrNull(d.lengthMm) ?? 0;
  const depthMm = numOrNull(d.depthMm) ?? 0;
  const heightMm = numOrNull(d.heightMm) ?? 750;
  const diameterMm = numOrNull(d.diameterMm);
  const seats = numOrNull(d.seats);
  const id = d.id.trim() || `${lengthMm}x${depthMm}`;
  return {
    id,
    label: d.label.trim() || `${lengthMm} × ${depthMm} × ${heightMm}`,
    lengthMm,
    depthMm,
    heightMm,
    ...(diameterMm !== null ? { diameterMm } : {}),
    ...(seats !== null ? { seats } : {}),
  };
};

const emptyPreset = (): PresetDraft => ({
  id: "",
  label: "",
  lengthMm: "1200",
  depthMm: "600",
  heightMm: "750",
  diameterMm: "",
  seats: "1",
});

const toDraft = (t: TableTypeRecord): TypeDraft => ({
  dbId: t.dbId,
  key: t.id,
  label: t.label,
  short: t.short,
  group: t.group,
  shapes: [...t.shapes],
  defaultShape: t.defaultShape,
  presets: t.presets.map(presetToDraft),
  defaultSupportId: t.defaultSupportId,
  defaultMaterialKey: t.defaultMaterialKey,
  defaultAccessories: [...t.defaultAccessories],
  seatingModel: t.seatingModel,
  panels: [...(t.panels ?? [])],
  symbol: t.symbol ?? "desk",
  marginPercent: str(t.marginPercent),
  gstPercent: str(t.gstPercent),
  wastagePercent: str(t.wastagePercent),
  sortOrder: str(t.sortOrder),
  isActive: t.isActive,
  notes: t.notes ?? "",
});

const fromDraft = (d: TypeDraft): TableTypeRecord => {
  // The default shape must always be an allowed shape, or createTable() would build a table the type
  // does not permit. The checkbox for it is disabled, but belt and braces.
  const shapes = d.shapes.includes(d.defaultShape) ? d.shapes : [d.defaultShape, ...d.shapes];
  return {
    id: d.key.trim(),
    label: d.label.trim(),
    short: (d.short.trim() || d.label.trim()).toUpperCase(),
    group: d.group,
    shapes,
    defaultShape: d.defaultShape,
    presets: d.presets.map(presetFromDraft).filter((p) => p.lengthMm > 0 && p.depthMm > 0),
    defaultSupportId: d.defaultSupportId,
    defaultMaterialKey: d.defaultMaterialKey,
    defaultAccessories: d.defaultAccessories,
    seatingModel: d.seatingModel,
    panels: d.panels,
    symbol: d.symbol,
    isActive: d.isActive,
    dbId: d.dbId,
    marginPercent: numOrNull(d.marginPercent),
    gstPercent: numOrNull(d.gstPercent),
    wastagePercent: numOrNull(d.wastagePercent),
    sortOrder: numOrNull(d.sortOrder) ?? 100,
    notes: d.notes.trim(),
  };
};

const emptyDraft = (nextSort: number): TypeDraft => ({
  key: "",
  label: "",
  short: "",
  group: "Desks",
  shapes: ["rectangle"],
  defaultShape: "rectangle",
  presets: [emptyPreset()],
  defaultSupportId: "ms-legs-4",
  defaultMaterialKey: "board-prelam-18",
  defaultAccessories: [],
  seatingModel: "single",
  panels: [],
  symbol: "desk",
  marginPercent: "",
  gstPercent: "",
  wastagePercent: "",
  sortOrder: String(nextSort),
  isActive: true,
  notes: "",
});

/* ==========================================================================
 * Count chip — same component the Material Master uses
 * ========================================================================== */

type ChipTone = "neutral" | "good" | "warn";

const CHIP_TONES: Record<ChipTone, string> = {
  neutral: "border-border bg-muted/40 text-foreground",
  good: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  warn: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
};

function CountChip({ label, value, tone }: { label: string; value: number; tone: ChipTone }) {
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

export default function TableConfigPanel() {
  const [types, setTypes] = useState<TableTypeRecord[]>([]);
  const [typeSource, setTypeSource] = useState<"db" | "builtin">("db");
  const [typeError, setTypeError] = useState<string | undefined>(undefined);

  const [clearances, setClearances] = useState<Record<keyof ClearanceRules, string>>(() =>
    Object.fromEntries(
      CLEARANCE_FIELDS.map((f) => [f.key, String(DEFAULT_CLEARANCES[f.key])]),
    ) as Record<keyof ClearanceRules, string>,
  );
  const [clearanceSource, setClearanceSource] = useState<"db" | "builtin">("db");

  const [materials, setMaterials] = useState<Material[]>([]);
  const [materialSource, setMaterialSource] = useState<"db" | "seed">("db");

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [search, setSearch] = useState("");
  const [group, setGroup] = useState<TableTypeDef["group"] | "all">("all");
  const [showInactive, setShowInactive] = useState(true);

  const [draft, setDraft] = useState<TypeDraft | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TableTypeRecord | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [t, c, m] = await Promise.all([
      fetchTableTypes(true),
      fetchClearances(),
      fetchMaterials(),
    ]);

    setTypes(t.types);
    setTypeSource(t.source);
    setTypeError(t.error);

    setClearances(
      Object.fromEntries(
        CLEARANCE_FIELDS.map((f) => [f.key, String(c.clearances[f.key])]),
      ) as Record<keyof ClearanceRules, string>,
    );
    setClearanceSource(c.source);

    setMaterials(m.materials);
    setMaterialSource(m.source);

    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /* ---- derived ---- */

  const stats = useMemo(() => {
    const total = types.length;
    const active = types.filter((t) => t.isActive).length;
    const custom = types.filter((t) => !BUILTIN_KEYS.has(t.id)).length;
    const overrides = types.filter((t) => t.dbId && BUILTIN_KEYS.has(t.id)).length;
    return { total, active, custom, overrides };
  }, [types]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return types.filter((t) => {
      if (!showInactive && !t.isActive) return false;
      if (group !== "all" && t.group !== group) return false;
      if (!q) return true;
      return (
        t.id.toLowerCase().includes(q) ||
        t.label.toLowerCase().includes(q) ||
        t.short.toLowerCase().includes(q)
      );
    });
  }, [types, search, group, showInactive]);

  /** The Material Master rows the table module can actually consume (spec §23). */
  const furnitureMaterials = useMemo(
    () => materials.filter((m) => isFurnitureKey(m.key)),
    [materials],
  );

  /**
   * Tabletop options = the curated list ∪ every board/sheet key the live master carries. The union is
   * the point: an admin who adds "board-veneer-19" to the Material Master can pick it here with no
   * code change, which is half of what spec §24 is asking for.
   */
  const topMaterialKeys = useMemo(() => {
    const keys = new Set(TABLETOP_MATERIAL_KEYS);
    for (const m of materials) {
      if (m.category === "board" || m.category === "sheet") keys.add(m.key);
    }
    if (draft?.defaultMaterialKey) keys.add(draft.defaultMaterialKey);
    return [...keys].sort();
  }, [materials, draft?.defaultMaterialKey]);

  const materialName = useCallback(
    (key: string): string => materials.find((m) => m.key === key)?.name ?? key,
    [materials],
  );

  /* ---- writes ---- */

  const onSeed = async () => {
    setBusy(true);
    try {
      const n = await seedTableTypes();
      toast({
        title: n > 0 ? `Seeded ${n} table type${n === 1 ? "" : "s"}` : "Nothing to seed",
        description:
          n > 0
            ? "The built-in catalogue is now live in the database and editable here."
            : "Every built-in key already exists in the catalogue — no rows were overwritten.",
      });
      await load();
    } catch (e) {
      toast({ title: "Seeding failed", description: errorMessage(e), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const openNew = () => {
    const nextSort = types.reduce((max, t) => Math.max(max, t.sortOrder), 0) + 10;
    setDraft(emptyDraft(nextSort));
    setIsNew(true);
  };

  const openEdit = (t: TableTypeRecord) => {
    setDraft(toDraft(t));
    setIsNew(false);
  };

  const onSaveType = async () => {
    if (!draft) return;
    const key = draft.key.trim();

    if (!key) {
      toast({
        title: "Key is required",
        description:
          "The key is the stable id a saved design stores in `tableTypeId` — e.g. boardroom-table.",
        variant: "destructive",
      });
      return;
    }
    if (!/^[a-z0-9][a-z0-9-]*$/.test(key)) {
      toast({
        title: "Invalid key",
        description: "Lower-case letters, digits and hyphens only, e.g. boardroom-table.",
        variant: "destructive",
      });
      return;
    }
    if (isNew && types.some((t) => t.id === key)) {
      toast({
        title: "Key already exists",
        description: `“${key}” is already in the catalogue. Edit that type instead of re-adding it.`,
        variant: "destructive",
      });
      return;
    }
    if (!draft.label.trim()) {
      toast({ title: "Label is required", variant: "destructive" });
      return;
    }

    const record = fromDraft(draft);
    if (record.presets.length === 0) {
      toast({
        title: "At least one preset is required",
        description:
          "A type with no preset gives the customer nothing to start from — add a standard size with a length and a depth.",
        variant: "destructive",
      });
      return;
    }

    setBusy(true);
    try {
      await upsertTableType(record);
      toast({
        title: isNew ? "Table type added" : "Table type saved",
        description: `${record.label} (${record.id}) — live in the calculator immediately, no deploy needed.`,
      });
      setDraft(null);
      await load();
    } catch (e) {
      toast({ title: "Save failed", description: errorMessage(e), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const onDeleteType = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await deleteTableType(deleteTarget.id);
      toast({
        title: BUILTIN_KEYS.has(deleteTarget.id) ? "Override removed" : "Table type deleted",
        description: BUILTIN_KEYS.has(deleteTarget.id)
          ? `${deleteTarget.label} is back to its built-in definition.`
          : `${deleteTarget.label} is gone from the catalogue.`,
      });
      setDeleteTarget(null);
      await load();
    } catch (e) {
      toast({ title: "Delete failed", description: errorMessage(e), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const onSaveClearances = async () => {
    const rules = Object.fromEntries(
      CLEARANCE_FIELDS.map((f) => [f.key, numOrNull(clearances[f.key]) ?? DEFAULT_CLEARANCES[f.key]]),
    ) as unknown as ClearanceRules;

    setBusy(true);
    try {
      await saveClearances(rules);
      toast({
        title: "Clearance rules saved",
        description: "Every collision and clearance check now runs against these values.",
      });
      await load();
    } catch (e) {
      toast({ title: "Save failed", description: errorMessage(e), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const resetClearances = () => {
    setClearances(
      Object.fromEntries(
        CLEARANCE_FIELDS.map((f) => [f.key, String(DEFAULT_CLEARANCES[f.key])]),
      ) as Record<keyof ClearanceRules, string>,
    );
  };

  /* ---- draft helpers ---- */

  const patch = (p: Partial<TypeDraft>) => setDraft((d) => (d ? { ...d, ...p } : d));

  const toggleShape = (shape: TableShape, on: boolean) =>
    setDraft((d) => {
      if (!d) return d;
      if (!on && shape === d.defaultShape) return d; // the default shape can never be un-allowed
      const shapes = on ? [...d.shapes, shape] : d.shapes.filter((s) => s !== shape);
      return { ...d, shapes };
    });

  const toggleAccessory = (id: string, on: boolean) =>
    setDraft((d) =>
      d
        ? {
            ...d,
            defaultAccessories: on
              ? [...d.defaultAccessories, id]
              : d.defaultAccessories.filter((a) => a !== id),
          }
        : d,
    );

  const togglePanel = (p: TablePanel, on: boolean) =>
    setDraft((d) =>
      d ? { ...d, panels: on ? [...d.panels, p] : d.panels.filter((x) => x !== p) } : d,
    );

  const patchPreset = (i: number, p: Partial<PresetDraft>) =>
    setDraft((d) =>
      d ? { ...d, presets: d.presets.map((row, j) => (j === i ? { ...row, ...p } : row)) } : d,
    );

  const addPreset = () =>
    setDraft((d) => (d ? { ...d, presets: [...d.presets, emptyPreset()] } : d));

  const removePreset = (i: number) =>
    setDraft((d) => (d ? { ...d, presets: d.presets.filter((_, j) => j !== i) } : d));

  /* ---- render ---- */

  const catalogueNotLive = typeSource === "builtin";

  return (
    <div className="space-y-5">
      {catalogueNotLive && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0 space-y-3">
              <div>
                <p className="font-display font-bold text-amber-900 dark:text-amber-200">
                  Table catalogue is not live — showing the built-in types
                </p>
                <p className="text-sm text-amber-800 dark:text-amber-300/90 mt-1">
                  The calculator is running on the 24 built-in table types compiled into the app. Apply
                  migration <span className="font-mono">{MIGRATION_FILE}</span> in the Supabase SQL
                  editor (or <span className="font-mono">supabase db push</span>), then seed the
                  built-in types below. Until then this screen is read-only — saving will fail.
                </p>
                {typeError && (
                  <p className="text-xs font-mono text-amber-800/80 dark:text-amber-300/70 mt-2 break-words">
                    {typeError}
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
                Seed built-in types
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <CountChip label="Table types" value={stats.total} tone="neutral" />
        <CountChip label="Active" value={stats.active} tone="good" />
        <CountChip label="Admin-added" value={stats.custom} tone="neutral" />
        <CountChip label="Built-in overrides" value={stats.overrides} tone="neutral" />
      </div>

      <Tabs defaultValue="types" className="space-y-5">
        <TabsList className="rounded-xl">
          <TabsTrigger value="types" className="rounded-lg">
            Table Types
          </TabsTrigger>
          <TabsTrigger value="clearances" className="rounded-lg">
            Clearance Rules
          </TabsTrigger>
          <TabsTrigger value="materials" className="rounded-lg">
            Materials &amp; Rates
          </TabsTrigger>
          <TabsTrigger value="catalogue" className="rounded-lg">
            Supports &amp; Accessories
          </TabsTrigger>
        </TabsList>

        {/* ================= TABLE TYPES ================= */}
        <TabsContent value="types" className="mt-0">
          <AdminCard>
            <AdminCardContent className="p-4 lg:p-6 space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search key, label or short label…"
                    className="pl-9 rounded-xl"
                  />
                </div>

                <Select
                  value={group}
                  onValueChange={(v) => setGroup(v as TableTypeDef["group"] | "all")}
                >
                  <SelectTrigger className="w-full lg:w-52 rounded-xl">
                    <SelectValue placeholder="All groups" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All groups</SelectItem>
                    {TABLE_TYPE_GROUPS.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border"
                  title="An inactive type is hidden from the customer's table picker but stays priceable, so old designs that used it still re-price."
                >
                  <Switch
                    id="tc-show-inactive"
                    checked={showInactive}
                    onCheckedChange={setShowInactive}
                  />
                  <Label htmlFor="tc-show-inactive" className="text-sm whitespace-nowrap cursor-pointer">
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

                <Button
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => void onSeed()}
                  disabled={busy}
                  title="Write the 24 built-in types into the database. Existing keys are left alone."
                >
                  <Database className="mr-2 h-4 w-4" />
                  Seed built-in types
                </Button>

                <Button onClick={openNew} className="rounded-xl">
                  <Plus className="mr-2 h-4 w-4" />
                  New table type
                </Button>
              </div>

              <div className="rounded-xl border border-border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[200px]">Type</TableHead>
                      <TableHead>Group</TableHead>
                      <TableHead>Default shape</TableHead>
                      <TableHead className="min-w-[180px]">Allowed shapes</TableHead>
                      <TableHead>Default support</TableHead>
                      <TableHead className="min-w-[160px]">Default material</TableHead>
                      <TableHead>Seating</TableHead>
                      <TableHead>Symbol</TableHead>
                      <TableHead className="text-right">Presets</TableHead>
                      <TableHead className="text-right">Sort</TableHead>
                      <TableHead>Active</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading && (
                      <TableRow>
                        <TableCell colSpan={12} className="h-32 text-center text-muted-foreground">
                          <Loader2 className="h-5 w-5 animate-spin inline-block mr-2 align-middle" />
                          Loading table catalogue…
                        </TableCell>
                      </TableRow>
                    )}

                    {!loading && visible.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={12} className="h-32 text-center text-muted-foreground">
                          <Table2 className="h-6 w-6 mx-auto mb-2 opacity-50" />
                          No table types match this filter.
                        </TableCell>
                      </TableRow>
                    )}

                    {!loading &&
                      visible.map((t) => {
                        const builtin = BUILTIN_KEYS.has(t.id);
                        return (
                          <TableRow
                            key={t.id}
                            onClick={() => openEdit(t)}
                            className={cn("cursor-pointer", !t.isActive && "opacity-60")}
                          >
                            <TableCell>
                              <div className="font-semibold text-foreground flex items-center gap-2">
                                {t.label}
                                {!builtin && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] border-emerald-500/40 text-emerald-700 dark:text-emerald-400"
                                  >
                                    custom
                                  </Badge>
                                )}
                                {builtin && t.dbId && (
                                  <Badge variant="secondary" className="text-[10px]">
                                    overridden
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs font-mono text-muted-foreground">{t.id}</div>
                              <div className="text-[11px] text-muted-foreground">{t.short}</div>
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              <Badge variant="secondary" className="font-normal">
                                {t.group}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm whitespace-nowrap">
                              {shapeLabel(t.defaultShape)}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {t.shapes.map(shapeLabel).join(", ")}
                            </TableCell>
                            <TableCell className="text-sm whitespace-nowrap">
                              {findSupport(t.defaultSupportId).label}
                            </TableCell>
                            <TableCell className="text-xs">
                              <div className="font-mono">{t.defaultMaterialKey}</div>
                              <div className="text-muted-foreground">
                                {materialName(t.defaultMaterialKey)}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm whitespace-nowrap">
                              {seatingLabel(t.seatingModel)}
                            </TableCell>
                            <TableCell className="font-mono text-xs">{t.symbol ?? "desk"}</TableCell>
                            <TableCell className="text-right tabular-nums">
                              {t.presets.length}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{t.sortOrder}</TableCell>
                            <TableCell>
                              {t.isActive ? (
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
                                  title="Edit table type"
                                  onClick={() => openEdit(t)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 px-2 text-destructive hover:text-destructive"
                                  disabled={builtin && !t.dbId}
                                  title={
                                    builtin && !t.dbId
                                      ? "Built-in type with no override to delete — de-activate it instead."
                                      : builtin
                                        ? "Remove the override and revert to the built-in definition"
                                        : "Delete table type"
                                  }
                                  onClick={() => setDeleteTarget(t)}
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
                Showing {visible.length} of {stats.total} types · source:{" "}
                <span className="font-mono">{typeSource}</span>. A type saved here is live in the cabin
                calculator, the 2D plan, the BOQ take-off and the quotation immediately — no code change
                and no deploy (spec §24).
              </p>
            </AdminCardContent>
          </AdminCard>
        </TabsContent>

        {/* ================= CLEARANCE RULES ================= */}
        <TabsContent value="clearances" className="mt-0">
          <AdminCard>
            <AdminCardContent className="p-4 lg:p-6 space-y-5">
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <Ruler className="h-4 w-4 text-amber flex-shrink-0 mt-0.5" />
                <p>
                  These eight numbers are the only thing the collision checker measures against (spec
                  §15). Raise one and existing designs start reporting clearance errors; lower it and
                  they stop. Source: <span className="font-mono">{clearanceSource}</span>
                  {clearanceSource === "builtin" &&
                    " — no saved rules yet, so the built-in defaults are in force."}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {CLEARANCE_FIELDS.map((f) => {
                  const value = clearances[f.key];
                  const overridden = (numOrNull(value) ?? DEFAULT_CLEARANCES[f.key]) !== DEFAULT_CLEARANCES[f.key];
                  return (
                    <div key={f.key} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <Label htmlFor={`cl-${f.key}`}>{f.label} (mm)</Label>
                        {overridden && (
                          <Badge
                            variant="outline"
                            className="text-[10px] border-amber-500/40 text-amber-700 dark:text-amber-400"
                          >
                            overridden
                          </Badge>
                        )}
                      </div>
                      <NumberInput
                        id={`cl-${f.key}`}
                        value={value}
                        onChange={(e) =>
                          setClearances((c) => ({ ...c, [f.key]: e.target.value }))
                        }
                        step="10"
                        min={0}
                        placeholder={String(DEFAULT_CLEARANCES[f.key])}
                      />
                      <p className="text-[11px] text-muted-foreground">
                        {f.note} Default{" "}
                        <span className="font-mono">{DEFAULT_CLEARANCES[f.key]} mm</span>.
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Button onClick={() => void onSaveClearances()} disabled={busy} className="rounded-xl">
                  {busy ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save clearance rules
                </Button>
                <Button variant="outline" onClick={resetClearances} disabled={busy} className="rounded-xl">
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset to defaults
                </Button>
                <p className="text-xs text-muted-foreground">
                  A blank field falls back to its default rather than saving zero — a zero clearance
                  would silently disable that check.
                </p>
              </div>
            </AdminCardContent>
          </AdminCard>
        </TabsContent>

        {/* ================= MATERIALS & RATES ================= */}
        <TabsContent value="materials" className="mt-0">
          <AdminCard>
            <AdminCardContent className="p-4 lg:p-6 space-y-4">
              {materialSource === "seed" && (
                <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-800 dark:text-amber-300/90">
                      <span className="font-display font-bold text-amber-900 dark:text-amber-200">
                        Material Master is not live — these are built-in defaults.
                      </span>{" "}
                      Apply{" "}
                      <span className="font-mono">
                        supabase/migrations/20260713140000_material_master_boq.sql
                      </span>{" "}
                      and seed the master from the Material Master screen.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground flex items-start gap-2">
                  <Boxes className="h-4 w-4 text-amber flex-shrink-0 mt-0.5" />
                  <span>
                    Every table rate, unit weight and wastage % is read from the Material Master — the
                    table module hardcodes none of them (spec §23). This is a read-only window;{" "}
                    <strong>edit them there</strong> and every table re-prices.
                  </span>
                </p>
                <Link href="/admin/material-master" className="flex-shrink-0">
                  <Button variant="outline" className="rounded-xl">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open Material Master
                  </Button>
                </Link>
              </div>

              <div className="rounded-xl border border-border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[240px]">Material</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                      <TableHead>Rate unit</TableHead>
                      <TableHead className="text-right">Unit weight</TableHead>
                      <TableHead>Weight basis</TableHead>
                      <TableHead className="text-right">Wastage</TableHead>
                      <TableHead>Effective</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading && (
                      <TableRow>
                        <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                          <Loader2 className="h-5 w-5 animate-spin inline-block mr-2 align-middle" />
                          Loading rates…
                        </TableCell>
                      </TableRow>
                    )}

                    {!loading && furnitureMaterials.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                          <Boxes className="h-6 w-6 mx-auto mb-2 opacity-50" />
                          No furniture materials in the master yet.
                        </TableCell>
                      </TableRow>
                    )}

                    {!loading &&
                      furnitureMaterials.map((m) => (
                        <TableRow key={`${m.key}:${m.effectiveDate}`}>
                          <TableCell>
                            <div className="font-semibold text-foreground">{m.name}</div>
                            <div className="text-xs font-mono text-muted-foreground">{m.key}</div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <Badge variant="secondary" className="font-normal">
                              {m.category}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right tabular-nums whitespace-nowrap">
                            {m.purchaseRate === null ? (
                              <span className="text-destructive font-bold">no rate</span>
                            ) : (
                              formatINR(m.purchaseRate)
                            )}
                          </TableCell>
                          <TableCell className="text-xs whitespace-nowrap">
                            {RATE_UNIT_LABEL[m.rateUnit] ?? m.rateUnit}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {m.unitWeight ?? "—"}
                          </TableCell>
                          <TableCell className="text-xs whitespace-nowrap">
                            {WEIGHT_BASIS_LABEL[m.weightBasis] ?? m.weightBasis}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {m.wastagePercent}%
                          </TableCell>
                          <TableCell className="text-xs font-mono whitespace-nowrap">
                            {m.effectiveDate}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>

              <p className="text-xs text-muted-foreground">
                {furnitureMaterials.length} furniture material
                {furnitureMaterials.length === 1 ? "" : "s"} · source:{" "}
                <span className="font-mono">{materialSource}</span>. Board, edge band, steel profile,
                partition, hardware, accessory, chair, electrical and labour rows — everything a table
                take-off can bill.
              </p>
            </AdminCardContent>
          </AdminCard>
        </TabsContent>

        {/* ================= SUPPORTS & ACCESSORIES ================= */}
        <TabsContent value="catalogue" className="mt-0 space-y-5">
          <AdminCard>
            <AdminCardContent className="p-4 lg:p-6 space-y-4">
              <div>
                <h3 className="font-display font-bold text-foreground">Support types</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  What a table can stand on. <span className="font-mono">kind</span> is what routes the
                  BOQ: <strong>steel</strong> and <strong>pedestal</strong> bases are taken off as pipe
                  runs (length × kg/m), <strong>panel</strong> bases as board area, and{" "}
                  <strong>bracket</strong> bases as counted brackets. Pick the default for a type in its
                  editor.
                </p>
              </div>

              <div className="rounded-xl border border-border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Support</TableHead>
                      <TableHead>Kind</TableHead>
                      <TableHead>Default material key</TableHead>
                      <TableHead className="text-right">Legs</TableHead>
                      <TableHead className="min-w-[220px]">Note</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {SUPPORT_TYPES.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>
                          <div className="font-semibold text-foreground">{s.label}</div>
                          <div className="text-xs font-mono text-muted-foreground">{s.id}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-normal">
                            {s.kind}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="font-mono">{s.defaultMaterialKey}</div>
                          <div className="text-muted-foreground">
                            {materialName(s.defaultMaterialKey)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{s.defaultLegs}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{s.note}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </AdminCardContent>
          </AdminCard>

          <AdminCard>
            <AdminCardContent className="p-4 lg:p-6 space-y-4">
              <div>
                <h3 className="font-display font-bold text-foreground">Accessories</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  What a table can carry. Each one prices from its Material Master key and is drawn in
                  the plan at its default size unless the customer resizes it. Power Manager and Pop-up
                  Socket Box are <strong>electrical</strong> accessories — the customer's editor shows
                  them here but stores their quantity on the table's electrical block, so one physical
                  power manager is never billed twice.
                </p>
              </div>

              <div className="rounded-xl border border-border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Accessory</TableHead>
                      <TableHead>Group</TableHead>
                      <TableHead>Material key</TableHead>
                      <TableHead className="min-w-[150px]">Default size (mm)</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Drawn</TableHead>
                      <TableHead>Needs opening space</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ACCESSORIES.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell>
                          <div className="font-semibold text-foreground flex items-center gap-2">
                            {a.label}
                            {ELECTRICAL_ACCESSORY_IDS.has(a.id) && (
                              <Badge variant="outline" className="text-[10px]">
                                electrical
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs font-mono text-muted-foreground">{a.id}</div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Badge variant="secondary" className="font-normal">
                            {a.group}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="font-mono">{a.materialKey}</div>
                          <div className="text-muted-foreground">{materialName(a.materialKey)}</div>
                        </TableCell>
                        <TableCell className="text-sm tabular-nums whitespace-nowrap">
                          {a.lengthMm} × {a.depthMm} × {a.heightMm}
                        </TableCell>
                        <TableCell className="text-sm">{a.position}</TableCell>
                        <TableCell className="text-sm">{a.drawByDefault ? "yes" : "no"}</TableCell>
                        <TableCell className="text-sm">
                          {a.needsOpeningClearance ? "yes" : "no"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </AdminCardContent>
          </AdminCard>
        </TabsContent>
      </Tabs>

      {/* ---------------- Type editor dialog ---------------- */}
      <Dialog open={draft !== null} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isNew ? "New table type" : "Edit table type"}</DialogTitle>
            <DialogDescription>
              A type saved here is written to <span className="font-mono">cabin_table_types</span> and
              merged over the built-in catalogue at runtime, so it appears in the customer's table
              picker with no code change (spec §24). Rates never live here — they come from the Material
              Master.
            </DialogDescription>
          </DialogHeader>

          {draft && (
            <div className="space-y-6">
              {/* ---- identity ---- */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="t-key">Key *</Label>
                  <Input
                    id="t-key"
                    value={draft.key}
                    onChange={(e) => patch({ key: e.target.value })}
                    placeholder="boardroom-table"
                    className="font-mono"
                    disabled={!isNew}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    {isNew
                      ? "Lower-case, hyphenated. This is the stable id a saved design stores — choose it once."
                      : "The key is fixed after creation: every saved design stores it in tableTypeId, and renaming it would orphan them."}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="t-label">Label *</Label>
                  <Input
                    id="t-label"
                    value={draft.label}
                    onChange={(e) => patch({ label: e.target.value })}
                    placeholder="Boardroom Table"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="t-short">Short label (on the drawing)</Label>
                  <Input
                    id="t-short"
                    value={draft.short}
                    onChange={(e) => patch({ short: e.target.value })}
                    placeholder="BOARDROOM"
                    className="font-mono"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Blank ⇒ the label, upper-cased. This is what the 2D plan prints inside the table.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label>Group</Label>
                  <Select
                    value={draft.group}
                    onValueChange={(v) => patch({ group: v as TableTypeDef["group"] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TABLE_TYPE_GROUPS.map((g) => (
                        <SelectItem key={g} value={g}>
                          {g}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Drawing symbol</Label>
                  <Select
                    value={draft.symbol}
                    onValueChange={(v) => patch({ symbol: v as TableSymbol })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SYMBOLS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">
                    How the 2D plan represents the table when it is too small to draw in detail.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label>Seating model</Label>
                  <Select
                    value={draft.seatingModel}
                    onValueChange={(v) => patch({ seatingModel: v as SeatingModel })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SEATING_MODELS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">
                    {SEATING_MODELS.find((s) => s.value === draft.seatingModel)?.note}
                  </p>
                </div>
              </div>

              {/* ---- shapes ---- */}
              <div className="space-y-2">
                <Label>Allowed shapes</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 rounded-xl border border-border p-3">
                  {TABLE_SHAPES.map((s) => {
                    const checked = draft.shapes.includes(s.id);
                    const isDefault = draft.defaultShape === s.id;
                    return (
                      <label
                        key={s.id}
                        className={cn(
                          "flex items-start gap-2 rounded-lg px-2 py-1.5 cursor-pointer hover:bg-muted/50",
                          isDefault && "bg-muted/60",
                        )}
                        title={s.note}
                      >
                        <Checkbox
                          checked={checked}
                          disabled={isDefault}
                          onCheckedChange={(v) => toggleShape(s.id, v === true)}
                          className="mt-0.5"
                        />
                        <span className="text-sm leading-tight">
                          {s.label}
                          {isDefault && (
                            <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">
                              default
                            </span>
                          )}
                        </span>
                      </label>
                    );
                  })}
                </div>

                <div className="space-y-1.5 max-w-xs">
                  <Label>Default shape</Label>
                  <Select
                    value={draft.defaultShape}
                    onValueChange={(v) => {
                      const shape = v as TableShape;
                      patch({
                        defaultShape: shape,
                        shapes: draft.shapes.includes(shape) ? draft.shapes : [...draft.shapes, shape],
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TABLE_SHAPES.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">
                    Always allowed — a new table of this type is born with this shape.
                  </p>
                </div>
              </div>

              {/* ---- defaults ---- */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Default support / base</Label>
                  <Select
                    value={draft.defaultSupportId}
                    onValueChange={(v) => patch({ defaultSupportId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORT_TYPES.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.label} · {s.kind}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">
                    The steel profile / board thickness that comes with it is the support's own default
                    Material Master key — see the Supports &amp; Accessories tab.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label>Default tabletop material</Label>
                  <Select
                    value={draft.defaultMaterialKey}
                    onValueChange={(v) => patch({ defaultMaterialKey: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {topMaterialKeys.map((k) => (
                        <SelectItem key={k} value={k}>
                          {materialName(k)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">
                    Board thickness follows the material — a 25 mm board makes a 25 mm top. Rate and
                    weight are read from the Material Master, never from here.
                  </p>
                </div>
              </div>

              {/* ---- presets ---- */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <Label>Standard size presets</Label>
                    <p className="text-[11px] text-muted-foreground">
                      What the customer picks from before touching a dimension. Editing any dimension
                      demotes their table to “Custom” automatically (spec §5). Diameter is for round
                      tops; blank for rectangular ones.
                    </p>
                  </div>
                  <Button variant="outline" size="sm" className="rounded-xl flex-shrink-0" onClick={addPreset}>
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Add preset
                  </Button>
                </div>

                <div className="rounded-xl border border-border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[120px]">Id</TableHead>
                        <TableHead className="min-w-[160px]">Label</TableHead>
                        <TableHead className="w-[110px]">Length (mm)</TableHead>
                        <TableHead className="w-[110px]">Depth (mm)</TableHead>
                        <TableHead className="w-[110px]">Height (mm)</TableHead>
                        <TableHead className="w-[110px]">Dia (mm)</TableHead>
                        <TableHead className="w-[90px]">Seats</TableHead>
                        <TableHead className="w-[50px]" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {draft.presets.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={8} className="h-20 text-center text-muted-foreground text-sm">
                            No presets — add at least one.
                          </TableCell>
                        </TableRow>
                      )}
                      {draft.presets.map((p, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            <Input
                              value={p.id}
                              onChange={(e) => patchPreset(i, { id: e.target.value })}
                              placeholder="2400x1200"
                              className="font-mono h-9"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={p.label}
                              onChange={(e) => patchPreset(i, { label: e.target.value })}
                              placeholder="2400 × 1200 × 750"
                              className="h-9"
                            />
                          </TableCell>
                          <TableCell>
                            <NumberInput
                              value={p.lengthMm}
                              onChange={(e) => patchPreset(i, { lengthMm: e.target.value })}
                              step="10"
                              className="h-9"
                            />
                          </TableCell>
                          <TableCell>
                            <NumberInput
                              value={p.depthMm}
                              onChange={(e) => patchPreset(i, { depthMm: e.target.value })}
                              step="10"
                              className="h-9"
                            />
                          </TableCell>
                          <TableCell>
                            <NumberInput
                              value={p.heightMm}
                              onChange={(e) => patchPreset(i, { heightMm: e.target.value })}
                              step="10"
                              className="h-9"
                            />
                          </TableCell>
                          <TableCell>
                            <NumberInput
                              value={p.diameterMm}
                              onChange={(e) => patchPreset(i, { diameterMm: e.target.value })}
                              step="10"
                              placeholder="—"
                              className="h-9"
                            />
                          </TableCell>
                          <TableCell>
                            <NumberInput
                              value={p.seats}
                              onChange={(e) => patchPreset(i, { seats: e.target.value })}
                              step="1"
                              placeholder="—"
                              className="h-9"
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2 text-destructive hover:text-destructive"
                              onClick={() => removePreset(i)}
                              title="Remove preset"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  A blank id is filled from the size on save; a preset with no length or depth is
                  dropped.
                </p>
              </div>

              {/* ---- default accessories ---- */}
              <div className="space-y-2">
                <Label>Default accessories</Label>
                <p className="text-[11px] text-muted-foreground">
                  Switched on the moment the customer adds a table of this type. They can still remove
                  them.
                </p>
                <div className="rounded-xl border border-border p-3 space-y-3">
                  {ACCESSORY_GROUPS.map((g) => (
                    <div key={g}>
                      <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1.5">
                        {g}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {ACCESSORIES.filter((a) => a.group === g).map((a) => (
                          <label
                            key={a.id}
                            className="flex items-start gap-2 rounded-lg px-2 py-1.5 cursor-pointer hover:bg-muted/50"
                            title={`${a.lengthMm} × ${a.depthMm} × ${a.heightMm} mm · ${a.materialKey}`}
                          >
                            <Checkbox
                              checked={draft.defaultAccessories.includes(a.id)}
                              onCheckedChange={(v) => toggleAccessory(a.id, v === true)}
                              className="mt-0.5"
                            />
                            <span className="text-sm leading-tight">
                              {a.label}
                              {ELECTRICAL_ACCESSORY_IDS.has(a.id) && (
                                <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">
                                  electrical
                                </span>
                              )}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ---- editor blocks ---- */}
              <div className="space-y-2">
                <Label>Editor blocks to reveal</Label>
                <p className="text-[11px] text-muted-foreground">
                  Which specialised panels the customer's table editor shows for this type — the
                  workstation cluster controls, the conference seating controls, the reception counter
                  controls and the wall-mount / folding controls.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-xl border border-border p-3">
                  {PANELS.map((p) => (
                    <label
                      key={p.value}
                      className="flex items-center gap-2 rounded-lg px-2 py-1.5 cursor-pointer hover:bg-muted/50"
                    >
                      <Checkbox
                        checked={draft.panels.includes(p.value)}
                        onCheckedChange={(v) => togglePanel(p.value, v === true)}
                      />
                      <span className="text-sm">{p.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* ---- commercials ---- */}
              <div className="grid gap-4 sm:grid-cols-4">
                <div className="space-y-1.5">
                  <Label htmlFor="t-margin">Margin (%)</Label>
                  <NumberInput
                    id="t-margin"
                    value={draft.marginPercent}
                    onChange={(e) => patch({ marginPercent: e.target.value })}
                    step="0.5"
                    placeholder="inherit"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="t-gst">GST (%)</Label>
                  <NumberInput
                    id="t-gst"
                    value={draft.gstPercent}
                    onChange={(e) => patch({ gstPercent: e.target.value })}
                    step="0.5"
                    placeholder="inherit"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="t-wastage">Wastage (%)</Label>
                  <NumberInput
                    id="t-wastage"
                    value={draft.wastagePercent}
                    onChange={(e) => patch({ wastagePercent: e.target.value })}
                    step="0.5"
                    placeholder="inherit"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="t-sort">Sort order</Label>
                  <NumberInput
                    id="t-sort"
                    value={draft.sortOrder}
                    onChange={(e) => patch({ sortOrder: e.target.value })}
                    step="10"
                    placeholder="100"
                  />
                </div>
                <p className="sm:col-span-4 text-[11px] text-muted-foreground -mt-2">
                  Blank ⇒ <strong>inherit</strong> the quotation's global margin / GST and the material's
                  own wastage. A 0 means “this type carries none” — which is not the same thing.
                </p>
              </div>

              {/* ---- status + notes ---- */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-3">
                  <Switch
                    id="t-active"
                    checked={draft.isActive}
                    onCheckedChange={(v) => patch({ isActive: v })}
                  />
                  <Label htmlFor="t-active" className="cursor-pointer">
                    Active
                  </Label>
                  <span className="text-[11px] text-muted-foreground">
                    Inactive ⇒ hidden from the customer's picker; existing designs still price.
                  </span>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="t-notes">Notes</Label>
                  <Textarea
                    id="t-notes"
                    value={draft.notes}
                    onChange={(e) => patch({ notes: e.target.value })}
                    rows={2}
                    placeholder="Anything the sales or production team needs to know about this type."
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDraft(null)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={() => void onSaveType()} disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isNew ? "Add table type" : "Save changes"}
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
              {deleteTarget && BUILTIN_KEYS.has(deleteTarget.id)
                ? "Remove override?"
                : "Delete table type?"}
            </DialogTitle>
            <DialogDescription>
              {deleteTarget ? (
                BUILTIN_KEYS.has(deleteTarget.id) ? (
                  <>
                    <span className="font-semibold text-foreground">{deleteTarget.label}</span> (
                    <span className="font-mono">{deleteTarget.id}</span>) is a built-in type, so this
                    does not remove it — it <strong>reverts it to its built-in definition</strong> and
                    discards your edits. To take a built-in out of the customer's picker, de-activate it
                    instead.
                  </>
                ) : (
                  <>
                    <span className="font-semibold text-foreground">{deleteTarget.label}</span> (
                    <span className="font-mono">{deleteTarget.id}</span>) will be removed from the
                    catalogue. Any saved design that still references this key falls back to the first
                    built-in type when it is reopened. De-activate it instead if old designs must keep
                    re-pricing correctly.
                  </>
                )
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void onDeleteType()} disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {deleteTarget && BUILTIN_KEYS.has(deleteTarget.id) ? "Remove override" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
