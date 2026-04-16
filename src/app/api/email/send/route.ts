import { NextResponse } from "next/server";
import dns from "dns";
import nodemailer from "nodemailer";

// Forzar IPv4 desde el inicio del módulo
dns.setDefaultResultOrder("ipv4first");

type EmailPayload = {
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
 * - APP_PASSWORD_GMAIL: contraseña de aplicación de Gmail
 * - GMAIL_USER: email de Gmail desde el cual se enviarán los correos
 */
function getGmailConfig() {
  const appPassword = process.env.APP_PASSWORD_GMAIL;
  const gmailUser = process.env.GMAIL_USER;

  console.log("[EMAIL] Verificando configuración...");
  console.log("[EMAIL] GMAIL_USER definido:", !!gmailUser);
  console.log("[EMAIL] APP_PASSWORD_GMAIL definido:", !!appPassword);

  if (!appPassword) {
    throw new Error("APP_PASSWORD_GMAIL no está definido en .env");
  }

  if (!gmailUser) {
    throw new Error("GMAIL_USER no está definido en .env");
  }

  return {
    appPassword,
    gmailUser,
  };
}

async function resolveSmtpHost() {
  console.log("[EMAIL] Resolviendo DNS de smtp.gmail.com a IPv4...");

  try {
    const addresses = await dns.promises.resolve4("smtp.gmail.com");
    if (addresses.length > 0) {
      console.log("[EMAIL] Usando dirección IPv4:", addresses[0]);
      return addresses[0];
    }
  } catch (dnsError) {
    console.warn("[EMAIL] No se pudo resolver IPv4, usando hostname:", dnsError);
  }

  return "smtp.gmail.com";
}

function buildTransportAttempts(smtpHost: string, gmailUser: string, appPassword: string): TransportAttempt[] {
  return [
    {
      label: "puerto 587 (STARTTLS)",
      transporter: nodemailer.createTransport({
        host: smtpHost,
        port: 587,
        secure: false,
        requireTLS: true,
        auth: {
          user: gmailUser,
          pass: appPassword,
        },
        tls: {
          rejectUnauthorized: false,
          servername: "smtp.gmail.com",
        },
        connectionTimeout: 15000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
      } as nodemailer.TransportOptions),
    },
    {
      label: "puerto 465 (SSL)",
      transporter: nodemailer.createTransport({
        host: smtpHost,
        port: 465,
        secure: true,
        auth: {
          user: gmailUser,
          pass: appPassword,
        },
        tls: {
          rejectUnauthorized: false,
          servername: "smtp.gmail.com",
        },
        connectionTimeout: 15000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
      } as nodemailer.TransportOptions),
    },
  ];
}

function normalizeTransportError(error: unknown) {
  if (error instanceof Error) return error;
  return new Error(typeof error === "string" ? error : "No se pudo enviar el correo.");
}

function logTypedEmailError(error: Error) {
  if (error.message.includes("ECONNREFUSED")) {
    console.error("[EMAIL] Error de conexión rechazada. Verifica:");
    console.error("[EMAIL] - Que el puerto SMTP no esté bloqueado");
    console.error("[EMAIL] - Que la contraseña de aplicación sea correcta");
    console.error("[EMAIL] - Que GMAIL_USER sea el email correcto");
  } else if (error.message.includes("EAUTH")) {
    console.error("[EMAIL] Error de autenticación. Verifica:");
    console.error("[EMAIL] - Que APP_PASSWORD_GMAIL sea correcta");
    console.error("[EMAIL] - Que GMAIL_USER sea el email correcto");
  } else if (error.message.includes("ETIMEDOUT")) {
    console.error("[EMAIL] Error de timeout. Verifica tu conexión a internet");
  } else if (error.message.includes("ECONNRESET")) {
    console.error("[EMAIL] El servidor SMTP cerró la conexión inesperadamente.");
  }
}

async function closeTransporter(transporter: nodemailer.Transporter) {
  try {
    transporter.close();
  } catch (closeError) {
    console.warn("[EMAIL] No se pudo cerrar el transporter limpiamente:", closeError);
  }
}

async function verifyAndSendMail(
  attempt: TransportAttempt,
  payload: EmailPayload,
  gmailUser: string,
) {
  let operationalError: Error | null = null;
  const handleTransportError = (error: unknown) => {
    const normalizedError = normalizeTransportError(error);
    operationalError = normalizedError;
    console.error(`[EMAIL] Error operacional detectado en ${attempt.label}:`, normalizedError);
  };

  attempt.transporter.on("error", handleTransportError);

  try {
    console.log(`[EMAIL] Verificando conexión con el servidor SMTP (${attempt.label})...`);
    await attempt.transporter.verify();
    console.log(`[EMAIL] Conexión verificada exitosamente con ${attempt.label}`);

    console.log("[EMAIL] Enviando correo a:", payload.to);
    const info = await attempt.transporter.sendMail({
      from: gmailUser,
      to: payload.to,
      subject: payload.subject,
      text: payload.text || undefined,
      html: payload.html || undefined,
    });

    console.log("[EMAIL] Correo enviado exitosamente. MessageId:", info.messageId);
    return info;
  } catch (error) {
    throw operationalError ?? normalizeTransportError(error);
  } finally {
    attempt.transporter.removeListener("error", handleTransportError);
    await closeTransporter(attempt.transporter);
  }
}

/**
 * Endpoint POST para enviar correos electrónicos:
 * 1. Recibe destinatario, asunto y cuerpo del correo.
 * 2. Valida que todos los campos estén presentes.
 * 3. Envía el correo usando Gmail con la contraseña de aplicación.
 */
export async function POST(req: Request) {
  try {
    console.log("[EMAIL] Iniciando envío de correo...");
    const body = await req.json();
    const { to, subject, text, html } = body;

    console.log("[EMAIL] Datos recibidos:", {
      to,
      subject,
      hasText: !!text,
      hasHtml: !!html,
    });

    if (!to || !subject || (!text && !html)) {
      console.log("[EMAIL] Validación fallida: datos incompletos");
      return NextResponse.json(
        {
          message: "Datos inválidos",
          error: "Se requieren: to, subject y (text o html)",
        },
        { status: 400 }
      );
    }

    const { appPassword, gmailUser } = getGmailConfig();
    console.log("[EMAIL] Configuración obtenida, usuario:", gmailUser);

    const smtpHost = await resolveSmtpHost();
    const attempts = buildTransportAttempts(smtpHost, gmailUser, appPassword);

    let lastError: Error | null = null;

    for (const attempt of attempts) {
      try {
        const info = await verifyAndSendMail(attempt, { to, subject, text, html }, gmailUser);
        return NextResponse.json({
          ok: true,
          message: "Correo enviado exitosamente",
          messageId: info.messageId,
        });
      } catch (error) {
        lastError = normalizeTransportError(error);
        console.warn(`[EMAIL] Falló el intento de envío por ${attempt.label}:`, lastError);
      }
    }

    throw lastError ?? new Error("No se pudo enviar el correo.");
  } catch (error) {
    const normalizedError = normalizeTransportError(error);
    console.error("[EMAIL] Error al enviar correo:", normalizedError);
    logTypedEmailError(normalizedError);

    return NextResponse.json(
      {
        message: "Error al enviar correo",
        error: normalizedError.message,
        details:
          process.env.NODE_ENV === "development"
            ? {
                name: normalizedError.name,
                message: normalizedError.message,
                stack: normalizedError.stack,
              }
            : undefined,
      },
      { status: 500 }
    );
  }
}
