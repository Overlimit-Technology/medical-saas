import { deliverEmail } from "./mailer";

type SendEmailInput = {
  origin: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
};

export type SendEmailResult =
  | { ok: true; messageId?: string }
  | { ok: false; error: string };

function normalizeEmailError(detail: string) {
  const message = detail.toLowerCase();

  if (
    message.includes("invalid login") ||
    message.includes("username and password not accepted") ||
    message.includes("badcredentials") ||
    message.includes("eauth")
  ) {
    return "No se pudo autenticar el correo saliente. Revisa GMAIL_USER y APP_PASSWORD_GMAIL.";
  }

  if (message.includes("econnrefused") || message.includes("connection refused")) {
    return "El servidor de correo rechazo la conexion.";
  }

  if (message.includes("etimedout") || message.includes("timeout")) {
    return "El servidor de correo no respondio a tiempo.";
  }

  if (message.includes("datos invalidos") || message.includes("se requieren")) {
    return "Los datos del correo son invalidos.";
  }

  return "No se pudo enviar el correo.";
}

/**
 * Envia un correo directamente desde el servidor (sin pasar por una ruta HTTP).
 * `origin` se conserva por compatibilidad con quienes ya lo pasan, pero ya no se usa.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  try {
    const info = await deliverEmail({
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });

    return { ok: true, messageId: info.messageId };
  } catch (error) {
    return {
      ok: false,
      error: normalizeEmailError(error instanceof Error ? error.message : "No se pudo enviar el correo."),
    };
  }
}
