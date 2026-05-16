import jsPDF from "jspdf";
import type { PatientDetail, PatientAppointment } from "@/domain/patients/entities/Patient";
import type { PatientTreatmentItem } from "./PatientDetailViewModel";

type ImagingStudy = {
  id: string;
  studyName: string;
  studiedAt: string;
  doctorName: string;
  status: string;
  observation: string | null;
};

// ─── Color palette ────────────────────────────────────────────────────────────

const C = {
  indigo:   [79,  70,  229] as [number, number, number],
  violet:   [109, 40,  217] as [number, number, number],
  white:    [255, 255, 255] as [number, number, number],
  slate900: [15,  23,  42 ] as [number, number, number],
  slate500: [100, 116, 139] as [number, number, number],
  slate300: [203, 213, 225] as [number, number, number],
  slate100: [241, 245, 249] as [number, number, number],
  slate50:  [248, 250, 252] as [number, number, number],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeAge(birthDate: string | null | undefined): number | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function computeFileNumber(patient: PatientDetail): string {
  const d = new Date(patient.createdAt);
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}${mo}${da}-${patient.id.slice(-4).toUpperCase()}`;
}

// ─── PDF generator ────────────────────────────────────────────────────────────

export function generatePatientPDF({
  patient,
  appointments,
  treatments,
  studies,
}: {
  patient: PatientDetail;
  appointments: PatientAppointment[];
  treatments: PatientTreatmentItem[];
  studies: ImagingStudy[];
}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const PW = doc.internal.pageSize.getWidth();
  const PH = doc.internal.pageSize.getHeight();
  const ML = 14;
  const MR = 14;
  const CW = PW - ML - MR;

  let y = 0;

  // ── Page break guard ──────────────────────────────────────────────────────

  function ensureSpace(needed: number) {
    if (y + needed > PH - 16) {
      doc.addPage();
      y = 24;
    }
  }

  // ── Horizontal rule ───────────────────────────────────────────────────────

  function hRule(color = C.slate100) {
    doc.setDrawColor(...color);
    doc.setLineWidth(0.25);
    doc.line(ML, y, PW - MR, y);
    y += 4;
  }

  // ── Section header ────────────────────────────────────────────────────────

  function sectionHeader(title: string) {
    ensureSpace(16);
    doc.setFillColor(...C.slate50);
    doc.rect(ML, y - 2, CW, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...C.slate500);
    doc.text(title.toUpperCase(), ML + 3, y + 3.5);
    y += 8;
    hRule();
  }

  // ── Two-column label + value pair ─────────────────────────────────────────

  function labelValue(label: string, value: string, x: number, colY: number) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...C.slate500);
    doc.text(label, x, colY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...C.slate900);
    const clamped = doc.splitTextToSize(value || "-", CW / 2 - 4);
    doc.text(clamped[0] as string, x, colY + 4.5);
  }

  // ── Table header row ──────────────────────────────────────────────────────

  function tableHeader(headers: string[], widths: number[]) {
    doc.setFillColor(...C.slate100);
    doc.rect(ML, y - 3, CW, 7, "F");
    let x = ML + 3;
    headers.forEach((h, i) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(...C.slate500);
      doc.text(h, x, y + 1);
      x += widths[i];
    });
    y += 5;
    hRule(C.slate100);
  }

  // ── Table data row ────────────────────────────────────────────────────────

  function tableRow(cells: string[], widths: number[], rowIdx: number) {
    ensureSpace(8);
    if (rowIdx % 2 === 1) {
      doc.setFillColor(...C.slate50);
      doc.rect(ML, y - 3, CW, 7, "F");
    }
    let x = ML + 3;
    cells.forEach((cell, i) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...C.slate900);
      const maxW = widths[i] - 3;
      const lines = doc.splitTextToSize(cell, maxW);
      doc.text(lines[0] as string, x, y + 1);
      x += widths[i];
    });
    y += 6;
  }

  // ── Empty state ───────────────────────────────────────────────────────────

  function emptyState(text: string) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(...C.slate300);
    doc.text(text, ML + 3, y);
    y += 8;
  }

  // ── Page footer writer (call once at the very end) ────────────────────────

  function writeFooters() {
    const total = doc.getNumberOfPages();
    for (let p = 1; p <= total; p++) {
      doc.setPage(p);
      doc.setFillColor(...C.slate50);
      doc.rect(0, PH - 10, PW, 10, "F");
      doc.setDrawColor(...C.slate100);
      doc.setLineWidth(0.25);
      doc.line(0, PH - 10, PW, PH - 10);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...C.slate500);
      doc.text("Documento generado automaticamente por MediGest · Confidencial", ML, PH - 4);
      doc.text(`Pagina ${p} de ${total}`, PW - MR, PH - 4, { align: "right" });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 1 — Resumen clinico
  // ═══════════════════════════════════════════════════════════════════════════

  // Header bar
  doc.setFillColor(...C.indigo);
  doc.rect(0, 0, PW, 18, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...C.white);
  doc.text("Resumen Clinico del Paciente", ML, 12);

  const dateStr = new Date().toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(`Generado el ${dateStr}`, PW - MR, 12, { align: "right" });

  y = 28;

  // ── Datos del paciente ─────────────────────────────────────────────────────

  sectionHeader("Datos del paciente");

  const col1 = ML;
  const col2 = ML + CW / 2;
  const fullName = [patient.firstName, patient.lastName, patient.secondLastName]
    .filter(Boolean)
    .join(" ");
  const age = computeAge(patient.birthDate);
  const fileNumber = computeFileNumber(patient);

  labelValue("Nombre completo", fullName, col1, y);
  labelValue("N° Ficha", fileNumber, col2, y);
  y += 12;

  labelValue("RUN", patient.run, col1, y);
  labelValue("Edad", age !== null ? `${age} anos` : "-", col2, y);
  y += 12;

  labelValue("Telefono", patient.phone ?? "-", col1, y);
  labelValue("Email", patient.email ?? "-", col2, y);
  y += 12;

  const address = [patient.address, patient.city].filter(Boolean).join(", ");
  labelValue("Direccion", address || "-", col1, y);

  const gender = patient.gender ? patient.gender : "-";
  labelValue("Sexo", gender, col2, y);
  y += 14;

  // ── Historial de consultas ─────────────────────────────────────────────────

  sectionHeader("Historial de consultas");

  if (appointments.length === 0) {
    emptyState("Sin consultas registradas.");
  } else {
    const aWidths = [40, 30, 35, 75];
    tableHeader(["N° Cita", "Estado", "Fecha", "Medico a cargo"], aWidths);

    const statusMap: Record<string, string> = {
      COMPLETED: "Completada",
      CANCELLED: "Cancelada",
      NO_SHOW: "No asistio",
      CONFIRMED: "Confirmada",
      PENDING: "Agendada",
    };

    appointments.forEach((appt, idx) => {
      const doctor = appt.doctor?.profile
        ? `${appt.doctor.profile.firstName} ${appt.doctor.profile.lastName}`
        : "-";
      tableRow(
        [
          appt.id.slice(-9).toUpperCase(),
          statusMap[appt.status] ?? appt.status,
          new Date(appt.startAt).toLocaleDateString("es-CL"),
          doctor,
        ],
        aWidths,
        idx
      );
    });
    y += 4;
  }

  // ── Imagenologia ──────────────────────────────────────────────────────────

  ensureSpace(20);
  sectionHeader("Estudios de imagenologia");

  if (studies.length === 0) {
    emptyState("Sin estudios de imagenologia registrados.");
  } else {
    const iWidths = [65, 32, 55, 28];
    tableHeader(["Estudio", "Fecha", "Profesional", "Estado"], iWidths);

    studies.forEach((s, idx) => {
      tableRow(
        [
          s.studyName,
          new Date(s.studiedAt).toLocaleDateString("es-CL"),
          s.doctorName,
          s.status === "completado" ? "Completado" : "Pendiente",
        ],
        iWidths,
        idx
      );
    });
    y += 4;
  }

  // ── Tratamientos ──────────────────────────────────────────────────────────

  ensureSpace(20);
  sectionHeader("Tratamientos");

  if (treatments.length === 0) {
    emptyState("Sin tratamientos registrados.");
  } else {
    const tWidths = [70, 30, 45, 35];
    tableHeader(["Tratamiento", "Estado", "Avance", "Inicio"], tWidths);

    treatments.forEach((t, idx) => {
      const pct =
        t.totalPayments > 0
          ? Math.round((t.paidPayments / t.totalPayments) * 100)
          : 0;
      tableRow(
        [
          t.treatmentName,
          t.status === "in_progress" ? "En progreso" : "Completado",
          `${t.paidPayments}/${t.totalPayments} pagos (${pct}%)`,
          new Date(t.performedAt).toLocaleDateString("es-CL"),
        ],
        tWidths,
        idx
      );
    });
    y += 4;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE 2 — Vitacora del profesional
  // ═══════════════════════════════════════════════════════════════════════════

  doc.addPage();

  // Header bar
  doc.setFillColor(...C.violet);
  doc.rect(0, 0, PW, 18, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...C.white);
  doc.text("Vitacora del Profesional", ML, 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(
    `${patient.firstName} ${patient.lastName} · ${patient.run}`,
    PW - MR,
    12,
    { align: "right" }
  );

  y = 28;

  const completedAppts = appointments.filter((a) => a.status === "COMPLETED");

  if (completedAppts.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(...C.slate500);
    doc.text(
      "Sin consultas completadas. Las notas clinicas estaran disponibles",
      ML + 3,
      y
    );
    y += 5;
    doc.text("cuando se registren las consultas del paciente.", ML + 3, y);
  } else {
    completedAppts.forEach((appt, idx) => {
      ensureSpace(28);

      const doctor = appt.doctor?.profile
        ? `${appt.doctor.profile.firstName} ${appt.doctor.profile.lastName}`
        : "-";

      const dateLabel = new Date(appt.startAt).toLocaleDateString("es-CL", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });

      // Card background
      doc.setFillColor(250, 248, 255);
      doc.setDrawColor(221, 214, 254);
      doc.setLineWidth(0.3);
      doc.roundedRect(ML, y, CW, 24, 2, 2, "FD");

      // Accent left bar
      doc.setFillColor(...C.violet);
      doc.rect(ML, y, 3, 24, "F");

      // Consulta label
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...C.violet);
      doc.text(`Consulta ${String(idx + 1).padStart(2, "0")}`, ML + 7, y + 6.5);

      // Date + doctor
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...C.slate500);
      doc.text(dateLabel, ML + 7, y + 12);
      doc.text(`Dr./Dra. ${doctor}`, col2, y + 12);

      // Notes
      const notes = appt.notes?.trim();
      doc.setFont("helvetica", notes ? "normal" : "italic");
      doc.setFontSize(8.5);
      doc.setTextColor(notes ? C.slate900[0] : C.slate300[0], notes ? C.slate900[1] : C.slate300[1], notes ? C.slate900[2] : C.slate300[2]);
      const notesText = notes ?? "Sin notas clinicas registradas para esta consulta.";
      const noteLines = doc.splitTextToSize(notesText, CW - 14);
      doc.text(noteLines[0] as string, ML + 7, y + 18.5);

      y += 28;
    });
  }

  // ── Footers on every page ─────────────────────────────────────────────────

  writeFooters();

  // ── Save ──────────────────────────────────────────────────────────────────

  const slug = `${patient.firstName}-${patient.lastName}`
    .toLowerCase()
    .replace(/\s+/g, "-");
  const dateSlug = new Date().toISOString().slice(0, 10);
  doc.save(`resumen-clinico-${slug}-${dateSlug}.pdf`);
}
