import * as React from "react";
import {
  EMAIL_TEMPLATE_META,
  EMAIL_TEMPLATE_TYPES,
  type EmailTemplateType,
} from "@/domain/clinic-settings/entities/EmailTemplate";
import { ManualEmail } from "./ManualEmail";
import { ProfessionalPayoutEmail } from "./ProfessionalPayoutEmail";
import { TemplateEmail } from "./TemplateEmail";
import { buildDefaultContent, buildTemplateContent } from "./templateContent";

export type EmailSample = {
  id: string;
  label: string;
  subject: string;
  element: React.ReactElement;
};

const EXTRA_EXAMPLES: Record<string, string> = {
  password: "Tmp-8Kq2vX",
  reason: "Reagendamiento por fuerza mayor",
  clinics: "Santiago, Vina del Mar",
};

function sampleVariables(eventType: EmailTemplateType) {
  const vars: Record<string, string> = {};
  for (const variable of EMAIL_TEMPLATE_META[eventType].variables) {
    vars[variable.key] = EXTRA_EXAMPLES[variable.key] ?? variable.example;
  }
  return vars;
}

const CTA: Partial<Record<EmailTemplateType, { url: string; label: string }>> = {
  USER_WELCOME: { url: "https://app.zensya.cl/login", label: "Iniciar sesion" },
};

/** Todos los correos del sistema con datos de ejemplo (previsualizacion y pruebas). */
export function getEmailSamples(): EmailSample[] {
  const samples: EmailSample[] = [];

  for (const eventType of EMAIL_TEMPLATE_TYPES) {
    const vars = sampleVariables(eventType);
    const content = buildDefaultContent(eventType, vars);
    const clinicName = vars.clinicName ?? "Clinica Dental Central";

    if (eventType === "PROFESSIONAL_PAYOUT") {
      samples.push({
        id: "professional-payout",
        label: EMAIL_TEMPLATE_META[eventType].label,
        subject: content.subject,
        element: (
          <ProfessionalPayoutEmail
            professionalName={vars.professionalName}
            monthLabel={vars.month}
            clinicName={clinicName}
            grossAmount={vars.grossAmount}
            clinicLabel="Clinica (30%)"
            clinicRetention={vars.clinicRetention}
            siiLabel="SII (10.5%)"
            siiRetention={vars.siiRetention}
            netLabel="Total estimado a pagar (59.5%)"
            netAmount={vars.netAmount}
            invoiceUrl="https://app.zensya.cl/mis-boletas?month=2026-01"
          />
        ),
      });
      continue;
    }

    samples.push({
      id: eventType.toLowerCase().replaceAll("_", "-"),
      label: EMAIL_TEMPLATE_META[eventType].label,
      subject: content.subject,
      element: <TemplateEmail eventType={eventType} content={content} clinicName={clinicName} cta={CTA[eventType]} />,
    });
  }

  // Plantilla personalizada con HTML y una variable hostil: debe verse escapada, sin ejecutar nada.
  const hostile = buildTemplateContent(
    "Prueba de seguridad en {{clinicName}}",
    '<p>Hola <strong>{{patientName}}</strong>,</p><p>Tu cita es el {{dateTime}}.</p><script>alert(1)</script><p onclick="x()">Gracias.</p>',
    {
      patientName: '<script>alert("xss")</script> <img src=x onerror=alert(1)>',
      dateTime: "15 de enero 2026, 10:30",
      clinicName: "Clinica Dental Central",
    },
  );
  samples.push({
    id: "plantilla-personalizada-html",
    label: "Plantilla personalizada (HTML con nombre hostil)",
    subject: hostile.subject,
    element: <TemplateEmail eventType="APPOINTMENT_CONFIRMATION" content={hostile} clinicName="Clinica Dental Central" />,
  });

  samples.push({
    id: "correo-manual",
    label: "Correo manual (ADMIN, /api/email/send)",
    subject: "Aviso importante para los pacientes",
    element: (
      <ManualEmail
        subject="Aviso importante para los pacientes"
        text={"Estimados pacientes,\n\nLa clinica atendera con horario reducido el proximo viernes.\n\nGracias por su comprension."}
      />
    ),
  });

  return samples;
}
