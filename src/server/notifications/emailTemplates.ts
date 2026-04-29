import { prisma } from "@/lib/prisma";
import {
  DEFAULT_TEMPLATES,
  type EmailTemplateType,
} from "@/domain/clinic-settings/entities/EmailTemplate";

type ResolvedTemplate = {
  subject: string;
  body: string;
  enabled: boolean;
};

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
    }
  }

  // Interpolate variables
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;
    subject = subject.replaceAll(placeholder, value);
    body = body.replaceAll(placeholder, value);
  }

  return { subject, body, enabled };
}
