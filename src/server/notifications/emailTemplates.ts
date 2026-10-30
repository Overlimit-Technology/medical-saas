import { createElement } from "react";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_TEMPLATES,
  type EmailTemplateType,
} from "@/domain/clinic-settings/entities/EmailTemplate";
import { renderEmail } from "@/emails/render";
import { TemplateEmail } from "@/emails/TemplateEmail";
import { buildTemplateContent, type TemplateContent } from "@/emails/templateContent";

type ResolvedTemplate = {
  subject: string;
  /** Documento HTML completo (layout comun + cuerpo de la plantilla), listo para enviar. */
  body: string;
  /** Version de texto plano del mismo correo. */
  text: string;
  /** Siempre true: `body` es HTML. Se conserva por compatibilidad con quienes ya lo leen. */
  isHtml: boolean;
  enabled: boolean;
  /** true si la clinica guardo su propia plantilla para este evento. */
  customized: boolean;
  /** Contenido ya interpolado (variables escapadas), por si el llamador necesita otro layout. */
  content: TemplateContent;
};

type ResolveOptions = {
  /** Marca de la clinica en el encabezado; por defecto, la variable `clinicName`. */
  clinicName?: string;
  /** Boton opcional del correo (URL http/https). */
  cta?: { url: string; label: string };
};

/**
 * Resuelve la plantilla de un evento para una clinica (la personalizada o la de por defecto),
 * interpola las variables con escape de HTML y la renderiza dentro del layout comun de React Email.
 */
export async function resolveEmailTemplate(
  clinicId: string,
  eventType: EmailTemplateType,
  variables: Record<string, string>,
  options: ResolveOptions = {},
): Promise<ResolvedTemplate> {
  const defaults = DEFAULT_TEMPLATES[eventType];

  const settings = await prisma.clinicSettings.findUnique({
    where: { clinicId },
    select: { id: true },
  });

  let subject = defaults.subject;
  let body = defaults.body;
  let enabled = true;
  let customized = false;

  if (settings) {
    const template = await prisma.emailTemplate.findUnique({
      where: {
        clinicSettingsId_eventType: {
          clinicSettingsId: settings.id,
          eventType,
        },
      },
      select: { subject: true, body: true, enabled: true },
    });

    if (template) {
      subject = template.subject;
      body = template.body;
      enabled = template.enabled;
      customized = true;
    }
  }

  const content = buildTemplateContent(subject, body, variables);
  const rendered = await renderEmail(
    createElement(TemplateEmail, {
      eventType,
      content,
      clinicName: options.clinicName ?? variables.clinicName,
      cta: options.cta,
    }),
  );

  return {
    subject: content.subject,
    body: rendered.html,
    text: rendered.text,
    isHtml: true,
    enabled,
    customized,
    content,
  };
}
