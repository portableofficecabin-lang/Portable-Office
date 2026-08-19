"use client";

/**
 * LABOUR COLONY — REFERENCE GA DRAWING: the BILL OF MATERIALS sheet.
 *
 * The half of the reference issue that answers "how much of everything, and exactly which model":
 * the priced purchase register, the member cutting list, the rafter support system (cleat, C purlin,
 * MS pipe, bolts, nuts, washers), the PUF panel bottom locking system, the frame connection hardware,
 * the opening schedule and the civil substructure — each row naming the exact section, thickness and
 * grade, and each row carrying the source that owns the number.
 *
 * Every group is a `reference-drawing-block`, so the PDF export paginates between whole tables.
 * Literal-hex inline colours only — this sheet goes through the html2canvas capture path.
 */

import { REF } from "./referenceScale";
import type { MaterialRegister, RegisterGroup, RegisterRow } from "./referenceRegister";

const HEAD = ["S.No", "Item / component", "Exact model — section, thickness, grade", "Unit", "Qty", "Unit wt (kg)", "Total wt (kg)", "Order note"];
const RIGHT = new Set([4, 5, 6]);

const fmtQty = (r: RegisterRow): string =>
  r.qtyDp === 0 ? Math.round(r.qty).toLocaleString("en-IN") : r.qty.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtKg = (v: number | null): string =>
  v == null ? "—" : v.toLocaleString("en-IN", { minimumFractionDigits: v < 1 ? 3 : 2, maximumFractionDigits: v < 1 ? 4 : 2 });

function GroupTable({ group, index }: { group: RegisterGroup; index: number }) {
  return (
    <section
      className="reference-drawing-block light"
      style={{ background: REF.paper, border: `1px solid ${REF.ink}`, color: REF.ink, padding: 10 }}
    >
      <header style={{ borderBottom: `1px solid ${REF.hair}`, paddingBottom: 5, marginBottom: 6 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.02em" }}>
          {String.fromCharCode(64 + index)}. {group.title}
        </div>
        <div style={{ fontSize: 9, color: REF.note, marginTop: 2 }}>{group.note}</div>
      </header>

      {group.rows.length === 0 ? (
        <div style={{ fontSize: 10, color: REF.note, padding: "6px 2px" }}>{group.emptyReason}</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
            <thead>
              <tr>
                {HEAD.map((h, i) => (
                  <th
                    key={h}
                    style={{
                      fontSize: 8, textTransform: "uppercase", letterSpacing: "0.05em", color: REF.note,
                      textAlign: RIGHT.has(i) ? "right" : "left", padding: "3px 6px",
                      borderBottom: `1.4px solid ${REF.ink}`, whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {group.rows.map((r, i) => (
                <tr key={`${group.id}-${i}`}>
                  <td style={{ fontSize: 9, padding: "3px 6px", borderBottom: `1px solid ${REF.hair}`, color: REF.note }}>{i + 1}</td>
                  <td style={{ fontSize: 10, padding: "3px 6px", borderBottom: `1px solid ${REF.hair}` }}>
                    <div style={{ fontWeight: 600 }}>{r.item}</div>
                    <div style={{ fontSize: 7.5, color: REF.note }}>{r.source}</div>
                  </td>
                  <td style={{ fontSize: 10, padding: "3px 6px", borderBottom: `1px solid ${REF.hair}`, fontWeight: 600 }}>{r.model}</td>
                  <td style={{ fontSize: 9.5, padding: "3px 6px", borderBottom: `1px solid ${REF.hair}` }}>{r.uom}</td>
                  <td style={{ fontSize: 10, padding: "3px 6px", borderBottom: `1px solid ${REF.hair}`, textAlign: "right", fontWeight: 700 }}>{fmtQty(r)}</td>
                  <td style={{ fontSize: 9.5, padding: "3px 6px", borderBottom: `1px solid ${REF.hair}`, textAlign: "right" }}>{fmtKg(r.unitWeightKg)}</td>
                  <td style={{ fontSize: 9.5, padding: "3px 6px", borderBottom: `1px solid ${REF.hair}`, textAlign: "right" }}>{fmtKg(r.totalWeightKg)}</td>
                  <td style={{ fontSize: 9, padding: "3px 6px", borderBottom: `1px solid ${REF.hair}`, color: REF.thin }}>{r.purchase || "—"}</td>
                </tr>
              ))}
            </tbody>
            {group.totalWeightKg > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={6} style={{ fontSize: 9.5, padding: "4px 6px", textAlign: "right", fontWeight: 700, borderTop: `1.4px solid ${REF.ink}` }}>
                    Group weight
                  </td>
                  <td style={{ fontSize: 10, padding: "4px 6px", textAlign: "right", fontWeight: 700, borderTop: `1.4px solid ${REF.ink}` }}>
                    {fmtKg(group.totalWeightKg)}
                  </td>
                  <td style={{ borderTop: `1.4px solid ${REF.ink}` }} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </section>
  );
}

export function ReferenceBomSheet({ register }: { register: MaterialRegister }) {
  return (
    <div className="space-y-3" style={{ background: REF.paper, padding: 8 }}>
      <section
        className="reference-drawing-block light"
        style={{ background: REF.paper, border: `1.6px solid ${REF.ink}`, color: REF.ink, padding: 10 }}
      >
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>
          Bill of materials — every component, with its exact model
        </div>
        <p style={{ fontSize: 9.5, color: REF.thin, marginTop: 4, lineHeight: 1.5 }}>
          Read from the priced Material BOQ (purchase register + cutting list), the engineering model&rsquo;s
          rafter-support and PUF-lock take-offs, and the priced civil result. Each row names the source that owns
          the number, so any quantity on this sheet can be traced back to the tab that produced it — nothing here
          is a second calculation.
          {register.boqTotalWeightKg != null && (
            <>
              {" "}Priced Material BOQ total weight:{" "}
              <strong>{register.boqTotalWeightKg.toLocaleString("en-IN", { maximumFractionDigits: 2 })} kg</strong>.
            </>
          )}
        </p>
      </section>

      {register.groups.map((g, i) => (
        <GroupTable key={g.id} group={g} index={i + 1} />
      ))}
    </div>
  );
}
