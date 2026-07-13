"use client";

import { COMPANY } from "@/lib/company";

/**
 * Tiled diagonal WATERMARK for a drawing sheet — the company name only.
 *
 * It sits inside the sheet element itself (not around it), so it is captured by all three of the
 * ways a drawing leaves the app:
 *   • an on-screen screenshot
 *   • window.print()
 *   • the PDF export, which rasterises the sheet via captureElementToCanvas()
 *
 * IMPORTANT — colours are LITERAL HEX inline styles, never Tailwind colour classes. The PDF export
 * runs the sheet through html2canvas-pro, which cannot parse Tailwind's oklch() colour tokens; the
 * rest of the drawing set follows the same rule. Layout-only utility classes are fine.
 *
 * The tile is a fixed-size CSS grid rather than a repeating background image, because html2canvas
 * rasterises real DOM text reliably but is unpredictable with background-image data URIs.
 */

const TILE_W = 300;   // px — horizontal pitch of the tile
const TILE_H = 190;   // px — vertical pitch
/** Enough cells to cover a very tall sheet; the container clips the overflow. */
const CELLS = 700;

export function DrawingWatermark({
  text = COMPANY.legalName,
  opacity = 0.07,
}: {
  /** Defaults to the company name. Nothing else belongs in a watermark. */
  text?: string;
  opacity?: number;
}) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-10 overflow-hidden select-none"
      data-watermark="true"
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(auto-fill, ${TILE_W}px)`,
          gridAutoRows: `${TILE_H}px`,
          width: "100%",
          height: "100%",
        }}
      >
        {Array.from({ length: CELLS }, (_, i) => (
          <span
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transform: "rotate(-30deg)",
              color: "#0f172a",
              opacity,
              fontSize: 17,
              fontWeight: 800,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
              userSelect: "none",
            }}
          >
            {text}
          </span>
        ))}
      </div>
    </div>
  );
}
