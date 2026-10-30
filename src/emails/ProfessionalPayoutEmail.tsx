import * as React from "react";
import { EmailLayout } from "./EmailLayout";
import { CtaButton, DetailsCard, EmailParagraph, EmailTitle, Callout } from "./parts";

export type ProfessionalPayoutEmailProps = {
  professionalName: string;
  monthLabel: string;
  clinicName: string;
  grossAmount: string;
  clinicLabel: string;
  clinicRetention: string;
  siiLabel: string;
  siiRetention: string;
  netLabel: string;
  netAmount: string;
  invoiceUrl: string;
};

/** Liquidacion mensual del profesional (tabla de montos + boton para generar la boleta). */
export function ProfessionalPayoutEmail(p: ProfessionalPayoutEmailProps) {
  return (
    <EmailLayout
      previewText={`Tu liquidacion de ${p.monthLabel} en ${p.clinicName}`}
      clinicName={p.clinicName}
      footerNote="Los montos son estimados segun los porcentajes vigentes de la sede."
    >
      <EmailTitle>Liquidacion de {p.monthLabel}</EmailTitle>
      <EmailParagraph>Hola {p.professionalName},</EmailParagraph>
      <EmailParagraph>Te compartimos tu resumen de liquidacion correspondiente a {p.monthLabel}.</EmailParagraph>
      <DetailsCard
        rows={[
          { label: "Sede", value: p.clinicName },
          { label: "Total recaudado", value: p.grossAmount, emphasis: true },
          { label: p.clinicLabel, value: p.clinicRetention },
          { label: p.siiLabel, value: p.siiRetention },
          { label: p.netLabel, value: p.netAmount, emphasis: true },
        ]}
      />
      <CtaButton href={p.invoiceUrl}>Generar mi boleta</CtaButton>
      <Callout>Si necesitas revisar el detalle, por favor contacta a la clinica.</Callout>
    </EmailLayout>
  );
}
