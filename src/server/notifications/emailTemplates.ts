import { prisma } from "@/lib/prisma";
import {
  DEFAULT_TEMPLATES,
  type EmailTemplateType,
} from "@/domain/clinic-settings/entities/EmailTemplate";

type ResolvedTemplate = {
  subject: string;
  body: string;
  /** true when body is already HTML (WYSIWYG), false for plain text defaults */
  isHtml: boolean;
  enabled: boolean;
};

function textToHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br/>");
}

/**
 * Resolves an email template for a given clinic and event type.
 * Returns the custom template if one exists, otherwise the default.
 */
export async function resolveEmailTemplate(
  clinicId: string,
  eventType: EmailTemplateType,
  variables: Record<string, string>,
): Promise<ResolvedTemplate> {
  const defaults = DEFAULT_TEMPLATES[eventType];

  const settings = await prisma.clinicSettings.findUnique({
    where: { clinicId },
    select: { id: true },
  });

  let subject = defaults.subject;
  let body = defaults.body;
  let enabled = true;
  let isHtml = false;

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
      isHtml = body.includes("<") && body.includes(">");
    }
  }

  // Interpolate variables
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;
    subject = subject.replaceAll(placeholder, value);
    body = body.replaceAll(placeholder, value);
  }

  // Convert plain-text default templates to HTML for consistency
  if (!isHtml) {
    body = textToHtml(body);
    isHtml = true;
  }

  return { subject, body, isHtml, enabled };
}
