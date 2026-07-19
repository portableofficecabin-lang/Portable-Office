"use client";

/**
 * MATERIAL BOQ PANEL — the ONE BOQ UI. The cabin calculator and the labour-colony calculator both
 * render THIS component; neither owns a BOQ screen of its own.
 *
 * ─── THE LIVE RECALCULATION ────────────────────────────────────────────────────────────────────
 * There is no "recalculate" button, no effect that copies the take-off into state, and no cache to
 * invalidate — and that is deliberate:
 *
 *     const result = useMemo(() => priceTakeoff(takeoff, index, settings), [takeoff, index, settings]);
 *
 * `takeoff` is itself a useMemo of the caller's LIVE drawing state (CabinConfig / LabourColonyResult
 * → cabinTakeoff / colonyTakeoff). So the chain is:
 *
 *     drawing state changes → parent re-derives `takeoff` → this useMemo re-prices → every tab,
 *     every total, every validation issue and every download is already up to date.
 *
 * Adding a wall re-prices the wall. Dragging a window re-prices the sheet deduction AND its framing.
 * NOTHING needs wiring for that to happen: the only way to break it is to snapshot `result` into
 * state, so don't. Admin edits (overrides, manual rows, charges, norms) live in `settings`, which is
 * the parent's state too — so they survive the re-derivation and get re-applied to the new take-off
 * by id. That is why BoqOverride is keyed by the take-off's stable id and not by row index.
 *
 * ─── BUNDLE ───────────────────────────────────────────────────────────────────────────────────
 * This panel is rendered INSIDE the public CabinCalculator tree (behind an adminTools flag), so
 * xlsx (~400 KB) and jspdf (~350 KB) must never reach the homepage bundle. The nine reports are
 * therefore reached by a DYNAMIC import — `await import("@/lib/boq/reports")` — on the download
 * click, and by nothing else. Do not add a static import of that module to this file.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

import { priceTakeoff } from "@/lib/boq/engine";
import { fetchMaterials, indexMaterials, type BoqTemplateRecord } from "@/lib/boq/materialMaster";
import {
  companyDefaultSettingsSync,
  deleteTemplate,
  listTemplates,
  saveTemplate,
} from "@/lib/boq/templateStore";
import { isBuiltinPresetId } from "@/lib/boq/presets";
import {
  BOQ_SECTIONS,
  DEFAULT_COMPETITIVE,
  DEFAULT_NORMS,
  type BoqLine,
  type BoqNorms,
  type BoqOverride,
  type BoqResult,
  type BoqSection,
  type BoqSettings,
  type BoqTemplateKind,
  type CompetitivePricing,
  type CuttingRow,
  type ManualBoqItem,
  type Material,
  type MaterialIndex,
  type Takeoff,
} from "@/lib/boq/types";

import { BoqLineRow } from "./BoqLineRow";
import { ChargeEditor } from "./ChargeEditor";
import FrameConfigPanel from "./FrameConfigPanel";
import { IssueList } from "./IssueList";
import { SectionCard } from "./SectionCard";
import {
  NumField,
  RATE_LABEL,
  SECTION_META,
  Stat,
  TD,
  TD_R,
  TH,
  TEMPLATE_KINDS,
  TEMPLATE_KIND_LABEL,
  kindOf,
  money,
  num,
  pct,
  qtyEditOf,
  uid,
} from "./boqShared";

/* ==========================================================================
 * Props
 * ========================================================================== */

export interface BoqPanelProps {
  /** Derived from the LIVE drawing state by the caller — must be a useMemo, or the panel re-prices needlessly. */
  takeoff: Takeoff;
  settings: BoqSettings;
  onSettingsChange: (s: BoqSettings) => void;
  /** Used for report filenames and the PDF/Excel headers. */
  title: string;
  defaultTemplateKind: BoqTemplateKind;
  /** Lets the parent reuse the priced result in its own quotation exports. */
  onResult?: (r: BoqResult) => void;
}

/* ==========================================================================
 * Overrides — a patch language where `null` means DELETE THIS FIELD
 * ========================================================================== */

/**
 * `BoqOverride` cannot express "clear the rate": `rate: undefined` and "no rate override" are the
 * same object once it round-trips through jsonb. So the UI patches with null to mean "remove", and
 * mergeOverride() is the only place that knows it.
 */
interface OverridePatch {
  qty?: number | null;
  locked?: boolean | null;
  rate?: number | null;
  wastagePercent?: number | null;
  enabled?: boolean | null;
  materialKey?: string | null;
  note?: string | null;
}

function mergeOverride(cur: BoqOverride, p: OverridePatch): BoqOverride {
  const next: BoqOverride = { ...cur };
  if ("qty" in p) {
    if (p.qty == null) delete next.qty;
    else next.qty = p.qty;
  }
  if ("locked" in p) {
    if (!p.locked) delete next.locked;
    else next.locked = true;
  }
  if ("rate" in p) {
    if (p.rate == null) delete next.rate;
    else next.rate = p.rate;
  }
  if ("wastagePercent" in p) {
    if (p.wastagePercent == null) delete next.wastagePercent;
    else next.wastagePercent = p.wastagePercent;
  }
  if ("enabled" in p) {
    if (p.enabled == null) delete next.enabled;
    else next.enabled = p.enabled;
  }
  if ("materialKey" in p) {
    if (!p.materialKey) delete next.materialKey;
    else next.materialKey = p.materialKey;
  }
  if ("note" in p) {
    if (!p.note) delete next.note;
    else next.note = p.note;
  }
  return next;
}

/* ==========================================================================
 * The nine reports — dynamically imported, never statically (see file header)
 * ========================================================================== */

type ReportsModule = typeof import("@/lib/boq/reports");

interface ReportDef {
  key: string;
  label: string;
  hint: string;
  kind: "xlsx" | "pdf";
  run: (R: ReportsModule, r: BoqResult, title: string) => void | Promise<void>;
}

const REPORTS: ReportDef[] = [
  {
    key: "all",
    label: "Complete workbook",
    hint: "All 8 sheets — the estimator's working file",
    kind: "xlsx",
    run: (R, r, t) => R.exportAllExcel(r, t),
  },
  {
    key: "boq-xlsx",
    label: "Material BOQ",
    hint: "Every line, every column",
    kind: "xlsx",
    run: (R, r, t) => R.exportBoqExcel(r, t),
  },
  {
    key: "cutting-xlsx",
    label: "Steel cutting list",
    hint: "What the saw operator gets",
    kind: "xlsx",
    run: (R, r, t) => R.exportCuttingListExcel(r, t),
  },
  {
    key: "sheet-layout-xlsx",
    label: "Sheet layout & cutting plan",
    hint: "Roofing / wall / MDF sheets — rows, full/cut, off-cut, scrap",
    kind: "xlsx",
    run: (R, r, t) => R.exportSheetLayoutExcel(r, t),
  },
  {
    key: "weight-xlsx",
    label: "Weight summary",
    hint: "kg by material",
    kind: "xlsx",
    run: (R, r, t) => R.exportWeightSummaryExcel(r, t),
  },
  {
    key: "elevation-xlsx",
    label: "Elevation-wise breakup",
    hint: "Each section subtotalled",
    kind: "xlsx",
    run: (R, r, t) => R.exportElevationBreakupExcel(r, t),
  },
  {
    key: "purchase-xlsx",
    label: "Purchase report",
    hint: "Bars & sheets to buy, with suppliers",
    kind: "xlsx",
    run: (R, r, t) => R.exportPurchaseReportExcel(r, t),
  },
  {
    key: "cost-xlsx",
    label: "Cost summary",
    hint: "By section, then charges → GST",
    kind: "xlsx",
    run: (R, r, t) => R.exportCostSummaryExcel(r, t),
  },
  {
    key: "quotation-pdf",
    label: "Quotation sheet",
    hint: "CUSTOMER-FACING — no rates, no nesting",
    kind: "pdf",
    run: (R, r, t) => R.exportQuotationSheetPdf(r, t),
  },
  {
    key: "boq-pdf",
    label: "Full BOQ",
    hint: "INTERNAL — every derivation + validation",
    kind: "pdf",
    run: (R, r, t) => R.exportBoqPdf(r, t),
  },
];

/* ==========================================================================
 * Manual item draft
 * ========================================================================== */

interface ManualDraft {
  section: BoqSection;
  materialKey: string;
  description: string;
  qty: string;
  cutLengthM: string;
  areaSqm: string;
  note: string;
}

const emptyDraft = (): ManualDraft => ({
  section: "misc",
  materialKey: "",
  description: "",
  qty: "1",
  cutLengthM: "",
  areaSqm: "",
  note: "",
});

const numOrUndef = (s: string): number | undefined => {
  const t = s.trim();
  if (t === "") return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
};

/* ==========================================================================
 * Panel
 * ========================================================================== */

export default function BoqPanel({
  takeoff,
  settings,
  onSettingsChange,
  title,
  defaultTemplateKind,
  onResult,
}: BoqPanelProps) {
  /* ---------- Material Master ---------- */
  const [materials, setMaterials] = useState<Material[]>([]);
  const [source, setSource] = useState<"db" | "seed">("seed");
  const [loadError, setLoadError] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  const loadMaterials = useCallback(async () => {
    setLoading(true);
    // fetchMaterials never throws — a missing table degrades to the seed set with source "seed".
    const res = await fetchMaterials();
    setMaterials(res.materials);
    setSource(res.source);
    setLoadError(res.error);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadMaterials();
  }, [loadMaterials]);

  const index: MaterialIndex = useMemo(() => indexMaterials(materials), [materials]);

  /* ---------- THE LIVE RECALCULATION (see file header) ---------- */
  const result = useMemo(() => priceTakeoff(takeoff, index, settings), [takeoff, index, settings]);

  /* Hand the priced result up so the parent's own quotation exports use the SAME numbers. The ref
   * keeps an inline `onResult={r => ...}` from re-firing the effect on every parent render. */
  const onResultRef = useRef(onResult);
  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);
  useEffect(() => {
    onResultRef.current?.(result);
  }, [result]);

  /* ---------- Templates ---------- */
  const [templates, setTemplates] = useState<BoqTemplateRecord[]>([]);
  const loadTemplates = useCallback(async () => {
    // listTemplates never throws — a missing table returns [].
    setTemplates(await listTemplates());
  }, []);
  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  /* ---------- Settings writers ---------- */
  const patchSettings = useCallback(
    (p: Partial<BoqSettings>) => onSettingsChange({ ...settings, ...p }),
    [onSettingsChange, settings],
  );

  const norms: BoqNorms = useMemo(() => ({ ...DEFAULT_NORMS, ...(settings.norms ?? {}) }), [settings.norms]);
  const overrides = useMemo(() => settings.overrides ?? {}, [settings.overrides]);
  const manualItems = useMemo(() => settings.manualItems ?? [], [settings.manualItems]);
  const disabledSections = useMemo(() => settings.disabledSections ?? [], [settings.disabledSections]);
  const manualIds = useMemo(() => new Set(manualItems.map((m) => m.id)), [manualItems]);

  const applyOverride = useCallback(
    (id: string, p: OverridePatch) => {
      const next = { ...overrides };
      const merged = mergeOverride(overrides[id] ?? {}, p);
      if (Object.keys(merged).length === 0) delete next[id];
      else next[id] = merged;
      patchSettings({ overrides: next });
    },
    [overrides, patchSettings],
  );

  const resetOverride = useCallback(
    (id: string) => {
      const next = { ...overrides };
      delete next[id];
      patchSettings({ overrides: next });
    },
    [overrides, patchSettings],
  );

  /** Locking must WRITE the current quantity, or the engine happily recomputes it. Unlocking releases it. */
  const toggleLock = useCallback(
    (line: BoqLine) => {
      const cur = overrides[line.id] ?? {};
      if (cur.locked) applyOverride(line.id, { locked: false, qty: null });
      else applyOverride(line.id, { locked: true, qty: cur.qty ?? qtyEditOf(line).value });
    },
    [applyOverride, overrides],
  );

  const deleteManual = useCallback(
    (id: string) => {
      const nextOverrides = { ...overrides };
      delete nextOverrides[id];
      patchSettings({
        manualItems: manualItems.filter((m) => m.id !== id),
        overrides: nextOverrides,
      });
    },
    [manualItems, overrides, patchSettings],
  );

  const patchNorms = useCallback(
    (p: Partial<BoqNorms>) => patchSettings({ norms: { ...norms, ...p } }),
    [norms, patchSettings],
  );

  /* ---------- §15 competitive / selling-price config (internal only) ---------- */
  const competitive: CompetitivePricing = useMemo(
    () => ({ ...DEFAULT_COMPETITIVE, ...(settings.competitive ?? {}) }),
    [settings.competitive],
  );
  const patchCompetitive = useCallback(
    (p: Partial<CompetitivePricing>) => patchSettings({ competitive: { ...competitive, ...p } }),
    [competitive, patchSettings],
  );

  const toggleSection = useCallback(
    (id: BoqSection, on: boolean) =>
      patchSettings({
        disabledSections: on ? disabledSections.filter((s) => s !== id) : [...disabledSections.filter((s) => s !== id), id],
      }),
    [disabledSections, patchSettings],
  );

  /**
   * The norm loss the engine ADDS on top of a line's material wastage: saw kerf on steel, off-cuts on
   * sheet. The row's editable wastage cell must therefore show `line.wastagePercent − this`, or an
   * admin who types 8 would watch it turn into 11.
   */
  const extraWastageOf = useCallback(
    (line: BoqLine): number => {
      const k = kindOf(line);
      if (k === "steel") return Math.max(0, norms.cuttingWastagePercent || 0);
      if (k === "sheet") return Math.max(0, norms.sheetWastagePercent || 0);
      return 0;
    },
    [norms.cuttingWastagePercent, norms.sheetWastagePercent],
  );

  /* ---------- Derived views ---------- */
  const errors = useMemo(() => result.issues.filter((i) => i.severity === "error"), [result.issues]);
  const warnings = useMemo(() => result.issues.filter((i) => i.severity === "warning"), [result.issues]);

  const linesBySection = useMemo(() => {
    const map = new Map<BoqSection, BoqLine[]>();
    for (const l of result.lines) {
      const arr = map.get(l.section);
      if (arr) arr.push(l);
      else map.set(l.section, [l]);
    }
    return map;
  }, [result.lines]);

  /** Cutting list, grouped by material so the yard gets a subtotal per section size. */
  const cuttingGroups = useMemo(() => {
    const map = new Map<string, CuttingRow[]>();
    for (const row of result.cuttingList) {
      const arr = map.get(row.materialKey);
      if (arr) arr.push(row);
      else map.set(row.materialKey, [row]);
    }
    return [...map.values()].map((rows) => ({
      key: rows[0].materialKey,
      material: rows[0].material,
      spec: rows[0].spec,
      rows,
      qty: rows.reduce((s, r) => s + r.qty, 0),
      lengthM: rows.reduce((s, r) => s + r.totalLengthM, 0),
      weightKg: rows.reduce((s, r) => s + r.weightKg, 0),
    }));
  }, [result.cuttingList]);

  /* The engine emits chargeLines in the order of the ENABLED charges, so position maps id → amount
   * exactly. Re-deriving the amounts here would be a second, divergent charge engine. */
  const chargeAmounts = useMemo(() => {
    const map: Record<string, number> = {};
    const enabled = (settings.charges ?? []).filter((c) => c.enabled);
    result.totals.chargeLines.forEach((cl, i) => {
      const c = enabled[i];
      if (c) map[c.id] = cl.amount;
    });
    return map;
  }, [settings.charges, result.totals.chargeLines]);

  /* ---------- Detailed BOQ filter ---------- */
  const [filter, setFilter] = useState("");
  const visibleLines = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return result.lines;
    return result.lines.filter((l) =>
      [l.id, l.description, l.material, l.spec, l.materialKey, SECTION_META[l.section].label]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [filter, result.lines]);

  /* ---------- Downloads ---------- */
  const [busy, setBusy] = useState<string | null>(null);

  const download = useCallback(
    async (def: ReportDef) => {
      setBusy(def.key);
      try {
        // DYNAMIC — this is what keeps xlsx + jspdf out of the public homepage bundle.
        const R = await import("@/lib/boq/reports");
        await def.run(R, result, title);
        toast({ title: `${def.label} downloaded` });
      } catch (e) {
        toast({
          variant: "destructive",
          title: "Export failed",
          description: e instanceof Error ? e.message : String(e),
        });
      } finally {
        setBusy(null);
      }
    },
    [result, title],
  );

  /* ---------- Manual item dialog ---------- */
  const [addOpen, setAddOpen] = useState(false);
  const [draft, setDraft] = useState<ManualDraft>(emptyDraft);
  const [draftError, setDraftError] = useState("");

  const submitManual = useCallback(() => {
    const material = index[draft.materialKey];
    if (!material) {
      setDraftError("Pick a material from the Material Master.");
      return;
    }
    const qty = numOrUndef(draft.qty);
    if (qty == null || qty <= 0) {
      setDraftError("Quantity must be greater than zero.");
      return;
    }

    const item: ManualBoqItem = {
      id: `manual:${uid()}`,
      section: draft.section,
      materialKey: draft.materialKey,
      description: draft.description.trim() || material.name,
      qty,
      cutLengthM: numOrUndef(draft.cutLengthM),
      areaSqm: numOrUndef(draft.areaSqm),
      note: draft.note.trim() || undefined,
    };

    patchSettings({ manualItems: [...manualItems, item] });
    setDraft(emptyDraft());
    setDraftError("");
    setAddOpen(false);
    toast({ title: "Row added", description: `${item.description} — ${SECTION_META[item.section].label}` });
  }, [draft, index, manualItems, patchSettings]);

  /* ---------- Save-as-template dialog ---------- */
  const [saveOpen, setSaveOpen] = useState(false);
  const [tplName, setTplName] = useState("");
  const [tplDesc, setTplDesc] = useState("");
  const [tplKind, setTplKind] = useState<BoqTemplateKind>(settings.templateKind ?? defaultTemplateKind);
  const [tplDefault, setTplDefault] = useState(false);
  const [tplSaving, setTplSaving] = useState(false);
  const [tplError, setTplError] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");

  const submitTemplate = useCallback(async () => {
    if (!tplName.trim()) {
      setTplError("Give the template a name.");
      return;
    }
    setTplSaving(true);
    setTplError("");
    try {
      const rec = await saveTemplate({
        name: tplName.trim(),
        kind: tplKind,
        description: tplDesc.trim(),
        isDefault: tplDefault,
        data: { ...settings, templateKind: tplKind },
      });
      await loadTemplates();
      patchSettings({ templateKind: rec.kind, templateId: rec.id });
      setSaveOpen(false);
      setTplName("");
      setTplDesc("");
      setTplDefault(false);
      toast({ title: "Template saved", description: `${rec.name} · ${TEMPLATE_KIND_LABEL[rec.kind]}` });
    } catch (e) {
      setTplError(e instanceof Error ? e.message : String(e));
    } finally {
      setTplSaving(false);
    }
  }, [loadTemplates, patchSettings, settings, tplDefault, tplDesc, tplKind, tplName]);

  const applyTemplate = useCallback(
    (id: string) => {
      const tpl = templates.find((t) => t.id === id);
      if (!tpl) return;
      // rowToTemplate() already merged the record over defaultBoqSettings, so no field can be missing.
      onSettingsChange({ ...tpl.data, templateKind: tpl.kind, templateId: tpl.id });
      toast({ title: "Template loaded", description: `${tpl.name} · ${TEMPLATE_KIND_LABEL[tpl.kind]}` });
    },
    [onSettingsChange, templates],
  );

  const removeTemplate = useCallback(
    async (id: string) => {
      try {
        await deleteTemplate(id);
        await loadTemplates();
        if (selectedTemplate === id) setSelectedTemplate("");
        toast({ title: "Template deleted" });
      } catch (e) {
        toast({
          variant: "destructive",
          title: "Delete failed",
          description: e instanceof Error ? e.message : String(e),
        });
      }
    },
    [loadTemplates, selectedTemplate],
  );

  /** Duplicate any preset (incl. a built-in) into a new, editable, non-default copy. (spec §1) */
  const duplicateTemplate = useCallback(
    async (id: string) => {
      const tpl = templates.find((t) => t.id === id);
      if (!tpl) return;
      try {
        const rec = await saveTemplate({
          name: `${tpl.name} (copy)`,
          kind: tpl.kind,
          description: tpl.description,
          isDefault: false,
          data: { ...tpl.data, templateKind: tpl.kind },
        });
        await loadTemplates();
        setSelectedTemplate(rec.id);
        toast({ title: "Preset duplicated", description: `${rec.name} — now editable` });
      } catch (e) {
        toast({ variant: "destructive", title: "Duplicate failed", description: e instanceof Error ? e.message : String(e) });
      }
    },
    [loadTemplates, templates],
  );

  /** Mark a saved preset as the company default — new cabins of its kind start from it. (spec §1) */
  const setAsDefault = useCallback(
    async (id: string) => {
      const tpl = templates.find((t) => t.id === id);
      if (!tpl || isBuiltinPresetId(tpl.id)) return; // built-ins are the fallback default already
      try {
        const rec = await saveTemplate({
          id: tpl.id,
          name: tpl.name,
          kind: tpl.kind,
          description: tpl.description,
          isDefault: true,
          data: tpl.data,
        });
        await loadTemplates();
        setSelectedTemplate(rec.id);
        toast({
          title: "Company default set",
          description: `New ${TEMPLATE_KIND_LABEL[rec.kind]} cabins will start from “${rec.name}”.`,
        });
      } catch (e) {
        toast({ variant: "destructive", title: "Set default failed", description: e instanceof Error ? e.message : String(e) });
      }
    },
    [loadTemplates, templates],
  );

  /** Restore this quotation to the company default preset (admin's if set, else built-in). (spec §1) */
  const restoreDefault = useCallback(() => {
    const kind = settings.templateKind ?? defaultTemplateKind;
    onSettingsChange(companyDefaultSettingsSync(kind));
    toast({
      title: "Company default restored",
      description: `Reset to the ${TEMPLATE_KIND_LABEL[kind]} company standard.`,
    });
  }, [defaultTemplateKind, onSettingsChange, settings.templateKind]);

  /* ==========================================================================
   * Render
   * ========================================================================== */

  const t = result.totals;
  const m = result.meta;

  return (
    <div className="rounded-2xl border border-slate-300 bg-white p-4 text-slate-800">
      {/* ---------------- header ---------------- */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-slate-300 pb-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-sm font-bold tracking-wide text-slate-900">
            <Boxes className="h-4 w-4 text-amber-600" />
            MATERIAL BOQ — {title}
          </h3>
          <div className="mt-0.5 text-[10.5px] text-slate-500">
            {num(m.lengthM)} × {num(m.widthM)} × {num(m.heightM)} m · {num(m.floorAreaSqm)} m² floor ·{" "}
            {m.modules} module{m.modules === 1 ? "" : "s"} · {m.rooms} room{m.rooms === 1 ? "" : "s"} ·{" "}
            {m.doors} door{m.doors === 1 ? "" : "s"} · {m.windows} window{m.windows === 1 ? "" : "s"} ·{" "}
            {result.lines.length} BOQ lines
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {errors.length > 0 ? (
            <Badge variant="destructive" className="gap-1 rounded px-1.5 py-0.5 text-[10px]">
              <AlertTriangle className="h-3 w-3" />
              {errors.length} error{errors.length === 1 ? "" : "s"}
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="gap-1 rounded border-emerald-300 bg-emerald-50 px-1.5 py-0.5 text-[10px] text-emerald-700"
            >
              <CheckCircle2 className="h-3 w-3" />
              Validated
            </Badge>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void loadMaterials()}
            disabled={loading}
            className="h-8 text-[11px]"
            title="Re-read the Material Master (rates, weights, suppliers)"
          >
            {loading ? (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="mr-1 h-3.5 w-3.5" />
            )}
            Refresh master
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" size="sm" className="h-8 bg-amber-600 text-[11px] hover:bg-amber-700">
                {busy ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="mr-1 h-3.5 w-3.5" />
                )}
                Download
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wide text-slate-500">
                Excel
              </DropdownMenuLabel>
              {REPORTS.filter((r) => r.kind === "xlsx").map((r) => (
                <DropdownMenuItem
                  key={r.key}
                  disabled={busy !== null}
                  onSelect={(e) => {
                    e.preventDefault();
                    void download(r);
                  }}
                  className="flex items-start gap-2"
                >
                  <FileSpreadsheet className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                  <span className="min-w-0">
                    <span className="block text-[11.5px] font-medium">{r.label}</span>
                    <span className="block text-[10px] text-slate-500">{r.hint}</span>
                  </span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wide text-slate-500">
                PDF
              </DropdownMenuLabel>
              {REPORTS.filter((r) => r.kind === "pdf").map((r) => (
                <DropdownMenuItem
                  key={r.key}
                  disabled={busy !== null}
                  onSelect={(e) => {
                    e.preventDefault();
                    void download(r);
                  }}
                  className="flex items-start gap-2"
                >
                  <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-600" />
                  <span className="min-w-0">
                    <span className="block text-[11.5px] font-medium">{r.label}</span>
                    <span className="block text-[10px] text-slate-500">{r.hint}</span>
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ---------------- Material Master not applied ---------------- */}
      {source === "seed" && (
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div className="min-w-0 flex-1">
            <div className="text-[12px] font-bold text-amber-900">Material Master not applied</div>
            <p className="text-[10.5px] leading-snug text-amber-800">
              {loadError ??
                "The material_master table is not live yet — pricing is running on the built-in seed rates."}{" "}
              Every weight and ₹ below comes from that seed set, not from your database. Apply{" "}
              <code className="rounded bg-amber-100 px-1">
                supabase/migrations/20260713140000_material_master_boq.sql
              </code>{" "}
              and hit Refresh master.
            </p>
          </div>
        </div>
      )}

      {/* ---------------- tabs ---------------- */}
      <Tabs defaultValue="summary">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-slate-100 p-1">
          <TabsTrigger value="summary" className="text-[11px]">
            Summary
          </TabsTrigger>
          <TabsTrigger value="detailed" className="text-[11px]">
            Detailed BOQ
          </TabsTrigger>
          <TabsTrigger value="frame" className="text-[11px]">
            Frame &amp; Stiffeners
          </TabsTrigger>
          <TabsTrigger value="cutting" className="text-[11px]">
            Cutting List
          </TabsTrigger>
          <TabsTrigger value="elevation" className="text-[11px]">
            Elevation-wise
          </TabsTrigger>
          <TabsTrigger value="purchase" className="text-[11px]">
            Purchase
          </TabsTrigger>
          <TabsTrigger value="validation" className="gap-1.5 text-[11px]">
            Validation
            {errors.length > 0 && (
              <Badge variant="destructive" className="rounded px-1 py-0 text-[9px] leading-4">
                {errors.length}
              </Badge>
            )}
            {errors.length === 0 && warnings.length > 0 && (
              <Badge
                variant="outline"
                className="rounded border-amber-400 bg-amber-100 px-1 py-0 text-[9px] leading-4 text-amber-800"
              >
                {warnings.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="settings" className="text-[11px]">
            Settings
          </TabsTrigger>
        </TabsList>

        {/* ============================ SUMMARY ============================ */}
        <TabsContent value="summary" className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            <Stat label="Total steel" value={`${num(t.totalSteelKg)} kg`} sub={`${num(t.netSteelKg)} kg net`} />
            <Stat label="Total weight" value={`${num(t.totalTonnes, 3)} t`} sub={`${num(t.totalWeightKg)} kg`} />
            <Stat label="Material cost" value={money(t.materialAmount)} sub={`${result.purchase.length} materials`} />
            <Stat label="Charges" value={money(t.chargesAmount)} sub={`${t.chargeLines.length} lines`} />
            <Stat label={`GST @ ${num(settings.gstPercent, 2)}%`} value={money(t.gstAmount)} sub={`on ${money(t.subtotal)}`} />
            <Stat label="Grand total" value={money(t.grandTotal)} sub="incl. GST" tone="amber" />
            <Stat
              label="Rate per sqft"
              value={money(t.ratePerSqft)}
              sub={`${num(m.floorAreaSqm)} m² floor area`}
              tone="slate"
            />
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-300">
            <table className="w-full min-w-[720px] border-collapse text-[10.5px]">
              <thead>
                <tr className="bg-slate-100 text-left text-slate-700">
                  {["Section", "Drawing it came from", "Lines", "Steel (kg)", "Total weight (kg)", "Material cost", "% of material"].map(
                    (h) => (
                      <th key={h} className={TH}>
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {result.sections.map((s, i) => (
                  <tr key={s.section} className={i % 2 === 1 ? "bg-slate-50/70" : undefined}>
                    <td className={cn(TD, "font-semibold text-slate-900")}>
                      {s.label}
                      {disabledSections.includes(s.section) && (
                        <span className="ml-1 rounded bg-slate-200 px-1 text-[8.5px] font-bold uppercase text-slate-600">
                          off
                        </span>
                      )}
                    </td>
                    <td className={cn(TD, "text-slate-500")}>{s.drawing}</td>
                    <td className={TD_R}>{s.lines}</td>
                    <td className={TD_R}>{num(s.steelKg)}</td>
                    <td className={TD_R}>{num(s.totalKg)}</td>
                    <td className={cn(TD_R, "font-semibold")}>{money(s.materialAmount)}</td>
                    <td className={cn(TD_R, "text-slate-500")}>
                      {t.materialAmount > 0 ? pct((s.materialAmount / t.materialAmount) * 100) : "—"}
                    </td>
                  </tr>
                ))}
                {result.sections.length === 0 && (
                  <tr>
                    <td colSpan={7} className="border border-slate-300 px-2 py-3 text-center text-slate-400">
                      The take-off produced no lines yet.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50">
                  <td colSpan={3} className="border border-slate-300 px-1.5 py-1 text-right font-semibold">
                    Material subtotal
                  </td>
                  <td className={cn(TD_R, "font-bold")}>{num(t.totalSteelKg)}</td>
                  <td className={cn(TD_R, "font-bold")}>{num(t.totalWeightKg)}</td>
                  <td className={cn(TD_R, "font-bold")}>{money(t.materialAmount)}</td>
                  <td className="border border-slate-300" />
                </tr>
                {t.chargeLines.map((c) => (
                  <tr key={c.label}>
                    <td colSpan={5} className="border border-slate-300 px-1.5 py-1 text-right text-slate-600">
                      {c.label} <span className="text-[9px] text-slate-400">({c.basis})</span>
                    </td>
                    <td className={TD_R}>{money(c.amount)}</td>
                    <td className="border border-slate-300" />
                  </tr>
                ))}
                <tr>
                  <td colSpan={5} className="border border-slate-300 px-1.5 py-1 text-right font-semibold">
                    GST @ {num(settings.gstPercent, 2)}%
                  </td>
                  <td className={cn(TD_R, "font-semibold")}>{money(t.gstAmount)}</td>
                  <td className="border border-slate-300" />
                </tr>
                <tr className="bg-amber-50">
                  <td colSpan={5} className="border border-slate-300 px-1.5 py-1 text-right font-extrabold text-slate-900">
                    GRAND TOTAL (incl. GST)
                  </td>
                  <td className={cn(TD_R, "font-extrabold text-slate-900")}>{money(t.grandTotal)}</td>
                  <td className={cn(TD_R, "text-[9.5px] text-slate-600")}>{money(t.ratePerSqft)}/sqft</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* §15 internal selling strip — only when a markup or benchmark is configured. */}
          {(() => {
            const cr = result.competitive;
            const active =
              cr != null &&
              (competitive.overheadPercent !== 0 ||
                competitive.overheadAmount !== 0 ||
                competitive.profitPercent !== 0 ||
                competitive.targetRatePerSqft != null ||
                competitive.competitorRatePerSqft != null ||
                competitive.minRatePerSqft != null);
            if (!active || !cr) return null;
            return (
              <div className="rounded-xl border border-emerald-300 bg-emerald-50/50 p-3">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-800">
                    Proposed selling price (internal — not the customer estimate)
                  </span>
                  {(cr.undercutsCost || cr.belowMinSafe) && (
                    <span className="flex items-center gap-1 rounded bg-red-100 px-1.5 py-0.5 text-[9px] font-bold text-red-700">
                      <AlertTriangle className="h-3 w-3" /> below safe margin
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                  <Stat label="Cost (incl. GST)" value={money(t.grandTotal)} sub={`${money(t.ratePerSqft)}/sqft`} />
                  <Stat label="Ex-GST selling" value={money(cr.exGstSelling)} sub={`${num(cr.grossMarginPercent, 1)}% margin`} />
                  <Stat label="Final selling" value={money(cr.finalSelling)} tone="amber" sub="incl. GST" />
                  <Stat label="Selling rate" value={`${money(cr.ratePerSqft)}/sqft`} sub={`${money(cr.ratePerSqm)}/m²`} tone="slate" />
                  <Stat label="Gross profit" value={money(cr.grossProfit)} sub={`${num(cr.grossMarginPercent, 1)}%`} />
                  <Stat
                    label="vs Competitor"
                    value={cr.competitorSelling == null ? "—" : `${cr.vsCompetitorPercent != null && cr.vsCompetitorPercent > 0 ? "+" : ""}${cr.vsCompetitorPercent == null ? "" : num(cr.vsCompetitorPercent, 1) + "%"}`}
                    sub={cr.competitorSelling == null ? "set in Settings" : money(cr.competitorSelling)}
                  />
                </div>
              </div>
            );
          })()}

          {result.notes.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-700">
                Notes & assumptions
              </div>
              <ul className="list-disc space-y-0.5 pl-4 text-[10.5px] text-slate-600">
                {result.notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </div>
          )}
        </TabsContent>

        {/* ============================ DETAILED BOQ ============================ */}
        <TabsContent value="detailed" className="mt-3 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter by description, material, spec or line id…"
              className="h-8 max-w-sm text-[11px]"
              aria-label="Filter BOQ lines"
            />
            <div className="flex items-center gap-2">
              <span className="text-[10.5px] text-slate-500">
                {visibleLines.length} of {result.lines.length} lines
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setDraft(emptyDraft());
                  setDraftError("");
                  setAddOpen(true);
                }}
                className="h-8 text-[11px]"
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add manual item
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-300">
            <table className="w-full min-w-[1500px] border-collapse text-[10.5px]">
              <thead>
                <tr className="bg-slate-100 text-left text-slate-700">
                  {[
                    "#",
                    "Material description",
                    "Size & specification",
                    "Calculation formula",
                    "Qty (editable)",
                    "Billed qty",
                    "Unit weight",
                    "Total wt (kg)",
                    "Rate (editable)",
                    "Wastage % (editable)",
                    "Amount",
                    "Drawing section",
                    "Lock · On · Reset",
                  ].map((h) => (
                    <th key={h} className={TH}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleLines.map((line, i) => (
                  <BoqLineRow
                    key={line.id}
                    index={i}
                    line={line}
                    override={overrides[line.id]}
                    isAdded={manualIds.has(line.id)}
                    extraWastagePercent={extraWastageOf(line)}
                    onQty={(v) => applyOverride(line.id, { qty: v })}
                    onRate={(v) => applyOverride(line.id, { rate: v })}
                    onWastage={(v) => applyOverride(line.id, { wastagePercent: v })}
                    onToggleLock={() => toggleLock(line)}
                    onToggleEnabled={(on) => applyOverride(line.id, { enabled: on })}
                    onReset={() => resetOverride(line.id)}
                    onDelete={manualIds.has(line.id) ? () => deleteManual(line.id) : undefined}
                  />
                ))}
                {visibleLines.length === 0 && (
                  <tr>
                    <td colSpan={13} className="border border-slate-300 px-2 py-4 text-center text-slate-400">
                      {result.lines.length === 0
                        ? "The take-off produced no lines yet."
                        : "No line matches that filter."}
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="bg-amber-50">
                  <td colSpan={7} className="border border-slate-300 px-1.5 py-1 text-right font-extrabold text-slate-900">
                    MATERIAL SUBTOTAL (enabled lines only)
                  </td>
                  <td className={cn(TD_R, "font-extrabold text-slate-900")}>{num(t.totalWeightKg)}</td>
                  <td className="border border-slate-300" colSpan={2} />
                  <td className={cn(TD_R, "font-extrabold text-slate-900")}>{money(t.materialAmount)}</td>
                  <td className="border border-slate-300" colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>

          <p className="text-[10px] leading-snug text-slate-500">
            Every quantity is re-derived from the drawing on each change. An edited cell writes an OVERRIDE against
            that line&apos;s id — it survives the re-derivation and re-applies to the same member. LOCK freezes the
            quantity at its current value so a design change cannot move it; RESET returns the row to AUTO.
          </p>
        </TabsContent>

        {/* ==================== BASE FRAME & CROSS STIFFENERS ==================== */}
        <TabsContent value="frame" className="mt-3">
          <FrameConfigPanel
            result={result}
            materials={materials}
            index={index}
            norms={norms}
            overrides={overrides}
            applyOverride={applyOverride}
            resetLine={(id) => applyOverride(id, { qty: null, rate: null, locked: null })}
            toggleLock={toggleLock}
            patchNorms={patchNorms}
          />
        </TabsContent>

        {/* ============================ CUTTING LIST ============================ */}
        <TabsContent value="cutting" className="mt-3 space-y-3">
          {cuttingGroups.length === 0 && (
            <p className="rounded-lg border border-dashed border-slate-300 px-3 py-6 text-center text-[11px] text-slate-400">
              No steel members in this take-off.
            </p>
          )}

          {cuttingGroups.map((g) => (
            <div key={g.key} className="overflow-x-auto rounded-xl border border-slate-300">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-slate-200 bg-slate-50 px-3 py-2">
                <div className="text-[12px] font-bold text-slate-900">{g.material}</div>
                <div className="text-[10px] text-slate-500">{g.spec}</div>
              </div>
              <table className="w-full min-w-[780px] border-collapse text-[10.5px]">
                <thead>
                  <tr className="bg-slate-100 text-left text-slate-700">
                    {["Member", "Section", "Size & specification", "Cut length (m)", "Qty (pcs)", "Total length (m)", "Weight (kg)", "Drawing"].map(
                      (h) => (
                        <th key={h} className={TH}>
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {g.rows.map((r, i) => (
                    <tr key={`${r.materialKey}-${r.member}-${r.cutLengthM}-${i}`} className={i % 2 === 1 ? "bg-slate-50/70" : undefined}>
                      <td className={cn(TD, "font-medium text-slate-800")}>{r.member}</td>
                      <td className={cn(TD, "text-slate-600")}>{SECTION_META[r.section].label}</td>
                      <td className={cn(TD, "text-[9.5px] text-slate-600")}>{r.spec}</td>
                      <td className={cn(TD_R, "font-semibold")}>{num(r.cutLengthM, 3)}</td>
                      <td className={TD_R}>{r.qty}</td>
                      <td className={TD_R}>{num(r.totalLengthM, 2)}</td>
                      <td className={TD_R}>{num(r.weightKg)}</td>
                      <td className={cn(TD, "text-[9px] leading-tight text-slate-500")}>{r.drawingRef}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-amber-50">
                    <td colSpan={4} className="border border-slate-300 px-1.5 py-1 text-right font-bold text-slate-900">
                      Subtotal — {g.material}
                    </td>
                    <td className={cn(TD_R, "font-bold")}>{g.qty}</td>
                    <td className={cn(TD_R, "font-bold")}>{num(g.lengthM, 2)}</td>
                    <td className={cn(TD_R, "font-extrabold")}>{num(g.weightKg)}</td>
                    <td className="border border-slate-300" />
                  </tr>
                </tfoot>
              </table>
            </div>
          ))}

          {cuttingGroups.length > 0 && (
            <div className="flex justify-end rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-[11px]">
              <span className="text-slate-600">
                Total steel incl. wastage{" "}
                <span className="font-extrabold tabular-nums text-slate-900">{num(t.totalSteelKg)} kg</span>{" "}
                <span className="text-slate-400">
                  (cut lengths above are NET — the {num(norms.cuttingWastagePercent, 1)}% saw loss is added on
                  purchase)
                </span>
              </span>
            </div>
          )}
        </TabsContent>

        {/* ============================ ELEVATION-WISE ============================ */}
        <TabsContent value="elevation" className="mt-3 space-y-2">
          {result.sections.length === 0 && (
            <p className="rounded-lg border border-dashed border-slate-300 px-3 py-6 text-center text-[11px] text-slate-400">
              The take-off produced no lines yet.
            </p>
          )}
          {result.sections.map((s, i) => (
            <SectionCard
              key={s.section}
              summary={s}
              lines={linesBySection.get(s.section) ?? []}
              defaultOpen={i === 0}
              sectionDisabled={disabledSections.includes(s.section)}
            />
          ))}
        </TabsContent>

        {/* ============================ PURCHASE ============================ */}
        <TabsContent value="purchase" className="mt-3 space-y-2">
          <div className="overflow-x-auto rounded-xl border border-slate-300">
            <table className="w-full min-w-[1200px] border-collapse text-[10.5px]">
              <thead>
                <tr className="bg-slate-100 text-left text-slate-700">
                  {[
                    "#",
                    "Material",
                    "Size & specification",
                    "Category",
                    "Net qty",
                    "Unit",
                    "Wastage %",
                    "Purchase qty",
                    "Stock bars / sheets",
                    "Off-cut",
                    "Reusable off-cut (m²)",
                    "Scrap (m²)",
                    "Total wt (kg)",
                    "Rate",
                    "Amount",
                    "Supplier",
                  ].map((h) => (
                    <th key={h} className={TH}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.purchase.map((p, i) => (
                  <tr key={p.materialKey} className={i % 2 === 1 ? "bg-slate-50/70" : undefined}>
                    <td className={cn(TD_R, "text-slate-500")}>{i + 1}</td>
                    <td className={cn(TD, "font-medium text-slate-900")}>{p.material}</td>
                    <td className={cn(TD, "text-[9.5px] text-slate-600")}>{p.spec}</td>
                    <td className={cn(TD, "text-[9.5px] text-slate-500")}>{p.category.replace(/_/g, " ")}</td>
                    <td className={TD_R}>{num(p.netQty, 3)}</td>
                    <td className={cn(TD, "text-slate-500")}>{p.uom}</td>
                    <td className={TD_R}>{num(p.wastagePercent, 1)}</td>
                    <td className={cn(TD_R, "font-semibold")}>{num(p.purchaseQty, 3)}</td>
                    <td className={TD_R}>
                      {p.stockUnits == null ? (
                        <span className="text-slate-400">—</span>
                      ) : (
                        <span>
                          <span className="font-bold">{p.stockUnits}</span>
                          <span className="ml-1 text-[9px] text-slate-500">{p.stockUnitLabel}</span>
                        </span>
                      )}
                    </td>
                    <td className={cn(TD_R, "text-slate-500")}>
                      {p.offcut == null ? "—" : num(p.offcut, 2)}
                    </td>
                    <td className={cn(TD_R, "text-emerald-700")}>
                      {p.reusableOffcutSqm == null ? "—" : num(p.reusableOffcutSqm, 2)}
                    </td>
                    <td className={cn(TD_R, "text-slate-500")}>
                      {p.scrapSqm == null ? "—" : num(p.scrapSqm, 2)}
                    </td>
                    <td className={TD_R}>{num(p.totalWeightKg)}</td>
                    <td className={cn(TD_R, "whitespace-nowrap")}>
                      {p.rate == null ? (
                        <span className="text-red-600">no rate</span>
                      ) : (
                        <>
                          {money(p.rate)}
                          <span className="ml-0.5 text-[9px] text-slate-400">{RATE_LABEL[p.rateUnit]}</span>
                        </>
                      )}
                    </td>
                    <td className={cn(TD_R, "font-semibold")}>{money(p.amount)}</td>
                    <td className={cn(TD, "text-[9.5px] text-slate-500")}>{p.supplier || "—"}</td>
                  </tr>
                ))}
                {result.purchase.length === 0 && (
                  <tr>
                    <td colSpan={16} className="border border-slate-300 px-2 py-4 text-center text-slate-400">
                      Nothing to purchase — no enabled lines.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="bg-amber-50">
                  <td colSpan={12} className="border border-slate-300 px-1.5 py-1 text-right font-extrabold text-slate-900">
                    MATERIAL PURCHASE TOTAL
                  </td>
                  <td className={cn(TD_R, "font-extrabold")}>{num(t.totalWeightKg)}</td>
                  <td className="border border-slate-300" />
                  <td className={cn(TD_R, "font-extrabold")}>{money(t.materialAmount)}</td>
                  <td className="border border-slate-300" />
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="text-[10px] leading-snug text-slate-500">
            Bars are nested ACROSS members here, not per line: a 2.6 m post is cut from the 2.9 m left over from a
            3.1 m rail, which is the whole reason this report exists. The money is the BOQ&apos;s money regrouped —
            summed, never recomputed — so the purchase order and the quotation cannot disagree by a rupee.
          </p>
        </TabsContent>

        {/* ============================ VALIDATION ============================ */}
        <TabsContent value="validation" className="mt-3">
          <IssueList issues={result.issues} />
        </TabsContent>

        {/* ============================ SETTINGS ============================ */}
        <TabsContent value="settings" className="mt-3 space-y-4">
          {/* --- wastage + GST --- */}
          <section className="rounded-xl border border-slate-300 p-3">
            <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-900">
              Wastage & tax
            </h4>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <Label className="text-[10.5px] text-slate-600">Global wastage % (blank = per material)</Label>
                <NumField
                  value={settings.wastagePercent}
                  onCommit={(v) => patchSettings({ wastagePercent: v })}
                  allowEmpty
                  step={0.5}
                  min={0}
                  placeholder="auto"
                  className="mt-1 h-8 text-[11px]"
                  ariaLabel="Global wastage percent"
                  title="Replaces every material's own wastage %. A per-line override still beats it."
                />
                <p className="mt-1 text-[9.5px] leading-snug text-slate-400">
                  An OVERRIDE, not a floor — leave it blank and each material uses its own %.
                </p>
              </div>
              <div>
                <Label className="text-[10.5px] text-slate-600">GST %</Label>
                <NumField
                  value={settings.gstPercent}
                  onCommit={(v) => patchSettings({ gstPercent: v ?? 0 })}
                  step={0.5}
                  min={0}
                  className="mt-1 h-8 text-[11px]"
                  ariaLabel="GST percent"
                />
                <p className="mt-1 text-[9.5px] leading-snug text-slate-400">
                  Levied on material + charges: {money(t.subtotal)} → {money(t.gstAmount)}.
                </p>
              </div>
              <div>
                <Label className="text-[10.5px] text-slate-600">Template kind</Label>
                <Select
                  value={settings.templateKind ?? defaultTemplateKind}
                  onValueChange={(v) => patchSettings({ templateKind: v as BoqTemplateKind })}
                >
                  <SelectTrigger className="mt-1 h-8 text-[11px]" aria-label="Template kind">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_KINDS.map((k) => (
                      <SelectItem key={k} value={k} className="text-[11px]">
                        {TEMPLATE_KIND_LABEL[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          {/* --- §15 competitive rate & selling price (INTERNAL) --- */}
          {(() => {
            const cr = result.competitive;
            if (!cr) return null;
            return (
              <section className="rounded-xl border border-emerald-300 bg-emerald-50/40 p-3">
                <h4 className="mb-0.5 text-[11px] font-bold uppercase tracking-wide text-emerald-900">
                  Competitive rate & selling price
                </h4>
                <p className="mb-2 text-[9.5px] leading-snug text-emerald-700">
                  A bottom-up markup on the BOQ cost so you can quote instantly and never dip below a safe
                  margin. <b>Internal only</b> — this is NOT the customer or Merchant-feed price; overhead 0
                  and profit 0 means selling equals cost.
                </p>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <Label className="text-[10.5px] text-slate-600">Overhead %</Label>
                    <NumField
                      value={competitive.overheadPercent}
                      onCommit={(v) => patchCompetitive({ overheadPercent: v ?? 0 })}
                      step={0.5}
                      min={0}
                      className="mt-1 h-8 text-[11px]"
                      ariaLabel="Overhead percent"
                    />
                  </div>
                  <div>
                    <Label className="text-[10.5px] text-slate-600">Overhead ₹ (flat)</Label>
                    <NumField
                      value={competitive.overheadAmount}
                      onCommit={(v) => patchCompetitive({ overheadAmount: v ?? 0 })}
                      step={500}
                      min={0}
                      className="mt-1 h-8 text-[11px]"
                      ariaLabel="Flat overhead amount"
                    />
                  </div>
                  <div>
                    <Label className="text-[10.5px] text-slate-600">Profit margin %</Label>
                    <NumField
                      value={competitive.profitPercent}
                      onCommit={(v) => patchCompetitive({ profitPercent: v ?? 0 })}
                      step={0.5}
                      className="mt-1 h-8 text-[11px]"
                      ariaLabel="Profit margin percent"
                      title="May be negative to undercut — a below-cost or below-min-margin quote is clearly warned."
                    />
                  </div>
                  <div>
                    <Label className="text-[10.5px] text-slate-600">Selling GST % (blank = {num(settings.gstPercent, 2)})</Label>
                    <NumField
                      value={competitive.gstPercent}
                      onCommit={(v) => patchCompetitive({ gstPercent: v })}
                      allowEmpty
                      step={0.5}
                      min={0}
                      placeholder={String(settings.gstPercent)}
                      className="mt-1 h-8 text-[11px]"
                      ariaLabel="Selling GST percent"
                    />
                  </div>
                  <div>
                    <Label className="text-[10.5px] text-slate-600">Round final to ₹ (0 = off)</Label>
                    <NumField
                      value={competitive.roundTo}
                      onCommit={(v) => patchCompetitive({ roundTo: v ?? 0 })}
                      step={100}
                      min={0}
                      className="mt-1 h-8 text-[11px]"
                      ariaLabel="Round final selling price to"
                    />
                  </div>
                  <div>
                    <Label className="text-[10.5px] text-slate-600">Target rate ₹/sqft</Label>
                    <NumField
                      value={competitive.targetRatePerSqft}
                      onCommit={(v) => patchCompetitive({ targetRatePerSqft: v })}
                      allowEmpty
                      step={10}
                      min={0}
                      placeholder="—"
                      className="mt-1 h-8 text-[11px]"
                      ariaLabel="Target rate per sqft"
                    />
                  </div>
                  <div>
                    <Label className="text-[10.5px] text-slate-600">Competitor rate ₹/sqft</Label>
                    <NumField
                      value={competitive.competitorRatePerSqft}
                      onCommit={(v) => patchCompetitive({ competitorRatePerSqft: v })}
                      allowEmpty
                      step={10}
                      min={0}
                      placeholder="—"
                      className="mt-1 h-8 text-[11px]"
                      ariaLabel="Competitor rate per sqft"
                    />
                  </div>
                  <div>
                    <Label className="text-[10.5px] text-slate-600">Min safe rate ₹/sqft</Label>
                    <NumField
                      value={competitive.minRatePerSqft}
                      onCommit={(v) => patchCompetitive({ minRatePerSqft: v })}
                      allowEmpty
                      step={10}
                      min={0}
                      placeholder="—"
                      className="mt-1 h-8 text-[11px]"
                      ariaLabel="Minimum safe rate per sqft"
                    />
                  </div>
                </div>

                {cr.warnings.length > 0 && (
                  <div
                    className={cn(
                      "mt-3 flex flex-col gap-1 rounded-lg border p-2 text-[10.5px] font-semibold",
                      cr.undercutsCost || cr.belowMinSafe
                        ? "border-red-300 bg-red-50 text-red-700"
                        : "border-amber-300 bg-amber-50 text-amber-800",
                    )}
                  >
                    {cr.warnings.map((wn) => (
                      <div key={wn} className="flex items-start gap-1.5">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>{wn}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                  <Stat label="Cost (ex-GST)" value={money(cr.costBase)} sub="material + charges" />
                  <Stat label="Overhead + profit" value={money(cr.overheadAmount + cr.profitAmount)} sub={`OH ${money(cr.overheadAmount)} · P ${money(cr.profitAmount)}`} />
                  <Stat label="Ex-GST selling" value={money(cr.exGstSelling)} sub={`margin ${num(cr.grossMarginPercent, 1)}%`} />
                  <Stat label={`Selling GST @ ${num(cr.gstPercent, 2)}%`} value={money(cr.gstAmount)} />
                  <Stat label="Final selling (incl. GST)" value={money(cr.finalSelling)} tone="amber" />
                  <Stat
                    label="Selling rate"
                    value={`${money(cr.ratePerSqft)}/sqft`}
                    sub={`${money(cr.ratePerSqm)}/m²`}
                    tone="slate"
                  />
                  <Stat
                    label="Gross profit"
                    value={money(cr.grossProfit)}
                    sub={`${num(cr.grossMarginPercent, 1)}% margin`}
                    tone={cr.grossProfit < 0 ? undefined : "slate"}
                  />
                  <Stat
                    label="Min safe selling"
                    value={cr.minSafeSelling == null ? "—" : money(cr.minSafeSelling)}
                    sub={competitive.minRatePerSqft == null ? "set a min rate" : `${money(competitive.minRatePerSqft)}/sqft`}
                  />
                  <Stat
                    label="vs Target"
                    value={cr.targetSelling == null ? "—" : money(cr.vsTargetAmount ?? 0)}
                    sub={cr.vsTargetPercent == null ? "set a target" : `${cr.vsTargetPercent > 0 ? "+" : ""}${num(cr.vsTargetPercent, 1)}%`}
                  />
                  <Stat
                    label="vs Competitor"
                    value={cr.competitorSelling == null ? "—" : money(cr.vsCompetitorAmount ?? 0)}
                    sub={cr.vsCompetitorPercent == null ? "set a competitor rate" : `${cr.vsCompetitorPercent > 0 ? "+dearer " : "cheaper "}${num(Math.abs(cr.vsCompetitorPercent), 1)}%`}
                  />
                </div>
              </section>
            );
          })()}

          {/* --- norms --- */}
          <section className="rounded-xl border border-slate-300 p-3">
            <h4 className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-900">
              Structural norms
            </h4>
            <p className="mb-2 text-[9.5px] text-slate-500">
              Every member count in the take-off is derived from these spacings — change one and the frame,
              the drawing overlay and the BOQ all move together.
            </p>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {(
                [
                  ["postSpacingM", "Post spacing (m)", 0.1],
                  ["studSpacingM", "Stud spacing (m)", 0.1],
                  ["joistSpacingM", "Floor joist spacing (m)", 0.1],
                  ["purlinSpacingM", "Roof purlin spacing (m)", 0.1],
                  ["trussSpacingM", "Truss spacing (m)", 0.1],
                  ["cuttingWastagePercent", "Cutting wastage %", 0.5],
                  ["sheetWastagePercent", "Sheet wastage %", 0.5],
                  ["handrailHeightM", "Handrail height (m)", 0.05],
                  ["handrailPostSpacingM", "Handrail post spacing (m)", 0.1],
                  ["handrailRails", "Handrail rails (nos)", 1],
                ] as [keyof BoqNorms, string, number][]
              ).map(([key, label, step]) => (
                <div key={key}>
                  <Label className="text-[10.5px] text-slate-600">{label}</Label>
                  <NumField
                    value={norms[key]}
                    onCommit={(v) => patchNorms({ [key]: v ?? DEFAULT_NORMS[key] } as Partial<BoqNorms>)}
                    step={step}
                    min={0}
                    className="mt-1 h-8 text-[11px]"
                    ariaLabel={label}
                  />
                </div>
              ))}
            </div>
          </section>

          {/* --- charges --- */}
          <section className="rounded-xl border border-slate-300 p-3">
            <h4 className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-900">
              Charges
            </h4>
            <p className="mb-2 text-[9.5px] text-slate-500">
              Labour and fabrication are levied on TOTAL STEEL ({num(t.totalSteelKg)} kg incl. wastage); painting on
              the PAINTED area (wall, roof and partition coverings only).
            </p>
            <ChargeEditor
              charges={settings.charges ?? []}
              onChange={(charges) => patchSettings({ charges })}
              amounts={chargeAmounts}
              totalCharges={t.chargesAmount}
            />
          </section>

          {/* --- sections --- */}
          <section className="rounded-xl border border-slate-300 p-3">
            <h4 className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-900">
              Sections included in this quotation
            </h4>
            <p className="mb-2 text-[9.5px] text-slate-500">
              A section switched off is excluded from every total but still printed on the BOQ, struck through — the
              admin must be able to see what was left out. A per-line switch beats this.
            </p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {BOQ_SECTIONS.map((s) => {
                const on = !disabledSections.includes(s.id);
                const summary = result.sections.find((x) => x.section === s.id);
                return (
                  <div
                    key={s.id}
                    className={cn(
                      "flex items-center justify-between gap-2 rounded-lg border px-2 py-1.5",
                      on ? "border-slate-300 bg-white" : "border-slate-200 bg-slate-50",
                    )}
                  >
                    <div className="min-w-0">
                      <div className={cn("text-[11px] font-medium", on ? "text-slate-900" : "text-slate-400")}>
                        {s.label}
                      </div>
                      <div className="truncate text-[9px] text-slate-400">
                        {summary ? `${summary.lines} lines · ${money(summary.materialAmount)}` : "no lines"}
                      </div>
                    </div>
                    <Switch
                      checked={on}
                      onCheckedChange={(v) => toggleSection(s.id, v)}
                      aria-label={`${s.label} ${on ? "on" : "off"}`}
                      className="scale-90"
                    />
                  </div>
                );
              })}
            </div>
          </section>

          {/* --- construction presets (spec §1) --- */}
          <section className="rounded-xl border border-indigo-300 bg-indigo-50/40 p-3">
            <h4 className="mb-0.5 text-[11px] font-bold uppercase tracking-wide text-indigo-900">
              Company construction presets
            </h4>
            <p className="mb-2 text-[9.5px] leading-snug text-indigo-700">
              Configure your standard construction method ONCE and reuse it on every quotation. A preset stores this
              whole settings block — section bindings, spacing norms, charges, GST, wastage and competitive markup.
              The built-in <b>Company Standard</b> (2'-0" c/c framing) auto-applies to every NEW cabin; duplicate it to
              customise, set any preset as the company default, or restore it here. Editing values below only changes
              THIS quotation — the preset is untouched until you save.
            </p>

            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-[240px] flex-1">
                <Label className="text-[10.5px] text-slate-600">Presets</Label>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger className="mt-1 h-8 text-[11px]" aria-label="Construction presets">
                    <SelectValue placeholder={templates.length ? "Choose a preset…" : "No presets yet"} />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((tpl) => (
                      <SelectItem key={tpl.id} value={tpl.id} className="text-[11px]">
                        {tpl.name} · {TEMPLATE_KIND_LABEL[tpl.kind]}
                        {isBuiltinPresetId(tpl.id) ? " · built-in" : ""}
                        {tpl.isDefault ? " · default" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!selectedTemplate}
                onClick={() => applyTemplate(selectedTemplate)}
                className="h-8 text-[11px]"
                title="Apply the selected preset to this quotation"
              >
                Apply
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!selectedTemplate}
                onClick={() => void duplicateTemplate(selectedTemplate)}
                className="h-8 text-[11px]"
                title="Duplicate the selected preset into a new editable copy"
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Duplicate
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!selectedTemplate || isBuiltinPresetId(selectedTemplate)}
                onClick={() => void setAsDefault(selectedTemplate)}
                className="h-8 text-[11px]"
                title="Make the selected preset the company default for new cabins"
              >
                Set default
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={restoreDefault}
                className="h-8 text-[11px]"
                title="Reset this quotation to the company default preset"
              >
                <RefreshCw className="mr-1 h-3.5 w-3.5" />
                Restore default
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!selectedTemplate || isBuiltinPresetId(selectedTemplate)}
                onClick={() => void removeTemplate(selectedTemplate)}
                className="h-8 border-red-200 text-[11px] text-red-600 hover:bg-red-50"
                title="Delete the selected saved preset (built-ins cannot be deleted)"
              >
                <Trash2 className="mr-1 h-3.5 w-3.5" />
                Delete
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setTplKind(settings.templateKind ?? defaultTemplateKind);
                  setTplError("");
                  setSaveOpen(true);
                }}
                className="h-8 bg-amber-600 text-[11px] hover:bg-amber-700"
                title="Save the current settings as a new named preset"
              >
                <Save className="mr-1 h-3.5 w-3.5" />
                Save as preset
              </Button>
            </div>

            <div className="mt-2 text-[9.5px] text-slate-400">
              Material Master: {materials.length} materials · source{" "}
              <span className={cn("font-semibold", source === "db" ? "text-emerald-600" : "text-amber-600")}>
                {source === "db" ? "database" : "seed (migration not applied)"}
              </span>
              {settings.templateId
                ? ` · this quotation started from ${
                    templates.find((tp) => tp.id === settings.templateId)?.name ?? settings.templateId.slice(0, 8)
                  }`
                : ""}
            </div>
          </section>
        </TabsContent>
      </Tabs>

      {/* ---------------- Add manual item ---------------- */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm">Add a manual BOQ row</DialogTitle>
            <DialogDescription className="text-[11px]">
              A row no drawing produced. Give it a CUT LENGTH to make it a steel member (it then joins the cutting
              list and gets nested into stock bars), an AREA to make it a covering, or neither to make it a counted
              item.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[10.5px] text-slate-600">Section</Label>
                <Select
                  value={draft.section}
                  onValueChange={(v) => setDraft((d) => ({ ...d, section: v as BoqSection }))}
                >
                  <SelectTrigger className="mt-1 h-8 text-[11px]" aria-label="Section">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BOQ_SECTIONS.map((s) => (
                      <SelectItem key={s.id} value={s.id} className="text-[11px]">
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-[10.5px] text-slate-600">Material</Label>
                <Select value={draft.materialKey} onValueChange={(v) => setDraft((d) => ({ ...d, materialKey: v }))}>
                  <SelectTrigger className="mt-1 h-8 text-[11px]" aria-label="Material">
                    <SelectValue placeholder="Pick from the master…" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {materials.map((mat) => (
                      <SelectItem key={mat.key} value={mat.key} className="text-[11px]">
                        {mat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-[10.5px] text-slate-600">Description</Label>
              <Input
                value={draft.description}
                onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                placeholder={index[draft.materialKey]?.name ?? "Defaults to the material name"}
                className="mt-1 h-8 text-[11px]"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-[10.5px] text-slate-600">Qty (nos)</Label>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={draft.qty}
                  onChange={(e) => setDraft((d) => ({ ...d, qty: e.target.value }))}
                  className="mt-1 h-8 text-[11px]"
                />
              </div>
              <div>
                <Label className="text-[10.5px] text-slate-600">Cut length (m)</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.001}
                  value={draft.cutLengthM}
                  onChange={(e) => setDraft((d) => ({ ...d, cutLengthM: e.target.value }))}
                  placeholder="steel only"
                  className="mt-1 h-8 text-[11px]"
                />
              </div>
              <div>
                <Label className="text-[10.5px] text-slate-600">Area each (m²)</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={draft.areaSqm}
                  onChange={(e) => setDraft((d) => ({ ...d, areaSqm: e.target.value }))}
                  placeholder="sheet only"
                  className="mt-1 h-8 text-[11px]"
                />
              </div>
            </div>

            <div>
              <Label className="text-[10.5px] text-slate-600">Note (printed as a BOQ remark)</Label>
              <Textarea
                value={draft.note}
                onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
                rows={2}
                className="mt-1 text-[11px]"
              />
            </div>

            {draftError && <p className="text-[11px] font-medium text-red-600">{draftError}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={() => setAddOpen(false)} className="text-[11px]">
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={submitManual}
              className="bg-amber-600 text-[11px] hover:bg-amber-700"
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add row
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------------- Save as template ---------------- */}
      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Save these settings as a template</DialogTitle>
            <DialogDescription className="text-[11px]">
              Stores the norms, charges, GST, material substitutions, overrides and manual rows exactly as they are
              now. Marking it default makes it the starting point for every new quotation of that kind.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <div>
              <Label className="text-[10.5px] text-slate-600">Template name</Label>
              <Input
                value={tplName}
                onChange={(e) => setTplName(e.target.value)}
                placeholder="e.g. MS cabin — standard 2026"
                className="mt-1 h-8 text-[11px]"
              />
            </div>

            <div>
              <Label className="text-[10.5px] text-slate-600">Kind</Label>
              <Select value={tplKind} onValueChange={(v) => setTplKind(v as BoqTemplateKind)}>
                <SelectTrigger className="mt-1 h-8 text-[11px]" aria-label="Template kind">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATE_KINDS.map((k) => (
                    <SelectItem key={k} value={k} className="text-[11px]">
                      {TEMPLATE_KIND_LABEL[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[10.5px] text-slate-600">Description</Label>
              <Textarea
                value={tplDesc}
                onChange={(e) => setTplDesc(e.target.value)}
                rows={2}
                className="mt-1 text-[11px]"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-slate-300 px-2 py-1.5">
              <div>
                <div className="text-[11px] font-medium text-slate-900">Make this the default</div>
                <div className="text-[9.5px] text-slate-500">Demotes the current default for this kind.</div>
              </div>
              <Switch checked={tplDefault} onCheckedChange={setTplDefault} aria-label="Default template" />
            </div>

            {tplError && <p className="text-[11px] font-medium text-red-600">{tplError}</p>}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSaveOpen(false)}
              className="text-[11px]"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={tplSaving}
              onClick={() => void submitTemplate()}
              className="bg-amber-600 text-[11px] hover:bg-amber-700"
            >
              {tplSaving ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1 h-3.5 w-3.5" />}
              Save template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
