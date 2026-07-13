"use client";

import type { FoundationResult } from "@/lib/quotation/labourColonyCivil";
import { toMM } from "@/lib/quotation/labourColonyPlan";
import type { RebarDesign } from "@/lib/quotation/labourColonyRebar";

/**
 * CONSTRUCTION NOTES & SPECIFICATIONS sheet (spec §6/§7 companion to the plan +
 * foundation drawings). Unlike the other drawing cards this is a plain styled
 * HTML "notes sheet" — a numbered specification list, a material-specification
 * mini-table derived straight from the foundation section detail, and a small
 * CAD-style title block. Print-friendly: dark text on white.
 */

type Section = FoundationResult["section"];

export function ConstructionNotes({
  notes,
  section,
  floors,
  rebar,
  columnCount,
}: {
  notes: string[];
  section: Section;
  floors: number;
  rebar: RebarDesign;
  columnCount: number;
}) {
  const a = rebar.beam.anchorage;
  const specRows: { item: string; spec: string }[] = [
    { item: "Concrete grade (footing/beam)", spec: section.grade },
    { item: "Steel grade", spec: rebar.steelGrade + " TMT (deformed)" },
    { item: "Soil bearing capacity (SBC)", spec: rebar.bearing.sbcKnm2 + " kN/m² (from soil report — input)" },
    { item: "Design load intensity", spec: rebar.bearing.loadPerSqmKn + " kN/m² of built-up area" },
    { item: "Load per column", spec: rebar.bearing.perColumnKn + " kN (" + columnCount + " columns)" },
    { item: "Bearing pressure delivered", spec: rebar.bearing.bearingPressureKnm2 + " kN/m² (" + Math.round(rebar.bearing.utilisation * 100) + "% of SBC)" },
    { item: "Clear cover", spec: "footing " + rebar.footing.coverMm + " / column " + rebar.column.coverMm + " / beam " + rebar.beam.coverMm + " mm" },
    { item: "Footing reinforcement", spec: rebar.footing.bottomText + (rebar.footing.topMesh ? " + " + rebar.footing.topText : "") },
    { item: "Column reinforcement", spec: rebar.column.barsText + " · ties " + rebar.column.tiesText },
    { item: "Development length Ld", spec: a.ldMm + " mm (" + a.ldMultiple + "φ) for T" + a.diaMm + " in " + section.grade },
    { item: "Lap length", spec: "tension " + a.lapTensionMm + " mm · compression " + a.lapCompressionMm + " mm" },
    { item: "Anchorage into support", spec: rebar.beam.anchorageIntoSupportMm + " mm (incl. " + a.bend90Mm + " mm 90° bend)" },
    { item: "PCC bed", spec: section.pccThicknessMm + " mm (1:4:8)" },
    {
      item: "Footing size",
      spec:
        toMM(section.footingLengthM) +
        " x " +
        toMM(section.footingLengthM) +
        " mm, depth " +
        toMM(section.footingDepthM) +
        " mm",
    },
    {
      item: "Pedestal",
      spec: toMM(section.pedestalSizeM) + " mm sq x " + toMM(section.pedestalHeightM) + " mm",
    },
    {
      item: "Plinth beam",
      spec: toMM(section.plinthBeamWidthM) + " x " + toMM(section.plinthBeamDepthM) + " mm",
    },
    {
      item: "Main reinforcement",
      spec:
        section.topBars +
        " top / " +
        section.bottomBars +
        " bottom, T" +
        section.mainBarDiaMm,
    },
    {
      item: "Stirrups",
      spec: "T" + section.stirrupDiaMm + " @ " + section.stirrupSpacingMm + " mm c/c",
    },
    { item: "Raised plinth", spec: toMM(section.raisedPlinthHeightM) + " mm" },
  ];

  const projectLabel = "Labour Colony — " + (floors <= 1 ? "G" : "G+" + (floors - 1));

  const titleRows: { label: string; value: string }[] = [
    { label: "Project", value: projectLabel },
    { label: "Drawing", value: "LABOUR COLONY — CIVIL WORK" },
    { label: "Scale", value: "NTS" },
    { label: "Sheet", value: "C-01" },
    { label: "Rev", value: "R0" },
    { label: "Status", value: "FOR APPROVAL — NOT FOR CONSTRUCTION" },
  ];

  return (
    <div className="rounded-2xl border bg-white p-4 text-slate-800">
      {/* Heading */}
      <div className="mb-3 border-b border-slate-300 pb-2">
        <h3 className="text-sm font-bold tracking-wide text-slate-900">
          CONSTRUCTION NOTES &amp; SPECIFICATIONS
        </h3>
      </div>

      {/* Numbered notes list */}
      <ol
        className="list-decimal space-y-1 pl-5 text-[11px] leading-tight"
        style={{ color: "#374151" }}
      >
        {notes.map((note, i) => (
          <li key={i}>{note}</li>
        ))}
      </ol>

      {/* Material specification mini-table */}
      <div className="mt-4">
        <div className="mb-1 text-[11px] font-bold tracking-wide text-slate-900">
          MATERIAL SPECIFICATION
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[320px] border-collapse text-[11px]">
            <thead>
              <tr className="bg-slate-100 text-left text-slate-700">
                <th className="border border-slate-300 px-2 py-1 font-semibold">Item</th>
                <th className="border border-slate-300 px-2 py-1 font-semibold">
                  Specification
                </th>
              </tr>
            </thead>
            <tbody>
              {specRows.map((r) => (
                <tr key={r.item}>
                  <td className="border border-slate-300 px-2 py-1 text-slate-600">{r.item}</td>
                  <td className="border border-slate-300 px-2 py-1 font-medium text-slate-900">
                    {r.spec}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---- STRUCTURAL ENGINEER APPROVAL — must be signed before any work starts ---- */}
      <div className="mt-5 rounded border-2 border-red-500 bg-red-50 p-3">
        <div className="mb-1 text-[12px] font-extrabold uppercase tracking-wider text-red-700">
          Not for construction — approval required
        </div>
        <p className="text-[11px] leading-snug text-slate-800">
          This is a <b>quotation / approval reference drawing</b>, not a stamped structural design. Foundation
          sizes, reinforcement, footing depth, beam and column sections shown here are derived from the entered
          dimensions and an <b>assumed</b> safe bearing capacity of <b>{rebar.bearing.sbcKnm2} kN/m²</b> and design
          load of <b>{rebar.bearing.loadPerSqmKn} kN/m²</b>. Before any excavation or concreting:
        </p>
        <ol className="mt-1.5 list-decimal space-y-0.5 pl-5 text-[11px] leading-snug text-slate-800">
          <li>Obtain a site <b>soil-investigation report</b> and confirm the actual SBC at founding level.</li>
          <li>Have a <b>qualified structural engineer</b> verify loads, footing sizes, reinforcement and all junction details.</li>
          <li>Obtain the engineer&apos;s <b>signature, stamp and registration number</b> in the block below.</li>
          <li>Build only from the <b>stamped</b> issue of this drawing. Do not scale — build to written dimensions.</li>
        </ol>

        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {[
            { role: "Drawn by", sub: "Portable Office Cabin" },
            { role: "Checked by", sub: "Structural Engineer" },
            { role: "Approved by", sub: "Client / PMC" },
          ].map((b) => (
            <div key={b.role} className="rounded border border-slate-400 bg-white">
              <div className="border-b border-slate-300 bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-600">
                {b.role}
              </div>
              <div className="h-14 px-2 py-1 text-[9px] text-slate-400">Signature / stamp / date</div>
              <div className="border-t border-slate-300 px-2 py-0.5 text-[9px] text-slate-500">{b.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Title block (bottom-right) */}
      <div className="mt-4 flex justify-end">
        <div className="w-full max-w-xs overflow-hidden rounded border border-slate-400">
          {titleRows.map((r, i) => (
            <div
              key={r.label}
              className={
                "grid grid-cols-[84px_1fr] text-[11px]" +
                (i < titleRows.length - 1 ? " border-b border-slate-300" : "")
              }
            >
              <div className="border-r border-slate-300 bg-slate-50 px-2 py-1 font-semibold text-slate-600">
                {r.label}
              </div>
              <div className="px-2 py-1 font-medium text-slate-900">{r.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
