import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import dns from "dns";

// Forzar IPv4 desde el inicio del módulo
dns.setDefaultResultOrder("ipv4first");

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

    // Validación básica
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

    // Resolver DNS explícitamente a IPv4
    console.log("[EMAIL] Resolviendo DNS de smtp.gmail.com a IPv4...");
    let smtpHost = "smtp.gmail.com";
    try {
      const addresses = await dns.promises.resolve4("smtp.gmail.com");
      if (addresses.length > 0) {
        smtpHost = addresses[0];
        console.log("[EMAIL] Usando dirección IPv4:", smtpHost);
      }
    } catch (dnsError) {
      console.warn("[EMAIL] No se pudo resolver IPv4, usando hostname:", dnsError);
    }

    // Intentar primero con puerto 587 (STARTTLS) que suele funcionar mejor
    console.log("[EMAIL] Creando transporter con puerto 587 (STARTTLS)...");
    let transporter = nodemailer.createTransport({
      host: smtpHost,
      port: 587,
      secure: false, // false para STARTTLS
      requireTLS: true,
      auth: {
        user: gmailUser,
        pass: appPassword,
      },
      tls: {
        // Permitir certificados autofirmados (útil con proxies corporativos)
        rejectUnauthorized: false,
      },
      // Timeouts
      connectionTimeout: 15000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    } as nodemailer.TransportOptions);

    console.log("[EMAIL] Verificando conexión con el servidor SMTP (puerto 587)...");
    try {
      await transporter.verify();
      console.log("[EMAIL] Conexión verificada exitosamente con puerto 587");
    } catch (verifyError) {
      console.warn("[EMAIL] Error verificando puerto 587, intentando puerto 465:", verifyError);
      
      // Fallback al puerto 465 (SSL)
      console.log("[EMAIL] Creando transporter con puerto 465 (SSL)...");
      transporter = nodemailer.createTransport({
        host: smtpHost,
        port: 465,
        secure: true, // true para SSL
        auth: {
          user: gmailUser,
          pass: appPassword,
        },
        tls: {
          // Permitir certificados autofirmados (útil con proxies corporativos)
          rejectUnauthorized: false,
          ciphers: "SSLv3",
        },
        // Timeouts
        connectionTimeout: 15000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
      } as nodemailer.TransportOptions);
      
      console.log("[EMAIL] Verificando conexión con el servidor SMTP (puerto 465)...");
      await transporter.verify();
      console.log("[EMAIL] Conexión verificada exitosamente con puerto 465");
    }

    // Enviamos el correo
    console.log("[EMAIL] Enviando correo a:", to);
    const info = await transporter.sendMail({
      from: gmailUser,
      to,
      subject,
      text: text || undefined,
      html: html || undefined,
    });

    console.log("[EMAIL] Correo enviado exitosamente. MessageId:", info.messageId);

    return NextResponse.json({
      ok: true,
      message: "Correo enviado exitosamente",
      messageId: info.messageId,
    });
  } catch (e) {
    console.error("[EMAIL] Error al enviar correo:", e);
    
    let errorMessage = "No se pudo enviar el correo.";
    let errorDetails: Record<string, unknown> | undefined;

    if (e instanceof Error) {
      errorMessage = e.message;
      errorDetails = {
        name: e.name,
        message: e.message,
        stack: process.env.NODE_ENV === "development" ? e.stack : undefined,
      };

      // Logs adicionales según el tipo de error
      if (e.message.includes("ECONNREFUSED")) {
        console.error("[EMAIL] Error de conexión rechazada. Verifica:");
        console.error("[EMAIL] - Que el puerto 465 no esté bloqueado");
        console.error("[EMAIL] - Que la contraseña de aplicación sea correcta");
        console.error("[EMAIL] - Que GMAIL_USER sea el email correcto");
      } else if (e.message.includes("EAUTH")) {
        console.error("[EMAIL] Error de autenticación. Verifica:");
        console.error("[EMAIL] - Que APP_PASSWORD_GMAIL sea correcta");
        console.error("[EMAIL] - Que GMAIL_USER sea el email correcto");
      } else if (e.message.includes("ETIMEDOUT")) {
        console.error("[EMAIL] Error de timeout. Verifica tu conexión a internet");
      }
    }

    return NextResponse.json(
      {
        message: "Error al enviar correo",
        error: errorMessage,
        details: process.env.NODE_ENV === "development" ? errorDetails : undefined,
      },
      { status: 500 }
    );
  }
}

