import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { addLegalFooter } from "@/lib/pdfFooter";

export function exportToExcel(rows: Record<string, any>[], filename: string, sheetName = "Sheet1") {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function exportToPDF(
  title: string,
  columns: string[],
  rows: (string | number)[][],
  filename: string
) {
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(title, 14, 14);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 20);
  autoTable(doc, {
    head: [columns],
    body: rows,
    startY: 26,
    headStyles: { fillColor: [30, 58, 95] },
    styles: { fontSize: 8 },
  });
  addLegalFooter(doc);
  doc.save(`${filename}.pdf`);
}

export const formatINR = (n: number | null | undefined) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
