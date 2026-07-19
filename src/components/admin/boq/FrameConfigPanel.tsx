"use client";

/**
 * BASE FRAME & CROSS STIFFENER CONFIGURATION  (spec §2 "Bottom base frame / Intermediate wall
 * stiffeners / Floor & roof cross members").
 *
 * A single consolidated screen for the structural steel frame, in place of the three scattered places
 * the same knobs live today (Material Master row · Settings → norms · Detailed BOQ per-line override).
 * For each frame member group it lets the admin:
 *
 *   • pick the MEMBER / SECTION SIZE      → per-line BoqOverride.materialKey across the group
 *   • read its THICKNESS / GRADE / WEIGHT / RATE (the Material Master's own attributes, edited there)
 *   • set the CROSS-STIFFENER SPACING     → BoqNorms.studSpacingM (and post/joist/purlin spacing)
 *   • override the NUMBER of members      → BoqOverride.qty + lock, per line
 *   • read the INDIVIDUAL & TOTAL LENGTH, TOTAL WEIGHT and AMOUNT (derived by the engine)
 *
 * Nothing here is a new calculation — every editable value writes back through the EXISTING engine
 * plumbing (materialMap-style per-line materialKey, norms, qty/lock/rate overrides), and every number
 * shown is read straight off the same priced BoqResult the rest of the panel uses. Because the 3D
 * model and its assembly captions derive from the same take-off + priced result, changing the spacing
 * re-draws the studs in the 3D view and changing the section updates the assembly engineering rows —
 * with no second source of truth.
 *
 * It is calculator-agnostic: it groups whatever frame lines the priced result contains, so it serves
 * the Cabin and the Labour Colony BOQ alike.
 */

import { useMemo } from "react";

import type {
  BoqLine,
  BoqNorms,
  BoqOverride,
  BoqResult,
  Material,
  MaterialIndex,
} from "@/lib/boq/types";

import { NumField, QTY_SOURCE_BADGE, TD, TD_R, TH, money, num } from "./boqShared";

/** The subset of BoqPanel's override patch this panel writes. Structurally a BoqPanel OverridePatch. */
type FramePatch = {
  qty?: number | null;
  rate?: number | null;
  materialKey?: string | null;
  locked?: boolean | null;
};

export interface FrameConfigPanelProps {
  result: BoqResult;
  /** Full Material Master list — the section dropdown offers every steel section from it. */
  materials: Material[];
  index: MaterialIndex;
  norms: BoqNorms;
  overrides: Record<string, BoqOverride>;
  applyOverride: (id: string, p: FramePatch) => void;
  /** Clears qty / rate / lock on a line (keeps the group's material choice + enabled flag). */
  resetLine: (id: string) => void;
  toggleLock: (line: BoqLine) => void;
  patchNorms: (p: Partial<BoqNorms>) => void;
}

/* ------------------------------------------------------------------ groups */

interface FrameGroup {
  key: string;
  title: string;
  blurb: string;
  /** A line belongs to the FIRST group whose test passes (order matters). */
  test: (l: BoqLine) => boolean;
  /** The spacing norm that drives this group's member count, if any. */
  spacing?: { field: keyof BoqNorms; label: string; step: number };
}

const rx = (s: string) => new RegExp(s, "i");

/** Only steel lines are frame members. */
const isSteel = (l: BoqLine): boolean => l.cutLengthM != null;

const GROUPS: FrameGroup[] = [
  {
    key: "base",
    title: "Base frame (bottom & top perimeter)",
    blurb: "The bottom chassis and the top perimeter frame — 2 longitudinal + 2 cross members each.",
    test: (l) => rx("base frame|top frame").test(l.description),
  },
  {
    key: "stud",
    title: "Cross stiffeners (wall studs)",
    blurb: "Intermediate vertical stiffeners between the corner posts — count = ⌈wall ÷ spacing⌉ − 1, net of the posts.",
    test: (l) => rx("stiffener|\\bstud").test(l.description),
    spacing: { field: "studSpacingM", label: "Cross-stiffener spacing (m)", step: 0.05 },
  },
  {
    key: "post",
    title: "Vertical posts (corner + intermediate)",
    blurb: "The corner columns and the intermediate posts the stiffeners are hung between.",
    test: (l) => rx("\\bpost").test(l.description) && !rx("handrail").test(l.description),
    spacing: { field: "postSpacingM", label: "Post spacing (m)", step: 0.1 },
  },
  {
    key: "joist",
    title: "Floor cross members (joists)",
    blurb: "Transverse floor joists spanning the width.",
    test: (l) => rx("floor cross member|\\bjoist").test(l.description),
    spacing: { field: "joistSpacingM", label: "Floor joist spacing (m)", step: 0.1 },
  },
  {
    key: "purlin",
    title: "Roof cross members (purlins)",
    blurb: "Roof purlins spanning the length, plus trusses / rafters where a sloped roof needs them.",
    test: (l) => rx("roof cross member|\\bpurlin|\\btruss|\\brafter|ridge").test(l.description),
    spacing: { field: "purlinSpacingM", label: "Roof purlin spacing (m)", step: 0.1 },
  },
];

/* ------------------------------------------------------------------ helpers */

/** The distinct material keys present in a group (usually one). */
function groupKeys(lines: BoqLine[]): string[] {
  return Array.from(new Set(lines.map((l) => l.materialKey)));
}

function sectionText(m: Material | undefined): string {
  if (!m) return "—";
  return [m.sectionSize, m.thicknessMm ? `${m.thicknessMm} mm` : "", m.grade].filter(Boolean).join(" · ");
}

/* ------------------------------------------------------------------ panel */

export default function FrameConfigPanel({
  result,
  materials,
  index,
  norms,
  overrides,
  applyOverride,
  resetLine,
  toggleLock,
  patchNorms,
}: FrameConfigPanelProps) {
  const steelOptions = useMemo(
    () =>
      materials
        .filter((m) => m.category === "steel_section" && m.isActive !== false)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [materials],
  );

  const grouped = useMemo(() => {
    const steel = result.lines.filter(isSteel);
    return GROUPS.map((g) => {
      const lines = steel.filter((l) => {
        // first-match-wins: skip a line an earlier group already claimed
        const owner = GROUPS.find((gg) => gg.test(l));
        return owner?.key === g.key;
      });
      return { group: g, lines };
    }).filter((x) => x.lines.length > 0);
  }, [result.lines]);

  if (grouped.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
        No steel frame members in the current take-off. Add cabin or colony dimensions to generate the frame.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
        <p className="font-semibold text-slate-800">Base Frame &amp; Cross Stiffener Configuration</p>
        <p className="mt-1">
          One place for the whole steel frame. Pick the section per member group, set the spacing, and
          override or lock any count. Section size, thickness, unit weight and rate come from the{" "}
          <a href="/admin/material-master" className="font-medium text-amber-700 underline">
            Material Master
          </a>{" "}
          (edit them there). Every change re-prices the BOQ and, for spacing, re-draws the studs in the
          2D overlay and the 3D model — one source of truth, no re-entry.
        </p>
      </div>

      {grouped.map(({ group, lines }) => (
        <GroupCard
          key={group.key}
          group={group}
          lines={lines}
          steelOptions={steelOptions}
          index={index}
          norms={norms}
          overrides={overrides}
          applyOverride={applyOverride}
          resetLine={resetLine}
          toggleLock={toggleLock}
          patchNorms={patchNorms}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ group card */

function GroupCard({
  group,
  lines,
  steelOptions,
  index,
  norms,
  overrides,
  applyOverride,
  resetLine,
  toggleLock,
  patchNorms,
}: {
  group: FrameGroup;
  lines: BoqLine[];
  steelOptions: Material[];
  index: MaterialIndex;
  norms: BoqNorms;
  overrides: Record<string, BoqOverride>;
  applyOverride: (id: string, p: FramePatch) => void;
  resetLine: (id: string) => void;
  toggleLock: (line: BoqLine) => void;
  patchNorms: (p: Partial<BoqNorms>) => void;
}) {
  const keys = groupKeys(lines);
  const mixed = keys.length > 1;
  const currentKey = mixed ? "" : keys[0];
  const material = mixed ? undefined : index[currentKey];

  // Subtotals over ENABLED lines only, so they reconcile with the BOQ totals.
  const enabled = lines.filter((l) => l.enabled);
  const totPieces = enabled.reduce((s, l) => s + (l.pieces ?? 0), 0);
  const totLength = enabled.reduce((s, l) => s + (l.runningLengthM ?? 0), 0);
  const totWeight = enabled.reduce((s, l) => s + l.totalWeightKg, 0);
  const totAmount = enabled.reduce((s, l) => s + l.amount, 0);
  const disabledCount = lines.length - enabled.length;

  const setGroupMaterial = (key: string) => {
    const value = key || null;
    // Apply to every line in the group so the whole member type stays consistent.
    for (const l of lines) applyOverride(l.id, { materialKey: value });
  };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 bg-slate-50 px-3 py-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h4 className="text-sm font-bold text-slate-800">{group.title}</h4>
          <span className="text-[11px] text-slate-500">
            {enabled.length} member group{enabled.length === 1 ? "" : "s"} · {num(totPieces, 0)} pcs ·{" "}
            {num(totLength, 2)} m · {num(totWeight, 1)} kg · {money(totAmount)}
          </span>
        </div>
        <p className="mt-0.5 text-[11px] text-slate-500">{group.blurb}</p>
      </div>

      {/* member selection + spec + spacing */}
      <div className="grid gap-3 border-b border-slate-100 px-3 py-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1">
          <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Member / section
          </label>
          <select
            value={currentKey}
            onChange={(e) => setGroupMaterial(e.target.value)}
            className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-xs outline-none focus:border-amber-500"
          >
            {mixed && <option value="">— Mixed (select to unify) —</option>}
            {steelOptions.map((m) => (
              <option key={m.key} value={m.key}>
                {m.name} — {m.sectionSize}
              </option>
            ))}
            {/* keep the current key visible even if it is not an active steel section */}
            {!mixed && currentKey && !steelOptions.some((m) => m.key === currentKey) && (
              <option value={currentKey}>{index[currentKey]?.name ?? currentKey}</option>
            )}
          </select>
        </div>

        <div className="space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Section · thickness · grade
          </span>
          <p className="text-xs text-slate-700">{mixed ? "Mixed sections" : sectionText(material)}</p>
        </div>

        <div className="space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Unit weight · rate
          </span>
          <p className="text-xs text-slate-700">
            {material?.unitWeight != null ? `${num(material.unitWeight, 2)} kg/m` : "—"}
            {" · "}
            {material?.purchaseRate != null ? `₹${num(material.purchaseRate, 2)}/${material.rateUnit.replace("per_", "")}` : "—"}
          </p>
          {material && material.unitWeight == null && (
            <p className="text-[10px] font-semibold text-red-600">No unit weight — set it in the Material Master.</p>
          )}
          {material && material.purchaseRate == null && (
            <p className="text-[10px] font-semibold text-red-600">No rate — set it in the Material Master.</p>
          )}
        </div>

        {group.spacing ? (
          <div className="space-y-1">
            <label className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              {group.spacing.label}
            </label>
            <NumField
              value={norms[group.spacing.field]}
              onCommit={(v) =>
                group.spacing && patchNorms({ [group.spacing.field]: v ?? undefined } as Partial<BoqNorms>)
              }
              step={group.spacing.step}
              min={0.05}
              ariaLabel={group.spacing.label}
            />
            <p className="text-[10px] text-slate-500">Drives the member count, the 2D overlay and the 3D model.</p>
          </div>
        ) : (
          <div className="space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Spacing</span>
            <p className="text-xs text-slate-500">Perimeter members — fixed 2 per side, no spacing.</p>
          </div>
        )}
      </div>

      {/* per-member table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr className="bg-slate-50 text-slate-600">
              <th className={`${TH} text-left`}>Member</th>
              <th className={TH}>No.</th>
              <th className={TH}>Indiv. length (m)</th>
              <th className={TH}>Total length (m)</th>
              <th className={TH}>Unit wt (kg/m)</th>
              <th className={TH}>Total weight (kg)</th>
              <th className={TH}>Rate (₹)</th>
              <th className={TH}>Amount</th>
              <th className={TH}></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => {
              const ov = overrides[l.id];
              const badge = QTY_SOURCE_BADGE[l.qtySource];
              const locked = l.qtySource === "locked";
              return (
                <tr key={l.id} className={l.enabled ? "" : "bg-slate-50 text-slate-400 line-through"}>
                  <td className={`${TD} text-left`}>
                    <div className="flex items-center gap-1.5">
                      <span>{l.description}</span>
                      <span
                        className={`rounded px-1 py-0 text-[8px] font-semibold ${badge.className}`}
                        title={badge.title}
                      >
                        {badge.label}
                      </span>
                    </div>
                  </td>
                  <td className={`${TD_R} w-20`}>
                    <NumField
                      value={l.pieces ?? 0}
                      onCommit={(v) => applyOverride(l.id, { qty: v })}
                      min={0}
                      step={1}
                      ariaLabel={`Number of ${l.description}`}
                    />
                  </td>
                  <td className={TD_R}>{num(l.cutLengthM, 3)}</td>
                  <td className={TD_R}>{num(l.runningLengthM, 2)}</td>
                  <td className={TD_R}>{l.unitWeight != null ? num(l.unitWeight, 2) : "—"}</td>
                  <td className={TD_R}>{num(l.totalWeightKg, 2)}</td>
                  <td className={`${TD_R} w-20`}>
                    <NumField
                      value={l.rate}
                      onCommit={(v) => applyOverride(l.id, { rate: v })}
                      allowEmpty
                      min={0}
                      step={1}
                      ariaLabel={`Rate for ${l.description}`}
                    />
                  </td>
                  <td className={TD_R}>{money(l.amount)}</td>
                  <td className={`${TD} text-center`}>
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => toggleLock(l)}
                        title={locked ? "Unlock — let the spacing recompute this count" : "Lock this count against recalculation"}
                        className={`rounded px-1 py-0.5 text-[9px] font-semibold ${
                          locked ? "bg-amber-200 text-amber-900" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                        }`}
                      >
                        {locked ? "Locked" : "Lock"}
                      </button>
                      {ov && (
                        <button
                          type="button"
                          onClick={() => resetLine(l.id)}
                          title="Reset this member to the auto-calculated values"
                          className="rounded bg-slate-100 px-1 py-0.5 text-[9px] font-semibold text-slate-500 hover:bg-slate-200"
                        >
                          Auto
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-slate-100 font-semibold text-slate-800">
              <td className={`${TD} text-left`}>Total ({group.title.split(" (")[0]})</td>
              <td className={TD_R}>{num(totPieces, 0)}</td>
              <td className={TD_R}></td>
              <td className={TD_R}>{num(totLength, 2)}</td>
              <td className={TD_R}></td>
              <td className={TD_R}>{num(totWeight, 2)}</td>
              <td className={TD_R}></td>
              <td className={TD_R}>{money(totAmount)}</td>
              <td className={TD}></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {disabledCount > 0 && (
        <p className="px-3 py-1.5 text-[10px] text-slate-400">
          {disabledCount} member line{disabledCount === 1 ? " is" : "s are"} disabled (struck through) and excluded from
          the totals — re-enable in the Detailed BOQ tab.
        </p>
      )}
      {mixed && (
        <p className="px-3 py-1.5 text-[10px] text-amber-700">
          This group has mixed sections ({keys.map((k) => index[k]?.name ?? k).join(", ")}). Selecting a section above
          unifies the whole group. Weight and rate are read from each line’s own material until then.
        </p>
      )}
      <p className="px-3 pb-2 text-[10px] text-slate-400">
        Total weight already includes the engine’s cutting-wastage allowance. Wastage %, and the unit weight and
        base rate, are set in the Material Master; a per-line rate override entered above wins for that line only.
      </p>
    </div>
  );
}
