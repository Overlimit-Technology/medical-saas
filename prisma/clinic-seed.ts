import "dotenv/config";
import { prisma } from "../src/lib/prisma";

type SeedClinicInput = {
  name: string;
  city: string;
};

async function upsertClinic(input: SeedClinicInput) {
  // Si no tienes unique en Clinic, hacemos findFirst(name+city) y luego create/update.
  const existing = await prisma.clinic.findFirst({
    where: { name: input.name, city: input.city },
    select: { id: true },
  });

  if (existing) {
    return prisma.clinic.update({
      where: { id: existing.id },
      data: { isActive: true },
      select: { id: true, name: true, city: true, isActive: true },
    });
  }

  return prisma.clinic.create({
    data: { ...input, isActive: true },
    select: { id: true, name: true, city: true, isActive: true },
  });
}

async function ensureMembership(userId: string, clinicId: string, status: "ACTIVE" | "INACTIVE" = "ACTIVE") {
  await prisma.clinicMembership.upsert({
    where: { userId_clinicId: { userId, clinicId } },
    update: { status },
    create: { userId, clinicId, status },
  });
}

async function requireUserIdByEmail(email: string): Promise<{ id: string; email: string }> {
  const u = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true } });
  if (!u) throw new Error(`User not found: ${email}. Run prisma/seed.ts first.`);
  return u;
}

async function main() {
  // 1) Clinics
  const clinicInputs: SeedClinicInput[] = [
    { name: "MediGest Central", city: "Santiago" },
    { name: "MediGest Norte", city: "Antofagasta" },
    { name: "MediGest Sur", city: "Concepción" },
  ];

  const clinics = [];
  for (const c of clinicInputs) clinics.push(await upsertClinic(c));

  // 2) Users (must already exist from seed.ts)
  const admin = await requireUserIdByEmail("admin@medigest.cl");
  const doctor = await requireUserIdByEmail("doctor@medigest.cl");
  const secretary = await requireUserIdByEmail("secretaria@medigest.cl");
  const doctorMultiA = await requireUserIdByEmail("doctor.multi.a@medigest.cl");
  const doctorMultiB = await requireUserIdByEmail("doctor.multi.b@medigest.cl");

  // 3) Memberships
  // Base users -> all 3 clinics
  for (const c of clinics) {
    await ensureMembership(admin.id, c.id, "ACTIVE");
    await ensureMembership(doctor.id, c.id, "ACTIVE");
    await ensureMembership(secretary.id, c.id, "ACTIVE");
  }

  // doctorMultiA -> Central + Norte
  await ensureMembership(doctorMultiA.id, clinics[0].id, "ACTIVE");
  await ensureMembership(doctorMultiA.id, clinics[1].id, "ACTIVE");

  // doctorMultiB -> Norte + Sur + Central (3 clínicas)
  await ensureMembership(doctorMultiB.id, clinics[1].id, "ACTIVE");
  await ensureMembership(doctorMultiB.id, clinics[2].id, "ACTIVE");
  await ensureMembership(doctorMultiB.id, clinics[0].id, "ACTIVE");

  console.log("✅ Clinics seeded:");
  console.table(clinics);
  console.log("✅ Memberships ensured for users:", [
    admin.email,
    doctor.email,
    secretary.email,
    doctorMultiA.email,
    doctorMultiB.email,
  ]);
}

main()
  .catch((e) => {
    console.error("❌ Clinic seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
