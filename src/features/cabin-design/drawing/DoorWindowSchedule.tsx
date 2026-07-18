"use client";

/**
 * 2D ENGINEERING SHEETS — door & window schedule (spec §1).
 *
 * Reads each opening from the SAME placements + size helpers the plan/elevations render from
 * (doorSizeOf / windowSizeOf), so the schedule can never quote a size the drawing does not show.
 * Literal-hex inline styles (this table is rasterised into the export sheet).
 */

import {
  DOOR_SIZE, doorSizeOf, windowSizeOf, isToiletCabin, isStorageProduct, type CabinConfig,
} from "@/components/home/cabin-calculator/pricing";

const SIDE_LABEL: Record<string, string> = { top: "Rear", bottom: "Front", left: "Left", right: "Right" };
const feet = (v: number) => (Number.isInteger(v) ? `${v}′` : `${Math.floor(v)}′-${Math.round((v % 1) * 12)}″`);

interface Row { mark: string; type: string; wall: string; size: string; swing: string; id?: string }

export function DoorWindowSchedule({
  config, selectedId, onSelect,
}: {
  config: CabinConfig;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
}) {
  const doors: Row[] = [];
  const windows: Row[] = [];
  const container = isStorageProduct(config.productId);
  const toilet = isToiletCabin(config.productId);

  if (container) {
    doors.push({ mark: "D1", type: "ISO double door", wall: "Right", size: "8′×7′", swing: "Outward" });
  } else {
    const dq = Math.max(0, Math.round(config.doorQty || 0));
    (config.doorPlacements ?? []).slice(0, dq).forEach((d, i) => {
      const sz = doorSizeOf(d);
      doors.push({
        mark: `D${i + 1}`,
        type: (config.doorTypeId || "door").replace(/-/g, " "),
        wall: SIDE_LABEL[d.side || "bottom"] ?? "Front",
        size: `${feet(sz.widthFt)}×${feet(sz.heightFt)}`,
        swing: `${d.swing === "in" ? "Inward" : "Outward"}, ${d.hand ?? "left"} hand`,
        id: `door:${i}`,
      });
    });
  }
  const partDoors = config.partitionDoor ? Math.max(0, (config.roomLengths?.length ?? 1) - 1) : 0;
  for (let i = 0; i < partDoors; i++) {
    doors.push({ mark: `PD${i + 1}`, type: (config.partitionDoorType || "door").replace(/-/g, " "), wall: "Partition", size: `${feet(DOOR_SIZE.widthFt)}×${feet(DOOR_SIZE.heightFt)}`, swing: config.partitionDoorType === "sliding" ? "Sliding" : "Hinged" });
  }

  if (!toilet && !container) {
    const wq = Math.max(0, Math.round(config.windowQty || 0));
    (config.windowPlacements ?? []).slice(0, wq).forEach((wp, i) => {
      const sz = windowSizeOf(wp, config);
      windows.push({
        mark: `W${i + 1}`,
        type: (config.windowTypeId || "window").replace(/-/g, " "),
        wall: SIDE_LABEL[wp.side || "top"] ?? "Rear",
        size: `${feet(sz.widthFt)}×${feet(sz.heightFt)}`,
        swing: config.windowOpening === "inside" ? "Opens in" : "Opens out",
        id: `window:${i}`,
      });
    });
  }

  const th: React.CSSProperties = { textAlign: "left", padding: "4px 8px", fontSize: 10, color: "#0f172a", borderBottom: "1.5px solid #0f172a", textTransform: "uppercase", letterSpacing: "0.04em" };
  const td: React.CSSProperties = { padding: "4px 8px", fontSize: 11, color: "#334155", borderBottom: "1px solid #e2e8f0" };

  const Table = ({ title, rows }: { title: string; rows: Row[] }) => (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>{title}</div>
      {rows.length === 0 ? (
        <div style={{ fontSize: 11, color: "#94a3b8" }}>None</div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", background: "#ffffff" }}>
          <thead><tr><th style={th}>Mark</th><th style={th}>Type</th><th style={th}>Location</th><th style={th}>Size (W×H)</th><th style={th}>Operation</th></tr></thead>
          <tbody>
            {rows.map((r) => {
              const sel = r.id && r.id === selectedId;
              return (
                <tr key={r.mark} onClick={() => r.id && onSelect?.(r.id)} style={{ cursor: r.id && onSelect ? "pointer" : undefined, background: sel ? "#fde68a" : undefined }}>
                  <td style={{ ...td, fontWeight: 700 }}>{r.mark}</td>
                  <td style={{ ...td, textTransform: "capitalize" }}>{r.type}</td>
                  <td style={td}>{r.wall}</td>
                  <td style={td}>{r.size}</td>
                  <td style={td}>{r.swing}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );

  return (
    <div>
      <Table title="Door Schedule" rows={doors} />
      <Table title="Window Schedule" rows={windows} />
    </div>
  );
}
