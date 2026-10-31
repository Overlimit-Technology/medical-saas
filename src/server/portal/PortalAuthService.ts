import { createHmac, randomInt, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { normalizeId } from "@/lib/normalize";
import { formatRun, isValidRun } from "@/lib/run";
import { hashPassword, verifyPassword } from "@/lib/password";
import { sendEmail } from "@/server/notifications/email";
import { portalSecret } from "./portalSession";

const CODE_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const MAX_CODES_PER_WINDOW = 3;
const MIN_PASSWORD = 8;

export class PortalError extends Error {}

export type PortalClinic = {
  clinicId: string;
  slug: string;
  name: string;
  address: string | null;
  phone: string | null;
  slotMinutes: number;
};

const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/;

export function isValidPortalSlug(slug: string) {
  return SLUG_PATTERN.test(slug);
}

/** Sede del portal segun su slug. Devuelve null si no existe, esta apagado o la sede esta inactiva. */
export async function resolvePortalClinic(slug: string): Promise<PortalClinic | null> {
  if (!isValidPortalSlug(slug)) return null;
  const settings = await prisma.clinicSettings.findUnique({
    where: { portalSlug: slug },
    select: {
      portalEnabled: true,
      bookingSlotMinutes: true,
      clinic: { select: { id: true, name: true, address: true, phone: true, isActive: true } },
    },
  });
  if (!settings || !settings.portalEnabled || !settings.clinic.isActive) return null;
  return {
    clinicId: settings.clinic.id,
    slug,
    name: settings.clinic.name,
    address: settings.clinic.address,
    phone: settings.clinic.phone,
    slotMinutes: settings.bookingSlotMinutes,
  };
}

function hashCode(clinicId: string, runNormalized: string, code: string) {
  return createHmac("sha256", portalSecret()).update(`${clinicId}:${runNormalized}:${code}`).digest("hex");
}

function sameHash(a: string, b: string) {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
}

/** c•••••@gmail.com: muestra a que correo llego el codigo sin revelarlo completo. */
export function maskEmail(email: string) {
  const [user, domain] = email.split("@");
  if (!domain) return email;
  return `${user.charAt(0)}${"•".repeat(Math.max(2, user.length - 1))}@${domain}`;
}

function codeEmailHtml(clinicName: string, firstName: string, code: string) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7f9;padding:32px 0;">
  <tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid #dce3e8;border-radius:24px;">
      <tr><td style="padding:36px 40px 8px;font:600 13px Arial,Helvetica,sans-serif;color:#1e737b;letter-spacing:.08em;text-transform:uppercase;">Portal del paciente · ${clinicName}</td></tr>
      <tr><td style="padding:8px 40px;font:700 28px/1.2 'Syne',Arial,Helvetica,sans-serif;letter-spacing:-0.5px;color:#0d1b2a;">Tu código para crear tu cuenta</td></tr>
      <tr><td style="padding:8px 40px 20px;font:400 16px/24px 'Lexend',Arial,Helvetica,sans-serif;color:#4a5c6d;">Hola ${firstName}: escribe este código en el portal para terminar de crear tu cuenta. Vence en ${CODE_MINUTES} minutos.</td></tr>
      <tr><td style="padding:0 40px 28px;"><div style="display:inline-block;padding:16px 28px;border-radius:16px;background:#eef9fa;border:1px solid #b9e8ed;font:700 34px/1 'Courier New',monospace;letter-spacing:10px;color:#0d1b2a;">${code}</div></td></tr>
      <tr><td style="padding:0 40px 36px;font:400 13px/20px Arial,Helvetica,sans-serif;color:#4a5c6d;">Si no pediste este código, ignora este correo. Nadie de la clínica te lo va a pedir.</td></tr>
    </table>
    <p style="max-width:600px;font:400 12px/18px Arial,Helvetica,sans-serif;color:#4a5c6d;">Enviado por Zensya en nombre de ${clinicName}.</p>
  </td></tr>
</table>`;
}

export class PortalAuthService {
  /**
   * Paso 1 del registro. Si el RUT ya existe en la sede, el codigo va al correo de su ficha
   * (nunca a uno escrito en el formulario). Si es nuevo, se usan los datos del formulario.
   */
  static async requestSignupCode(
    clinic: PortalClinic,
    input: { run: string; email: string; firstName?: string; lastName?: string; phone?: string }
  ) {
    if (!isValidRun(input.run)) throw new PortalError("El RUT no es valido. Revisa el numero y el digito verificador.");
    const runNormalized = normalizeId(input.run);
    const typedEmail = input.email.trim().toLowerCase();

    const patient = await prisma.patient.findFirst({
      where: { clinicId: clinic.clinicId, runNormalized },
      select: { id: true, isActive: true, email: true, firstName: true, portalAccount: { select: { id: true } } },
    });

    if (patient?.portalAccount) throw new PortalError("Ya tienes una cuenta. Ingresa con tu RUT o correo.");
    if (patient && !patient.isActive) throw new PortalError("No pudimos crear tu cuenta con estos datos. Llama a la clinica.");

    let targetEmail: string;
    let firstName: string;
    if (patient) {
      if (!patient.email) {
        throw new PortalError("Tu ficha no tiene un correo registrado. Pide en recepcion que lo agreguen para crear tu cuenta.");
      }
      targetEmail = patient.email.trim().toLowerCase();
      firstName = patient.firstName;
    } else {
      if (!input.firstName?.trim() || !input.lastName?.trim()) {
        throw new PortalError("Escribe tu nombre y apellido para crear tu ficha.");
      }
      targetEmail = typedEmail;
      firstName = input.firstName.trim();
    }

    const emailTaken = await prisma.patientAccount.findUnique({
      where: { clinicId_email: { clinicId: clinic.clinicId, email: targetEmail } },
      select: { id: true },
    });
    if (emailTaken) throw new PortalError("Ese correo ya tiene una cuenta. Ingresa con tu RUT o correo.");

    const recent = await prisma.patientPortalCode.count({
      where: { clinicId: clinic.clinicId, runNormalized, createdAt: { gt: new Date(Date.now() - CODE_MINUTES * 60_000) } },
    });
    if (recent >= MAX_CODES_PER_WINDOW) {
      throw new PortalError(`Ya te enviamos varios codigos. Espera ${CODE_MINUTES} minutos y vuelve a intentarlo.`);
    }

    const code = String(randomInt(100000, 1000000));
    const saved = await prisma.patientPortalCode.create({
      data: {
        clinicId: clinic.clinicId,
        runNormalized,
        email: targetEmail,
        firstName: patient ? null : input.firstName?.trim() ?? null,
        lastName: patient ? null : input.lastName?.trim() ?? null,
        phone: patient ? null : input.phone?.trim() || null,
        codeHash: hashCode(clinic.clinicId, runNormalized, code),
        expiresAt: new Date(Date.now() + CODE_MINUTES * 60_000),
      },
      select: { id: true },
    });

    const sent = await sendEmail({
      origin: "",
      to: targetEmail,
      subject: `${code} es tu código del portal de ${clinic.name}`,
      text: `Hola ${firstName}: tu código para crear tu cuenta en el portal de ${clinic.name} es ${code}. Vence en ${CODE_MINUTES} minutos.`,
      html: codeEmailHtml(clinic.name, firstName, code),
    });
    if (!sent.ok) {
      // Un codigo que nunca llego no debe quedar vigente ni contar para el limite.
      await prisma.patientPortalCode.delete({ where: { id: saved.id } });
      throw new PortalError("No pudimos enviar el correo. Intentalo de nuevo en unos minutos.");
    }

    return { maskedEmail: maskEmail(targetEmail) };
  }

  /** Paso 2: valida el codigo, crea la cuenta (y la ficha si es paciente nuevo) y devuelve la cuenta. */
  static async verifyAndCreate(clinic: PortalClinic, input: { run: string; code: string; password: string }) {
    if (input.password.length < MIN_PASSWORD) throw new PortalError(`La contrasena debe tener al menos ${MIN_PASSWORD} caracteres.`);
    if (!isValidRun(input.run)) throw new PortalError("El RUT no es valido.");
    const runNormalized = normalizeId(input.run);

    const pending = await prisma.patientPortalCode.findFirst({
      where: { clinicId: clinic.clinicId, runNormalized, consumedAt: null },
      orderBy: { createdAt: "desc" },
    });
    if (!pending || pending.expiresAt < new Date() || pending.attempts >= MAX_ATTEMPTS) {
      throw new PortalError("El codigo vencio. Pide uno nuevo.");
    }
    if (!sameHash(pending.codeHash, hashCode(clinic.clinicId, runNormalized, input.code.trim()))) {
      await prisma.patientPortalCode.update({ where: { id: pending.id }, data: { attempts: { increment: 1 } } });
      throw new PortalError("El codigo no es correcto. Revisalo e intentalo de nuevo.");
    }

    const passwordHash = await hashPassword(input.password);

    return prisma.$transaction(async (tx) => {
      const consumed = await tx.patientPortalCode.updateMany({
        where: { id: pending.id, consumedAt: null },
        data: { consumedAt: new Date() },
      });
      if (consumed.count === 0) throw new PortalError("El codigo ya se uso. Ingresa con tu RUT o correo.");

      let patient = await tx.patient.findFirst({
        where: { clinicId: clinic.clinicId, runNormalized },
        select: { id: true, isActive: true, portalAccount: { select: { id: true } } },
      });
      if (patient?.portalAccount) throw new PortalError("Ya tienes una cuenta. Ingresa con tu RUT o correo.");
      if (patient && !patient.isActive) throw new PortalError("No pudimos crear tu cuenta con estos datos. Llama a la clinica.");

      if (!patient) {
        if (!pending.firstName || !pending.lastName) throw new PortalError("Faltan tus datos. Vuelve a empezar el registro.");
        patient = await tx.patient.create({
          data: {
            clinicId: clinic.clinicId,
            firstName: pending.firstName,
            lastName: pending.lastName,
            run: formatRun(input.run),
            runNormalized,
            email: pending.email,
            phone: pending.phone,
          },
          select: { id: true, isActive: true, portalAccount: { select: { id: true } } },
        });
      }

      return tx.patientAccount.create({
        data: {
          clinicId: clinic.clinicId,
          patientId: patient.id,
          email: pending.email,
          passwordHash,
          emailVerifiedAt: new Date(),
          lastLoginAt: new Date(),
        },
        select: { id: true, patientId: true, clinicId: true },
      });
    });
  }

  /** Ingreso con RUT o correo y contrasena. El error es siempre el mismo para no revelar que cuentas existen. */
  static async login(clinic: PortalClinic, input: { identifier: string; password: string }) {
    const generic = new PortalError("RUT, correo o contrasena incorrectos.");
    const identifier = input.identifier.trim();

    const select = {
      id: true,
      patientId: true,
      clinicId: true,
      passwordHash: true,
      patient: { select: { isActive: true } },
    } as const;

    const account = identifier.includes("@")
      ? await prisma.patientAccount.findUnique({
          where: { clinicId_email: { clinicId: clinic.clinicId, email: identifier.toLowerCase() } },
          select,
        })
      : await prisma.patientAccount.findFirst({
          where: { clinicId: clinic.clinicId, patient: { runNormalized: normalizeId(identifier) } },
          select,
        });

    if (!account || !account.patient.isActive) {
      // Mismo costo que una verificacion real, para no delatar si la cuenta existe.
      await verifyPassword(input.password, "$2a$10$CwTycUXWue0Thq9StjUM0uJ8pM3Q1lC8pU9JZ3xY8eYjVYk3m9X1e");
      throw generic;
    }
    if (!(await verifyPassword(input.password, account.passwordHash))) throw generic;

    await prisma.patientAccount.update({ where: { id: account.id }, data: { lastLoginAt: new Date() } });
    return { id: account.id, patientId: account.patientId, clinicId: account.clinicId };
  }

  static async changePassword(accountId: string, current: string, next: string) {
    if (next.length < MIN_PASSWORD) throw new PortalError(`La nueva contrasena debe tener al menos ${MIN_PASSWORD} caracteres.`);
    const account = await prisma.patientAccount.findUnique({ where: { id: accountId }, select: { passwordHash: true } });
    if (!account || !(await verifyPassword(current, account.passwordHash))) {
      throw new PortalError("Tu contrasena actual no es correcta.");
    }
    await prisma.patientAccount.update({ where: { id: accountId }, data: { passwordHash: await hashPassword(next) } });
  }
}
