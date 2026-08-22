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

/**
 * jsPDF solo dibuja data URLs, no URLs remotas. El logo vive en Cloudinary,
 * asi que lo descargamos y convertimos antes de insertarlo. Si falla (red, CORS),
 * devolvemos null y el PDF se genera sin logo en vez de romperse.
 */
async function resolveLogoDataUrl(src: string): Promise<string | null> {
  if (src.startsWith("data:")) return src;
  try {
    const res = await fetch(src, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function exportRecordPdf(data: ExportData) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginLeft = 20;
  const marginRight = 20;
  const contentWidth = pageWidth - marginLeft - marginRight;
  let y = 20;

  // Logo
  if (data.clinicLogo) {
    const logoDataUrl = await resolveLogoDataUrl(data.clinicLogo);
    if (logoDataUrl) {
      try {
        // Respetamos la proporcion original en vez de deformar a una caja fija.
        const props = doc.getImageProperties(logoDataUrl);
        const maxW = 40;
        const maxH = 16;
        const scale = Math.min(maxW / props.width, maxH / props.height);
        const logoW = props.width * scale;
        const logoH = props.height * scale;
        doc.addImage(logoDataUrl, "PNG", pageWidth / 2 - logoW / 2, y, logoW, logoH);
        y += logoH + 6;
      } catch {
        // Imagen ilegible: seguimos sin logo.
      }
    }
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
