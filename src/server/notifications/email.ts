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

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  try {
    const res = await fetch(new URL("/api/email/send", input.origin), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: input.to,
        subject: input.subject,
        text: input.text,
        html: input.html,
      }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const detail = data?.error ?? data?.message ?? "No se pudo enviar el correo.";
      return { ok: false, error: normalizeEmailError(String(detail)) };
    }

    return {
      ok: true,
      messageId: typeof data?.messageId === "string" ? data.messageId : undefined,
    };
  } catch (error) {
    return {
      ok: false,
      error: normalizeEmailError(error instanceof Error ? error.message : "No se pudo enviar el correo."),
    };
  }
}
