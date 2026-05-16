import jsPDF from "jspdf";

type FieldValue = {
  label: string;
  value: string;
  fieldType: string;
};

type ExportData = {
  templateName: string;
  patientName: string;
  doctorName: string;
  date: string;
  clinicLogo?: string | null;
  fields: FieldValue[];
};

function formatValue(value: string, fieldType: string): string {
  if (fieldType === "BOOLEAN") return value === "true" ? "Sí" : "No";
  return value;
}

export function exportRecordPdf(data: ExportData) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginLeft = 20;
  const marginRight = 20;
  const contentWidth = pageWidth - marginLeft - marginRight;
  let y = 20;

  // Logo
  if (data.clinicLogo) {
    const format = data.clinicLogo.includes("image/png") ? "PNG" : "JPEG";
    const logoW = 36;
    const logoH = 14;
    doc.addImage(data.clinicLogo, format, pageWidth / 2 - logoW / 2, y, logoW, logoH);
    y += logoH + 6;
  }

  // Header
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(data.templateName, marginLeft, y);
  y += 10;

  // Separator line
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(marginLeft, y, pageWidth - marginRight, y);
  y += 8;

  // Patient & Doctor info
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(`Paciente: ${data.patientName}`, marginLeft, y);
  y += 6;
  doc.text(`Doctor: ${data.doctorName}`, marginLeft, y);
  y += 6;
  doc.text(`Fecha: ${data.date}`, marginLeft, y);
  y += 10;

  // Second separator
  doc.line(marginLeft, y, pageWidth - marginRight, y);
  y += 10;

  // Fields
  for (const field of data.fields) {
    // Check page overflow
    if (y > 270) {
      doc.addPage();
      y = 20;
    }

    // Label
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(120, 120, 120);
    doc.text(field.label.toUpperCase(), marginLeft, y);
    y += 5;

    // Value
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 30, 30);
    const displayValue = formatValue(field.value, field.fieldType) || "—";
    const lines = doc.splitTextToSize(displayValue, contentWidth);
    doc.text(lines, marginLeft, y);
    y += lines.length * 5 + 6;
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(180, 180, 180);
    doc.text(
      `Generado el ${new Date().toLocaleString("es-CL")} — Página ${i} de ${pageCount}`,
      marginLeft,
      doc.internal.pageSize.getHeight() - 10
    );
  }

  const fileName = `${data.templateName} - ${data.patientName}.pdf`.replace(/[/\\:*?"<>|]/g, "_");
  doc.save(fileName);
}
