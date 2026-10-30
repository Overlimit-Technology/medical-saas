import * as React from "react";
import {
  Body,
  Column,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components";
import { emailTheme as t } from "./theme";

export type EmailLayoutProps = {
  /** Texto de vista previa que muestran los clientes de correo junto al asunto. */
  previewText: string;
  /** Nombre de la clinica/sede (marca de la clinica en el encabezado). */
  clinicName?: string;
  /** Aviso adicional bajo el contenido (por ejemplo, "solo usuarios internos"). */
  footerNote?: string;
  children: React.ReactNode;
};

const darkCss = `
:root { color-scheme: light dark; supported-color-schemes: light dark; }
@media (prefers-color-scheme: dark) {
  .em-body, .em-body > table > tbody > tr > td { background-color: #0b1220 !important; }
  .em-card { background-color: #111a2e !important; border-color: #22304d !important; }
  .em-text { color: #e2e8f0 !important; }
  .em-muted { color: #94a3b8 !important; }
  .em-soft { background-color: #0f2a31 !important; border-color: #1f4a52 !important; }
  .em-border { border-color: #22304d !important; }
  .em-divider { border-bottom-color: #1f4a52 !important; }
}
`;

/**
 * Estructura comun de todos los correos de ZENSYA/MediGest:
 * ancho 600px, encabezado de marca, contenido y pie con aviso de privacidad.
 */
export function EmailLayout({ previewText, clinicName, footerNote, children }: EmailLayoutProps) {
  return (
    <Html lang="es" dir="ltr">
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="light dark" />
        <meta name="supported-color-schemes" content="light dark" />
        <title>{previewText}</title>
        {/* dangerouslySetInnerHTML: React escaparia el > de los selectores y el CSS dejaria de funcionar. */}
        <style dangerouslySetInnerHTML={{ __html: darkCss }} />
      </Head>
      <Preview>{previewText}</Preview>
      <Body
        className="em-body"
        style={{ margin: 0, padding: "24px 12px", backgroundColor: t.page, fontFamily: t.font, color: t.text }}
      >
        <Container style={{ width: "100%", maxWidth: 600, margin: "0 auto" }}>
          <Section
            style={{
              backgroundColor: t.brand,
              borderRadius: "12px 12px 0 0",
              padding: "20px 28px",
            }}
          >
            <Row>
              <Column>
                <Text
                  style={{
                    margin: 0,
                    fontSize: 22,
                    fontWeight: 700,
                    letterSpacing: "0.18em",
                    color: "#ffffff",
                    fontFamily: t.font,
                  }}
                >
                  ZENSYA
                </Text>
              </Column>
              {clinicName ? (
                <Column align="right">
                  <Text style={{ margin: 0, fontSize: 13, color: "#e6fbfc", fontFamily: t.font }}>{clinicName}</Text>
                </Column>
              ) : null}
            </Row>
          </Section>

          <Section
            className="em-card"
            style={{
              backgroundColor: t.card,
              border: `1px solid ${t.border}`,
              borderTop: "none",
              borderRadius: "0 0 12px 12px",
              padding: "28px",
            }}
          >
            {children}
          </Section>

          <Section style={{ padding: "20px 8px 0" }}>
            {footerNote ? (
              <Text className="em-muted" style={{ ...footerText, marginBottom: 8 }}>
                {footerNote}
              </Text>
            ) : null}
            <Hr className="em-border" style={{ borderColor: t.border, margin: "0 0 12px" }} />
            <Text className="em-muted" style={footerText}>
              Este mensaje fue enviado automaticamente por ZENSYA. No respondas a este correo: la casilla no es
              revisada. Si necesitas ayuda, contacta directamente a tu clinica.
            </Text>
            <Text className="em-muted" style={footerText}>
              Privacidad: este correo puede contener informacion personal y confidencial dirigida solo a su
              destinatario, protegida por la Ley 19.628, la Ley 20.584 y la Ley 21.719. Si lo recibiste por error,
              eliminalo y avisa a la clinica; no lo reenvies ni compartas su contenido.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const footerText: React.CSSProperties = {
  margin: "0 0 8px",
  fontSize: 12,
  lineHeight: "18px",
  color: t.muted,
  fontFamily: t.font,
  textAlign: "center",
};
