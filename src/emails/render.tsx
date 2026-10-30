import * as React from "react";
import { render } from "@react-email/render";
import { ManualEmail, type ManualEmailProps } from "./ManualEmail";

export type RenderedEmail = { html: string; text: string };

/** Renderiza un componente React Email a HTML y a texto plano (para la parte alternativa del correo). */
export async function renderEmail(element: React.ReactElement): Promise<RenderedEmail> {
  const [html, text] = await Promise.all([render(element), render(element, { plainText: true })]);
  return { html, text };
}

export function renderManualEmail(props: ManualEmailProps) {
  return renderEmail(<ManualEmail {...props} />);
}
