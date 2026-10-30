import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generatePassword, hashPassword } from "@/lib/password";
import { AuditService } from "@/server/audit/AuditService";
import { jsonError, requireSuperAdmin } from "@/server/super-admin/guard";

export const dynamic = "force-dynamic";

const DAY_MS = 86_400_000;

export async function GET() {
  const g = await requireSuperAdmin();
  if (!g.ok) return g.response;

  try {
    const clinics = await prisma.clinic.findMany({
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        city: true,
        isActive: true,
        memberships: {
          where: { status: "ACTIVE" },
          select: {
            user: {
              select: {
                status: true,
              },
            },
          },
        },
      },
    });

    const items = clinics.map((clinic) => {
      const activeUsers = clinic.memberships.filter((membership) => membership.user.status === "ACTIVE").length;
      const inactiveUsers = clinic.memberships.filter((membership) => membership.user.status !== "ACTIVE").length;

      return {
        id: clinic.id,
        name: clinic.name,
        city: clinic.city,
        isActive: clinic.isActive,
        totalUsers: clinic.memberships.length,
        activeUsers,
        inactiveUsers,
      };
    });

    return NextResponse.json({ ok: true, items });
  } catch (error) {
    console.error("super-admin/clinics GET", error);
    return jsonError("No se pudieron cargar las sedes.", 400);
  }
}

const createSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    city: z.string().trim().min(1).max(80),
    planName: z.string().trim().min(1).max(60).nullable().optional(),
    monthlyPrice: z.number().int().min(0).max(100_000_000).nullable().optional(),
    billingStatus: z.enum(["TRIAL", "ACTIVE"]),
    trialDays: z.number().int().min(1).max(90).default(14),
    admin: z.object({
      email: z.string().trim().toLowerCase().email().max(160),
      firstName: z.string().trim().min(1).max(80),
      lastName: z.string().trim().min(1).max(80),
    }),
  })
  .strict()
  .refine((v) => v.billingStatus !== "ACTIVE" || (v.monthlyPrice ?? 0) > 0, {
    message: "Una sede activa necesita precio mensual.",
    path: ["monthlyPrice"],
  });

// Crea una sede nueva con su primer usuario ADMIN. La clave temporal se devuelve una sola vez en la respuesta
// (no se envia por correo) y el usuario queda obligado a cambiarla en su primer inicio de sesion.
export async function POST(req: Request) {
  const g = await requireSuperAdmin();
  if (!g.ok) return g.response;

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message || "Datos invalidos.", 400);
  }
  const d = parsed.data;

  const [emailTaken, nameTaken] = await Promise.all([
    prisma.user.findUnique({ where: { email: d.admin.email }, select: { id: true } }),
    prisma.clinic.findFirst({ where: { name: { equals: d.name, mode: "insensitive" } }, select: { id: true } }),
  ]);
  if (emailTaken) return jsonError("Ya existe un usuario con ese correo.", 409);
  if (nameTaken) return jsonError("Ya existe una sede con ese nombre.", 409);

  const now = new Date();
  const tempPassword = generatePassword();
  const passwordHash = await hashPassword(tempPassword);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const clinic = await tx.clinic.create({
        data: {
          name: d.name,
          city: d.city,
          isActive: true,
          billingStatus: d.billingStatus,
          planName: d.planName ?? null,
          monthlyPrice: d.monthlyPrice ?? null,
          trialEndsAt: d.billingStatus === "TRIAL" ? new Date(now.getTime() + d.trialDays * DAY_MS) : null,
          subscriptionStartedAt: d.billingStatus === "ACTIVE" ? now : null,
        },
        select: { id: true, name: true },
      });
      const user = await tx.user.create({
        data: {
          email: d.admin.email,
          passwordHash,
          mustChangePassword: true,
          role: "ADMIN",
          isSuperAdmin: false,
          status: "ACTIVE",
          profile: { create: { firstName: d.admin.firstName, lastName: d.admin.lastName } },
          clinicMemberships: { create: { clinicId: clinic.id, status: "ACTIVE" } },
        },
        select: { id: true, email: true },
      });
      return { clinic, user };
    });

    await AuditService.log(
      "SUPERADMIN_CLINIC_CREATE",
      g.actor.email,
      JSON.stringify({
        clinicId: result.clinic.id,
        clinicName: result.clinic.name,
        billingStatus: d.billingStatus,
        planName: d.planName ?? null,
        monthlyPrice: d.monthlyPrice ?? null,
        adminEmail: result.user.email,
      })
    );

    return NextResponse.json(
      {
        ok: true,
        clinic: result.clinic,
        admin: { id: result.user.id, email: result.user.email },
        // Se muestra una sola vez; el usuario debe cambiarla al entrar.
        temporaryPassword: tempPassword,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return jsonError("Ya existe un usuario con ese correo.", 409);
    }
    console.error("super-admin/clinics POST", error);
    return jsonError("No se pudo crear la sede.", 500);
  }
}
