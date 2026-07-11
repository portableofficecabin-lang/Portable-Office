"use client";

import type { FoundationResult } from "@/lib/quotation/labourColonyCivil";
import { toMM } from "@/lib/quotation/labourColonyPlan";

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
}: {
  notes: string[];
  section: Section;
  floors: number;
}) {
  const specRows: { item: string; spec: string }[] = [
    { item: "Concrete grade (footing/beam)", spec: section.grade },
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
