/**
 * Export an on-page <svg> drawing as a standalone file — vector SVG, PNG or PDF.
 *
 * Why NOT html2canvas here: our drawings are pure SVG whose colours are literal hex values,
 * so serialising the SVG directly is both exact and vector-clean. It also sidesteps the two
 * traps of the DOM-capture path:
 *   • html2canvas chokes on Tailwind's oklch() colour tokens (see lib/pdf/sanitizeColors.ts);
 *   • the drawing lives inside an `overflow-x-auto` box, so a DOM capture would CLIP a wide
 *     drawing to the visible scroll window.
 * Serialising the SVG node avoids both entirely. For rasterising we go SVG → Image → canvas,
 * which needs no third-party library at all.
 */

import jsPDF from "jspdf";
import { addLegalFooter } from "@/lib/pdfFooter";

const SVG_NS = "http://www.w3.org/2000/svg";

/** Clone an on-page <svg> into a self-contained SVG string (own size, fonts and white ground). */
function serializeSvg(svg: SVGSVGElement): { xml: string; w: number; h: number } {
  const vb = svg.viewBox?.baseVal;
  const w = vb && vb.width ? vb.width : svg.clientWidth || 1000;
  const h = vb && vb.height ? vb.height : svg.clientHeight || 700;

  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", SVG_NS);
  clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
  clone.setAttribute("width", String(w));
  clone.setAttribute("height", String(h));
  // Tailwind classes and the min-width style are meaningless (and harmful) standalone.
  clone.removeAttribute("class");
  clone.removeAttribute("style");
  // A standalone SVG inherits no page font — state it explicitly.
  clone.setAttribute("font-family", "Helvetica, Arial, sans-serif");

  // Opaque ground so the drawing isn't transparent in viewers / PDF.
  const bg = document.createElementNS(SVG_NS, "rect");
  bg.setAttribute("x", "0");
  bg.setAttribute("y", "0");
  bg.setAttribute("width", String(w));
  bg.setAttribute("height", String(h));
  bg.setAttribute("fill", "#ffffff");
  clone.insertBefore(bg, clone.firstChild);

  return { xml: new XMLSerializer().serializeToString(clone), w, h };
}

/** Save the drawing as a vector .svg file (opens in CAD / Illustrator / a browser). */
export function downloadSvgFile(svg: SVGSVGElement, filename: string) {
  const { xml } = serializeSvg(svg);
  const blob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".svg") ? filename : `${filename}.svg`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Rasterise the SVG to a PNG data URL at `scale`× (vector source → crisp at any scale). */
export async function svgToPngDataUrl(svg: SVGSVGElement, scale = 3): Promise<{ dataUrl: string; w: number; h: number }> {
  const { xml, w, h } = serializeSvg(svg);
  const url = URL.createObjectURL(new Blob([xml], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("Could not rasterise the drawing"));
      i.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(w * scale));
    canvas.height = Math.max(1, Math.round(h * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return { dataUrl: canvas.toDataURL("image/png"), w, h };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Save the drawing as a PNG image. */
export async function downloadSvgAsPng(svg: SVGSVGElement, filename: string, scale = 3) {
  const { dataUrl } = await svgToPngDataUrl(svg, scale);
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename.endsWith(".png") ? filename : `${filename}.png`;
  a.click();
}

/**
 * Save the drawing as a single-page A4 landscape PDF, scaled to fit, with the house legal footer.
 * A single elevation always fits one sheet, so no pagination is needed.
 */
export async function downloadSvgAsPdf(svg: SVGSVGElement, filename: string, title?: string, subtitle?: string) {
  const { dataUrl, w, h } = await svgToPngDataUrl(svg, 3);
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = 297, pageH = 210, m = 12;

  let top = m;
  if (title) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.setTextColor(15, 23, 42);
    pdf.text(title, m, top + 4);
    top += 7;
  }
  if (subtitle) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(100, 116, 139);
    pdf.text(subtitle, m, top + 3);
    top += 6;
  }

  const availW = pageW - m * 2;
  const availH = pageH - top - m - 10;              // leave room for the legal footer
  const k = Math.min(availW / w, availH / h);       // fit, preserving aspect ratio
  const imgW = w * k, imgH = h * k;
  pdf.addImage(dataUrl, "PNG", (pageW - imgW) / 2, top, imgW, imgH);

  addLegalFooter(pdf);
  pdf.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}
