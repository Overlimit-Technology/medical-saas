import fs from "fs";
import path from "path";
import dns from "dns";
import nodemailer from "nodemailer";

// Forzar IPv4 desde el inicio del modulo
dns.setDefaultResultOrder("ipv4first");

export type EmailPayload = {
  to: string;
  subject: string;
  text?: string;
  html?: string;
};

type TransportAttempt = {
  label: string;
  transporter: nodemailer.Transporter;
};

/**
 * Variables requeridas en .env:
 * - APP_PASSWORD_GMAIL: contrasena de aplicacion de Gmail
 * - GMAIL_USER: email de Gmail desde el cual se enviaran los correos
 */
function getGmailConfig() {
  const appPassword = process.env.APP_PASSWORD_GMAIL;
  const gmailUser = process.env.GMAIL_USER;

  if (!appPassword) {
    throw new Error("APP_PASSWORD_GMAIL no esta definido en .env");
  }

  if (!gmailUser) {
    throw new Error("GMAIL_USER no esta definido en .env");
  }

  return { appPassword, gmailUser };
}

async function resolveSmtpHost() {
  try {
    const addresses = await dns.promises.resolve4("smtp.gmail.com");
    if (addresses.length > 0) return addresses[0];
  } catch (dnsError) {
    console.warn("[EMAIL] No se pudo resolver IPv4, usando hostname:", dnsError);
  }

  return "smtp.gmail.com";
}

function buildTransportAttempts(smtpHost: string, gmailUser: string, appPassword: string): TransportAttempt[] {
  // Se valida siempre el certificado del servidor (servername fija el nombre esperado aunque se use la IP).
  const common = {
    host: smtpHost,
    auth: { user: gmailUser, pass: appPassword },
    tls: { rejectUnauthorized: true, servername: "smtp.gmail.com" },
    connectionTimeout: 15000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  };

  return [
    {
      label: "puerto 587 (STARTTLS)",
      transporter: nodemailer.createTransport({
        ...common,
        port: 587,
        secure: false,
        requireTLS: true,
      } as nodemailer.TransportOptions),
    },
    {
      label: "puerto 465 (SSL)",
      transporter: nodemailer.createTransport({
        ...common,
        port: 465,
        secure: true,
      } as nodemailer.TransportOptions),
    },
  ];
}

function normalizeTransportError(error: unknown) {
  if (error instanceof Error) return error;
  return new Error(typeof error === "string" ? error : "No se pudo enviar el correo.");
}

async function verifyAndSendMail(attempt: TransportAttempt, payload: EmailPayload, gmailUser: string) {
  let operationalError: Error | null = null;
  const handleTransportError = (error: unknown) => {
    operationalError = normalizeTransportError(error);
    console.error(`[EMAIL] Error operacional en ${attempt.label}:`, operationalError.message);
  };

  attempt.transporter.on("error", handleTransportError);

  try {
    await attempt.transporter.verify();
    return await attempt.transporter.sendMail({
      from: gmailUser,
      to: payload.to,
      subject: payload.subject,
      text: payload.text || undefined,
      html: payload.html || undefined,
    });
  } catch (error) {
    throw operationalError ?? normalizeTransportError(error);
  } finally {
    attempt.transporter.removeListener("error", handleTransportError);
    try {
      attempt.transporter.close();
    } catch {
      // Sin accion: el transporter ya estaba cerrado.
    }
  }
}

/**
 * Modo de prueba: con MAIL_DRY_RUN=1 no se envia nada; el correo renderizado se escribe en
 * `.email-outbox/` (ignorado por git) y se informa por consola.
 */
async function writeDryRun(payload: EmailPayload): Promise<{ messageId: string }> {
  const dir = path.join(process.cwd(), ".email-outbox");
  await fs.promises.mkdir(dir, { recursive: true });
  const id = `dry-run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  if (payload.html) await fs.promises.writeFile(path.join(dir, `${id}.html`), payload.html, "utf8");
  if (payload.text) await fs.promises.writeFile(path.join(dir, `${id}.txt`), payload.text, "utf8");
  console.info(`[EMAIL] MAIL_DRY_RUN=1: correo NO enviado (a: ${payload.to}, asunto: ${payload.subject}). Guardado en .email-outbox/${id}`);
  return { messageId: id };
}

/**
 * Envia un correo con la cuenta de Gmail de la plataforma.
 * Es solo para uso interno del servidor: ninguna ruta publica debe llamarlo con datos sin validar.
 */
export async function deliverEmail(payload: EmailPayload): Promise<{ messageId?: string }> {
  if (!payload.to || !payload.subject || (!payload.text && !payload.html)) {
    throw new Error("Se requieren: to, subject y (text o html)");
  }

  if (process.env.MAIL_DRY_RUN === "1") return writeDryRun(payload);

  const { appPassword, gmailUser } = getGmailConfig();
  const smtpHost = await resolveSmtpHost();
  const attempts = buildTransportAttempts(smtpHost, gmailUser, appPassword);

  let lastError: Error | null = null;

  for (const attempt of attempts) {
    try {
      const info = await verifyAndSendMail(attempt, payload, gmailUser);
      return { messageId: info.messageId };
    } catch (error) {
      lastError = normalizeTransportError(error);
      console.warn(`[EMAIL] Fallo el intento por ${attempt.label}:`, lastError.message);
    }
  }

  throw lastError ?? new Error("No se pudo enviar el correo.");
}
