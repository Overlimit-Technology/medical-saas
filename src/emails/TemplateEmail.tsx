import * as React from "react";
import { Section } from "@react-email/components";
import type { EmailTemplateType } from "@/domain/clinic-settings/entities/EmailTemplate";
import { EmailLayout } from "./EmailLayout";
import { Callout, CtaButton, DetailsCard, EmailParagraph, EmailTitle } from "./parts";
import { parsePlainBody, type TemplateContent } from "./templateContent";
import { emailTheme as t } from "./theme";

type TypeConfig = { title: string; preview: string; footerNote?: string };

/** Titulo y vista previa de cada tipo de correo editable por la clinica. */
export const TEMPLATE_EMAIL_CONFIG: Record<EmailTemplateType, TypeConfig> = {
  APPOINTMENT_CONFIRMATION: { title: "Tu cita fue agendada", preview: "Los datos de tu cita ya estan confirmados." },
  APPOINTMENT_REMINDER: { title: "Recordatorio de tu cita", preview: "Te recordamos tu cita programada para manana." },
  APPOINTMENT_CANCELLATION: { title: "Tu cita fue cancelada", preview: "Tu cita fue cancelada por la clinica." },
  PATIENT_WELCOME: { title: "Te damos la bienvenida", preview: "Tu registro como paciente fue creado." },
  USER_WELCOME: {
    title: "Tu cuenta fue creada",
    preview: "Ya puedes ingresar con tu contrasena temporal.",
    footerNote: "Por seguridad, nunca compartas tu contrasena y cambiala al ingresar por primera vez.",
  },
  PAYMENT_UPDATE: { title: "Actualizacion de tu tratamiento", preview: "Se actualizo el estado de tu pago." },
  PROFESSIONAL_PAYOUT: { title: "Resumen de liquidacion", preview: "Tu resumen de liquidacion mensual." },
  INTERNAL_ALERT: {
    title: "Alerta interna",
    preview: "Se genero una alerta interna en el sistema.",
    footerNote: "Mensaje solo para usuarios internos del sistema.",
  },
};

export type TemplateEmailProps = {
  eventType: EmailTemplateType;
  content: TemplateContent;
  clinicName?: string;
  /** Boton opcional (URL http/https). */
  cta?: { url: string; label: string };
};

/**
 * Renderiza el cuerpo (plantilla por defecto o editada por la clinica) dentro del layout comun.
 * Cuerpo HTML: variables ya escapadas. Cuerpo de texto: React escapa al renderizar.
 */
export function TemplateEmail({ eventType, content, clinicName, cta }: TemplateEmailProps) {
  const config = TEMPLATE_EMAIL_CONFIG[eventType];

  return (
    <EmailLayout previewText={config.preview} clinicName={clinicName} footerNote={config.footerNote}>
      <EmailTitle>{config.title}</EmailTitle>
      {content.format === "html" ? (
        <Section className="em-text" style={{ margin: "0 0 16px", fontSize: 15, lineHeight: "24px", color: t.text, fontFamily: t.font }}>
          <div dangerouslySetInnerHTML={{ __html: content.body }} />
        </Section>
      ) : (
        parsePlainBody(content.body).map((block, i) =>
          block.kind === "details" ? (
            <DetailsCard
              key={i}
              rows={block.rows.map((row) => ({
                ...row,
                mono: /contrasena|clave|password/i.test(row.label),
              }))}
            />
          ) : (
            <EmailParagraph key={i}>
              {block.lines.map((line, j) => (
                <React.Fragment key={j}>
                  {j > 0 ? <br /> : null}
                  {line}
                </React.Fragment>
              ))}
            </EmailParagraph>
          ),
        )
      )}
      {cta ? <CtaButton href={cta.url}>{cta.label}</CtaButton> : null}
      {eventType === "USER_WELCOME" ? (
        <Callout>Si no esperabas este correo, ignoralo y avisa al administrador de tu clinica.</Callout>
      ) : null}
    </EmailLayout>
  );
}

/** Un componente por tipo de correo editable (mismo layout; titulo, vista previa y pie propios). */
type PerTypeProps = Omit<TemplateEmailProps, "eventType">;
export const AppointmentConfirmationEmail = (p: PerTypeProps) => <TemplateEmail eventType="APPOINTMENT_CONFIRMATION" {...p} />;
export const AppointmentReminderEmail = (p: PerTypeProps) => <TemplateEmail eventType="APPOINTMENT_REMINDER" {...p} />;
export const AppointmentCancellationEmail = (p: PerTypeProps) => <TemplateEmail eventType="APPOINTMENT_CANCELLATION" {...p} />;
export const PatientWelcomeEmail = (p: PerTypeProps) => <TemplateEmail eventType="PATIENT_WELCOME" {...p} />;
export const UserWelcomeEmail = (p: PerTypeProps) => <TemplateEmail eventType="USER_WELCOME" {...p} />;
export const PaymentUpdateEmail = (p: PerTypeProps) => <TemplateEmail eventType="PAYMENT_UPDATE" {...p} />;
export const InternalAlertEmail = (p: PerTypeProps) => <TemplateEmail eventType="INTERNAL_ALERT" {...p} />;
