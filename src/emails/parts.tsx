import * as React from "react";
import { Button, Heading, Section, Text } from "@react-email/components";
import { emailTheme as t } from "./theme";

export function EmailTitle({ children }: { children: React.ReactNode }) {
  return (
    <Heading
      as="h1"
      className="em-text"
      style={{ margin: "0 0 16px", fontSize: 22, lineHeight: "30px", fontWeight: 700, color: t.text, fontFamily: t.font }}
    >
      {children}
    </Heading>
  );
}

export function EmailParagraph({ children }: { children: React.ReactNode }) {
  return (
    <Text
      className="em-text"
      style={{ margin: "0 0 16px", fontSize: 15, lineHeight: "24px", color: t.text, fontFamily: t.font }}
    >
      {children}
    </Text>
  );
}

export type DetailRow = { label: string; value: string; emphasis?: boolean; mono?: boolean };

/** Tarjeta con filas "etiqueta / valor" (cita, pago, credenciales...). */
export function DetailsCard({ rows }: { rows: DetailRow[] }) {
  if (!rows.length) return null;
  return (
    <Section
      className="em-soft"
      style={{
        margin: "0 0 20px",
        backgroundColor: t.brandSoft,
        border: "1px solid #bfe9ec",
        borderRadius: 10,
        padding: "8px 16px",
      }}
    >
      {rows.map((row, i) => (
        <table
          key={i}
          role="presentation"
          className="em-divider"
          width="100%"
          cellPadding={0}
          cellSpacing={0}
          style={{ borderBottom: i === rows.length - 1 ? "none" : "1px solid #cdeef0" }}
        >
          <tbody>
            <tr>
              <td
                className="em-muted"
                style={{ padding: "10px 0", fontSize: 13, color: t.muted, fontFamily: t.font, width: "42%", verticalAlign: "top" }}
              >
                {row.label}
                {/* Separador solo para la version de texto plano ("Etiqueta: valor"). */}
                <span style={{ display: "none", fontSize: 0, lineHeight: 0, maxHeight: 0, overflow: "hidden" }}>: </span>
              </td>
              <td
                className="em-text"
                style={{
                  padding: "10px 0",
                  fontSize: 14,
                  color: t.text,
                  fontWeight: row.emphasis ? 700 : 500,
                  fontFamily: row.mono ? t.mono : t.font,
                  textAlign: "right",
                  verticalAlign: "top",
                  wordBreak: "break-word",
                }}
              >
                {row.value}
              </td>
            </tr>
          </tbody>
        </table>
      ))}
    </Section>
  );
}

/** Boton de llamada a la accion (el href debe ser una URL http/https). */
export function CtaButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Section style={{ margin: "8px 0 20px", textAlign: "center" }}>
      <Button
        href={href}
        style={{
          backgroundColor: t.brand,
          color: "#ffffff",
          fontFamily: t.font,
          fontSize: 15,
          fontWeight: 700,
          textDecoration: "none",
          borderRadius: 8,
          padding: "13px 28px",
          display: "inline-block",
        }}
      >
        {children}
      </Button>
    </Section>
  );
}

export function Callout({ children }: { children: React.ReactNode }) {
  return (
    <Text
      className="em-muted"
      style={{ margin: "0 0 16px", fontSize: 13, lineHeight: "20px", color: t.muted, fontFamily: t.font }}
    >
      {children}
    </Text>
  );
}
