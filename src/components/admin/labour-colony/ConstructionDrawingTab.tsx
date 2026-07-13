"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import jsPDF from "jspdf";
import { Layers, Printer, Download, Loader2, Droplet, Stamp, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { DrawingWatermark } from "./DrawingWatermark";
import { exportSheetToPdf, formatBytes } from "@/lib/pdf/sheetPdf";
import { ConstructionFloorPlan } from "./ConstructionFloorPlan";
import { PlinthBeamLayout } from "./PlinthBeamLayout";
import { PlinthBeamSection } from "./PlinthBeamSection";
import { ConstructionNotes } from "./ConstructionNotes";
import { ColumnLayoutPlan } from "./ColumnLayoutPlan";
import { BeamJunctionDetail } from "./BeamJunctionDetail";
import { BarBendingSchedule } from "./BarBendingSchedule";
import { ApprovalStamp, StatusWatermark } from "./ApprovalStamp";
import { SignOffPanel } from "./SignOffPanel";
import {
  clearLocal,
  defaultRevision,
  emptySignOff,
  fetchTeamSignOff,
  loadLocal,
  loadRevision,
  saveLocal,
  saveRevision,
  saveTeamSignOff,
  statusMeta,
  todayDDMMYYYY,
  type RevisionInfo,
  type SignOffDetails,
  type SignOffNames,
  type SignOffSource,
} from "./signOff";
import { COMPANY } from "@/lib/company";
import { ColumnReinforcementDetail } from "./ColumnReinforcementDetail";
import { BeamSectionDetail } from "./BeamSectionDetail";
import { FootingLayoutPlan } from "./FootingLayoutPlan";
import { FootingScheduleDetail } from "./FootingScheduleDetail";
import { buildColumnMarks } from "@/lib/quotation/labourColonyRebar";
import { buildConstructionPlan, buildBeamSchedule, constructionNotes } from "@/lib/quotation/labourColonyPlan";
import { type LabourColonyConfig, type FloorCount } from "@/lib/quotation/labourColony";
import { type CivilWorkResult } from "@/lib/quotation/labourColonyCivil";

const FLOOR_LABELS = ["GROUND FLOOR PLAN", "FIRST FLOOR PLAN", "SECOND FLOOR PLAN"];

/**
 * Construction-drawing sheet for the Labour Colony Calculator (spec §6/§7):
 * a professional, dimensioned civil drawing set (architectural floor plan +
 * plinth-beam layout + beam schedule + plinth-beam section + notes), driven live
 * by the structure/civil config, with print and paginated PDF export.
 */
export function ConstructionDrawingTab({
  config,
  rooms,
  floors,
  civil,
}: {
  config: LabourColonyConfig;
  rooms: number;
  floors: FloorCount;
  civil: CivilWorkResult;
}) {
  const [floor, setFloor] = useState(0);
  const [busy, setBusy] = useState(false);
  /** Company-name watermark across the sheet. On by default — a drawing that leaves the office
   *  unmarked is the thing you cannot undo; turning it off is a deliberate act. */
  const [watermark, setWatermark] = useState(true);
  /**
   * The "NOT FOR CONSTRUCTION" status — the top approval banner AND the diagonal overlay across the
   * sheet. They are ONE control, not two: the banner carries the engineer's checklist and the overlay
   * is what stops a loose printed page being mistaken for a construction issue. Hiding one without the
   * other would produce a sheet that reads as approved but was never signed.
   *
   * ON by default, deliberately. The only legitimate reason to switch it off is that a qualified
   * structural engineer has actually checked and stamped this issue — at which point the sizes on the
   * sheet are their design, not the calculator's assumption. Everything else the calculator emits is a
   * quotation/approval issue derived from an ASSUMED safe bearing capacity, and must carry the stamp.
   */
  const [approvalStamp, setApprovalStamp] = useState(true);

  /**
   * Names printed onto the sign-off strip, so nobody hand-writes them on every set.
   *
   * Starts EMPTY and is populated after mount. Every default we want (the shared Supabase row, the
   * localStorage cache, today's date) is browser-only, so seeding them in useState would make the
   * server-rendered HTML differ from the first client render — a hydration mismatch.
   */
  const [signOff, setSignOff] = useState<SignOffDetails>(emptySignOff);
  const [signOffSource, setSignOffSource] = useState<SignOffSource>("unsaved");
  const [signOffSaving, setSignOffSaving] = useState(false);
  /** Approval status + revision block. Per-issue; cached on this device (populated after mount —
   *  localStorage is browser-only, so seeding it in useState would cause a hydration mismatch). */
  const [revision, setRevision] = useState<RevisionInfo>(() => ({
    status: "revision", revNo: "R0", revDate: "", revDescription: "", remarks: "",
  }));
  const updateRevision = (next: RevisionInfo) => {
    setRevision(next);
    saveRevision(next);
  };
  /** Pending debounce timer for the shared write — one round-trip per pause, not per keystroke. */
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const signOffDefaults = (): SignOffDetails => ({
    ...emptySignOff(),
    // Usable with zero typing on day one. The engineer fields stay blank on purpose — we do not
    // have an engineer, and we must not invent one.
    designedBy: COMPANY.legalName,
    date: todayDDMMYYYY(),
  });

  useEffect(() => {
    let cancelled = false;

    // Paint from the local cache first so the strip is never blank while the network settles…
    const cached = loadLocal();
    if (cached) {
      setSignOff({ ...cached, date: todayDDMMYYYY() });
      setSignOffSource("local");
    } else {
      setSignOff(signOffDefaults());
    }
    // Restore the per-issue approval status + revision block (defaults on first use).
    setRevision(loadRevision() ?? defaultRevision());

    // …then let the SHARED row win — but only the fields the server actually owns. approvedBy /
    // approvedByDesignation are local-only (no server columns), so a spread of `team` would wipe
    // them with the empty strings fetchTeamSignOff fills in.
    void fetchTeamSignOff().then((team) => {
      if (cancelled || !team) return; // offline / not migrated / no access → keep the cache.
      setSignOff((prev) => ({
        ...prev,
        designedBy: team.designedBy,
        checkedBy: team.checkedBy,
        engineerName: team.engineerName,
        engineerLicence: team.engineerLicence,
        date: todayDDMMYYYY(),
      }));
      setSignOffSource("team");
      saveLocal({ ...(cached ?? emptySignOff()), ...team, approvedBy: cached?.approvedBy ?? "", approvedByDesignation: cached?.approvedByDesignation ?? "" }); // refresh the offline copy, keep local-only fields
    });

    return () => {
      cancelled = true;
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Persist an edit. The local cache is written immediately (so a refresh never loses typing), and
   * the shared row is written after a short pause. The badge only claims "Saved for team" when the
   * Supabase write actually succeeded — otherwise it says "This device only", because telling
   * someone their engineer's name is shared when it is not is worse than not saving at all.
   */
  const updateSignOff = (next: SignOffDetails) => {
    setSignOff(next);

    const names: SignOffNames = {
      designedBy: next.designedBy,
      checkedBy: next.checkedBy,
      engineerName: next.engineerName,
      engineerLicence: next.engineerLicence,
      approvedBy: next.approvedBy,
      approvedByDesignation: next.approvedByDesignation,
    };
    saveLocal(names);

    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSignOffSaving(true);
    saveTimer.current = setTimeout(() => {
      void saveTeamSignOff(names).then((ok) => {
        setSignOffSaving(false);
        setSignOffSource(ok ? "team" : "local");
        if (!ok) {
          toast({
            title: "Saved on this device only",
            description:
              "The shared sign-off settings could not be reached, so your team will not see these names yet.",
            variant: "destructive",
          });
        }
      });
    }, 600);
  };

  /** Back to the zero-typing defaults — cleared for the whole team, not just this browser. */
  const resetSignOff = () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    clearLocal();
    const defaults = signOffDefaults();
    setSignOff(defaults);
    setSignOffSaving(true);
    void saveTeamSignOff({
      designedBy: defaults.designedBy,
      checkedBy: "",
      engineerName: "",
      engineerLicence: "",
      approvedBy: "",
      approvedByDesignation: "",
    }).then((ok) => {
      setSignOffSaving(false);
      setSignOffSource(ok ? "team" : "local");
    });
  };

  const sheetRef = useRef<HTMLDivElement>(null);

  const rpf = Math.max(1, Math.ceil(rooms / Math.max(1, floors)));
  const plan = useMemo(
    () =>
      buildConstructionPlan(config, {
        roomsPerFloor: rpf,
        startRoomNo: floor * rpf + 1,
        floorLabel: FLOOR_LABELS[Math.min(floor, 2)],
      }),
    [config, rpf, floor],
  );
  const section = civil.foundation.section;
  const schedule = useMemo(() => buildBeamSchedule(plan, section), [plan, section]);
  const notes = useMemo(() => constructionNotes(section, floors), [section, floors]);

  // Columns are set out on the ARCHITECTURAL grid (plan.colXs × rowYs) — and the civil engine is
  // now handed that SAME grid, so `civil.foundation.columnCount` is this same number by
  // construction. The rebar design and BBS come straight from the engine: one source, no recompute,
  // nothing to drift.
  const columns = useMemo(() => buildColumnMarks(plan.colXs, plan.rowYs), [plan.colXs, plan.rowYs]);
  const rebar = civil.foundation.rebar;
  const bbs = civil.foundation.bbs;
  // Load-differentiated footings (F1/F2/F3) — the SAME types the BOQ prices.
  const footingTypes = civil.foundation.footingTypes;

  const downloadPdf = async () => {
    if (!sheetRef.current) return;
    setBusy(true);
    try {
      // One shared exporter for every calculator, but THIS sheet gets the high-fidelity preset:
      // dense CAD-style line art (rebar shape diagrams, hatch fills, 6–8 pt dimension text) is
      // exactly the content JPEG compresses worst — its DCT ringing shows up as fuzzy hairlines and
      // mushy text. PNG is lossless (no ringing) at a real print DPI, with a generous size budget so
      // the adaptive backoff essentially never has to trade quality away on a normal export.
      const r = await exportSheetToPdf(sheetRef.current, {
        filename: `labour-colony-civil-drawing-${(config.projectName || "colony").replace(/\s+/g, "-").toLowerCase() || "colony"}`,
        // Every drawing card is a direct child of the sheet, so the default breakpoints already
        // land between cards; the schedules are tall tables worth keeping whole too.
        breakSelector: "table, thead, tbody > tr",
        format: "png",
        dpi: 300,
        minDpi: 220,
        targetBytes: 10_000_000,
      });
      toast({
        title: "Drawing PDF downloaded",
        description: `${r.pages} page${r.pages > 1 ? "s" : ""} · ${formatBytes(r.bytes)} · ${r.dpi} DPI${r.overBudget ? " (kept above the size budget to preserve legibility)" : ""}`,
      });
    } catch (err: unknown) {
      console.error("Construction drawing PDF failed:", err);
      const msg = err instanceof Error ? err.message : "";
      toast({ title: "Could not generate drawing PDF", description: msg ? msg.slice(0, 140) : "Please try again.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-amber" />
          <span className="font-display font-bold text-sm">Civil Construction Drawing</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {floors > 1 && (
            <Select value={String(floor)} onValueChange={(v) => setFloor(Number(v))}>
              <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: floors }, (_, i) => (
                  <SelectItem key={i} value={String(i)}>{FLOOR_LABELS[Math.min(i, 2)]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {/* Watermark toggle — the company name is stamped across the sheet, so a screenshot,
              a print and the PDF all carry it. Off by default is NOT the safe default: leave it on. */}
          <label className="flex items-center gap-2 rounded-md border border-input px-3 py-1.5 text-xs font-medium">
            <Switch checked={watermark} onCheckedChange={setWatermark} aria-label="Watermark" />
            <span className="flex items-center gap-1.5">
              <Droplet className="h-3.5 w-3.5 text-amber" /> Watermark
            </span>
          </label>
          {/* NOT-FOR-CONSTRUCTION toggle. Drives the approval banner and the diagonal overlay together
              (see the `approvalStamp` state). Turning it red when OFF is intentional — an unstamped
              sheet with no status on it is the dangerous state, and it should look like one. */}
          <label
            className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium ${
              approvalStamp ? "border-input" : "border-red-400 bg-red-50 text-red-700"
            }`}
          >
            <Switch
              checked={approvalStamp}
              onCheckedChange={setApprovalStamp}
              aria-label="Not-for-construction approval stamp"
            />
            <span className="flex items-center gap-1.5">
              <Stamp className={`h-3.5 w-3.5 ${approvalStamp ? "text-amber" : "text-red-600"}`} />
              Approval Stamp
            </span>
          </label>
          <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5"><Printer className="h-4 w-4" /> Print</Button>
          <Button size="sm" onClick={downloadPdf} disabled={busy} className="gap-1.5 bg-gradient-to-r from-amber to-amber-light text-white border-0">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Download Drawing PDF
          </Button>
        </div>
      </div>

      {/* ONE grid — the drawing and the BOQ count the same columns by construction. */}
      <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs text-emerald-900">
        <b>Single architectural grid.</b> {plan.colXs.length} × {plan.rowYs.length} ={" "}
        <b>{columns.length} columns</b> — and the Civil BOQ prices exactly{" "}
        <b>{civil.foundation.footingCount} footings, {civil.foundation.pedestalCount} pedestals and{" "}
        {civil.foundation.columnCount} columns</b> from that same grid. Steel is taken off the bar-bending
        schedule below ({civil.foundation.bbs.totalKg} kg = {civil.foundation.bbs.totalTonnes} t), not a
        kg/cum rule of thumb.
      </div>

      {/* Footing types the BOQ actually prices — the schedule and the quantities are one thing. */}
      {footingTypes.length > 0 && (
        <div className="rounded-xl border border-sky-300 bg-sky-50 p-3 text-xs text-sky-900">
          <b>Load-differentiated footings.</b>{" "}
          {footingTypes.map((t) => `${t.mark} (${t.kind}) ${t.count} nos @ ${Math.round(t.sideM * 1000)}×${Math.round(t.sideM * 1000)}×${Math.round(t.depthM * 1000)}`).join(" · ")}
          {" "}— each sized against its own tributary load and the {footingTypes[0].sbcKnm2} kN/m² SBC, and the
          civil BOQ prices exactly these (concrete, excavation, PCC and the bar-bending schedule).
        </div>
      )}

      {/* The sign-off editor. OUTSIDE sheetRef on purpose — it is a control, so it must never land in
          window.print() or the exported PDF; only the values it produces are printed, onto the strip.
          Hidden when the stamp is off, because then there is no strip to fill. */}
      {approvalStamp && (
        <SignOffPanel
          value={signOff}
          onChange={updateSignOff}
          onReset={resetSignOff}
          source={signOffSource}
          saving={signOffSaving}
          revision={revision}
          onRevisionChange={updateRevision}
        />
      )}

      {/* Shown ONLY while the stamp is off. Deliberately sits OUTSIDE sheetRef, so it is a reminder to
          the person at the screen and never prints or lands in the exported PDF — the whole point is
          that the sheet itself now carries no status, and that must not be papered over. */}
      {!approvalStamp && (
        <div className="flex items-start gap-2.5 rounded-xl border border-red-300 bg-red-50 p-3 text-xs text-red-900">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
          <span>
            <b>Approval stamp is OFF.</b> This sheet will print and export with <b>no approval
            status</b> ({statusMeta(revision.status).watermark}), no revision block and no engineer
            checklist. The sizes on it are still derived from an <b>assumed</b> safe bearing capacity,
            not a site-specific structural analysis. Only leave this off if a qualified structural
            engineer has checked and signed this issue.
          </span>
        </div>
      )}

      {/* The sheet. `relative` so the NOT-FOR-CONSTRUCTION watermark can overlay it, and the watermark
          lives INSIDE the ref'd node so it is captured in the exported PDF too. */}
      <div ref={sheetRef} id="lc-construction-sheet" className="relative space-y-6 bg-white p-2 rounded-2xl">
        {/* Inside the sheet, so a screenshot, a print and the PDF export all carry it. */}
        {watermark && <DrawingWatermark />}

        {approvalStamp && (
          <ApprovalStamp
            projectName={config.projectName}
            warnings={rebar.warnings}
            signOff={signOff}
            revision={revision}
          />
        )}

        <ConstructionFloorPlan plan={plan} />
        <ColumnLayoutPlan plan={plan} columns={columns} rebar={rebar} />

        {/* FOUNDATION — setting-out layout, then a detail per footing type */}
        <FootingLayoutPlan plan={plan} footingTypes={footingTypes} />
        <FootingScheduleDetail rebar={rebar} footingTypes={footingTypes} />

        {/* COLUMNS — the cross-section + tie zones */}
        <ColumnReinforcementDetail rebar={rebar} />

        {/* BEAMS — layout, PB1/PB2 cross-sections + stirrup zones, the through-section, junctions */}
        <PlinthBeamLayout plan={plan} schedule={schedule} />
        <BeamSectionDetail rebar={rebar} schedule={schedule} />
        <PlinthBeamSection foundation={civil.foundation} />
        <BeamJunctionDetail rebar={rebar} />

        {/* STEEL — BBS with IS 2502 shape codes + bent-bar diagrams */}
        <BarBendingSchedule bbs={bbs} rebar={rebar} counts={{
          footings: civil.foundation.footingCount,
          pedestals: civil.foundation.pedestalCount,
          beamLengthM: civil.foundation.plinthBeamLengthM,
        }} />

        <ConstructionNotes notes={notes} section={section} floors={floors} rebar={rebar} columnCount={columns.length} />

        {approvalStamp && <StatusWatermark status={revision.status} />}
      </div>
    </div>
  );
}
