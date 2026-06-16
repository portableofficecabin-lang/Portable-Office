import type jsPDF from "jspdf";

export const LEGAL_FOOTER_TEXT =
  "This document is electronically generated and is valid without a physical signature or company seal as per applicable provisions of the Information Technology Act, 2000.";

/**
 * Adds the IT Act 2000 legal footer (small, italic, centered) to the bottom
 * of every page of a jsPDF document. Call immediately before `doc.save()`.
 */
export function addLegalFooter(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const prevSize = doc.getFontSize();
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(110, 110, 110);
    const lines = doc.splitTextToSize(LEGAL_FOOTER_TEXT, pageWidth - 20) as string[];
    const lineHeight = 3.2;
    const startY = pageHeight - 5 - (lines.length - 1) * lineHeight;
    doc.text(lines, pageWidth / 2, startY, { align: "center" });
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(prevSize);
  }
}
