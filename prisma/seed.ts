import "dotenv/config";
import { UserRole, UserStatus } from "@prisma/client";
import { hashPassword } from "../src/lib/password";
import { prisma } from "../src/lib/prisma";

type FieldErrors = Partial<Record<"email" | "password", string>>;

/**
 * Seeder MVP:
 * - Crea usuarios base (admin/doctor/secretary)
 * - Crea doctores extra (multi-clinic)
 * - Con perfiles asociados (UserProfile)
 * - Password hasheada
 */

async function upsertUser(params: {
  email: string;
  password: string;
  role: UserRole;
  status?: UserStatus;
  firstName: string;
  lastName: string;
  phone?: string;
  rut?: string;
  name?: string;
}) {
  const passwordHash = await hashPassword(params.password);

  const user = await prisma.user.upsert({
    where: { email: params.email },
    update: {
      role: params.role,
      status: params.status ?? "ACTIVE",
      passwordHash,
      name: params.name ?? `${params.firstName} ${params.lastName}`,
      profile: {
        upsert: {
          create: {
            firstName: params.firstName,
            lastName: params.lastName,
            phone: params.phone,
            rut: params.rut,
          },
          update: {
            firstName: params.firstName,
            lastName: params.lastName,
            phone: params.phone,
            rut: params.rut,
          },
        },
      },
    },
    create: {
      email: params.email,
      passwordHash,
      role: params.role,
      status: params.status ?? "ACTIVE",
      name: params.name ?? `${params.firstName} ${params.lastName}`,
      profile: {
        create: {
          firstName: params.firstName,
          lastName: params.lastName,
          phone: params.phone,
          rut: params.rut,
        },
      },
    },
    select: { id: true, email: true, role: true, status: true },
  });

  return user;
}

async function main() {
  console.log("▶ Running prisma/seed.ts ...");

  const admin = await upsertUser({
    email: "admin@medigest.cl",
    password: "Admin123!",
    role: "ADMIN",
    firstName: "Admin",
    lastName: "MediGest",
    phone: "+56911111111",
  });

  const doctor = await upsertUser({
    email: "doctor@medigest.cl",
    password: "Doctor123!",
    role: "DOCTOR",
    firstName: "Dra.",
    lastName: "Paz",
    phone: "+56922222222",
  });

  const secretary = await upsertUser({
    email: "secretaria@medigest.cl",
    password: "Secre123!",
    role: "SECRETARY",
    firstName: "Sofía",
    lastName: "Rojas",
    phone: "+56933333333",
  });

  const doctorMultiA = await upsertUser({
    email: "doctor.multi.a@medigest.cl",
    password: "Doctor123!",
    role: "DOCTOR",
    firstName: "Dr.",
    lastName: "MultiA",
    phone: "+56944444444",
  });

  const doctorMultiB = await upsertUser({
    email: "doctor.multi.b@medigest.cl",
    password: "Doctor123!",
    role: "DOCTOR",
    firstName: "Dra.",
    lastName: "MultiB",
    phone: "+56955555555",
  });

  console.log("✅ Seed listo. Usuarios creados/actualizados:");
  console.table([admin, doctor, secretary, doctorMultiA, doctorMultiB]);

  console.log("\nCredenciales:");
  console.log("ADMIN      admin@medigest.cl           / Admin123!");
  console.log("DOCTOR     doctor@medigest.cl          / Doctor123!");
  console.log("SECRETARY  secretaria@medigest.cl      / Secre123!");
  console.log("DOCTOR A   doctor.multi.a@medigest.cl  / Doctor123!");
  console.log("DOCTOR B   doctor.multi.b@medigest.cl  / Doctor123!");
}

main()
  .catch((e) => {
    console.error("❌ Seed falló:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
