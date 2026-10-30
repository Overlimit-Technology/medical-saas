import * as React from "react";
import { Section } from "@react-email/components";
import { EmailLayout } from "./EmailLayout";
import { EmailParagraph, EmailTitle } from "./parts";
import { sanitizeEmailHtml } from "./templateContent";
import { emailTheme as t } from "./theme";

export type ManualEmailProps = {
  subject: string;
  text?: string;
  html?: string;
};

/** Correo manual que envia un ADMIN (`/api/email/send`): su contenido va dentro del layout comun. */
export function ManualEmail({ subject, text, html }: ManualEmailProps) {
  const paragraphs = (text ?? "").replace(/\r\n/g, "\n").split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  return (
    <EmailLayout previewText={subject}>
      <EmailTitle>{subject}</EmailTitle>
      {html ? (
        <Section className="em-text" style={{ fontSize: 15, lineHeight: "24px", color: t.text, fontFamily: t.font }}>
          <div dangerouslySetInnerHTML={{ __html: sanitizeEmailHtml(html) }} />
        </Section>
      ) : (
        paragraphs.map((paragraph, i) => (
          <EmailParagraph key={i}>
            {paragraph.split("\n").map((line, j) => (
              <React.Fragment key={j}>
                {j > 0 ? <br /> : null}
                {line}
              </React.Fragment>
            ))}
          </EmailParagraph>
        ))
      )}
    </EmailLayout>
  );
}
