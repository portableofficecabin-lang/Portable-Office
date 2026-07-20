/**
 * LABOUR COLONY STUDIO — fabrication drawing-set export.
 *
 * Rasterises the composed EngineeringSheets container (a DOM element) into a size-budgeted,
 * content-paginated multi-page PDF through the ONE proven pipeline — `exportSheetToPdf`, which itself
 * runs the sheet through `captureElementToCanvas` (the oklch-safe capture path) and paginates on the
 * drawing-block boundaries so no plate, plan or schedule is sliced across a page.
 *
 * PNG at a high DPI is used because engineering sheets are dense line-art + small dimension text,
 * exactly the content JPEG's DCT compression rings around; the size-budget loop still applies and
 * flexes DPI only. Nothing here re-implements capture, colour-sanitisation or pagination — it reuses
 * the shared exporter, the same rule the cabin drawing-set export follows.
 */

import { exportSheetToPdf } from "@/lib/pdf/sheetPdf";
import type { ColonyDrawingMeta } from "../model/types";

/** A safe, descriptive file stem from the drawing register (drawing no + project). */
function toFilename(meta: ColonyDrawingMeta): string {
  const slug = `${meta.drawingNumber ?? "colony"}-${meta.projectName ?? ""}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return slug ? `colony-drawing-set-${slug}` : "colony-drawing-set";
}

/**
 * Export the EngineeringSheets container `el` to a multi-page fabrication drawing-set PDF.
 * Breaks between whole drawing blocks (colony sheets, falling back to the cabin/generic block class),
 * so a drawing is never severed across a page.
 */
export async function exportColonyDrawingSet(el: HTMLElement, meta: ColonyDrawingMeta): Promise<void> {
  await exportSheetToPdf(el, {
    filename: toFilename(meta),
    format: "png",
    dpi: 300,
    minDpi: 220,
    targetBytes: 12_000_000,
    breakSelector: ".colony-drawing-block, .cabin-drawing-block, .drawing-block",
  });
}
