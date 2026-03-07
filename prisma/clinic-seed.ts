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

async function setMembershipsWithinClinics(
  userId: string,
  allClinicIds: string[],
  keepClinicIds: string[],
  status: "ACTIVE" | "INACTIVE" = "ACTIVE"
) {
  const keepSet = new Set(keepClinicIds);
  const removeIds = allClinicIds.filter((id) => !keepSet.has(id));

  if (removeIds.length > 0) {
    await prisma.clinicMembership.deleteMany({
      where: { userId, clinicId: { in: removeIds } },
    });
  }

  for (const clinicId of keepClinicIds) {
    await ensureMembership(userId, clinicId, status);
  }
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
  const adminJean = await requireUserIdByEmail("jeancarlosgarnicaflores@gmail.com");
  const doctor = await requireUserIdByEmail("doctor@medigest.cl");
  const secretary = await requireUserIdByEmail("secretaria@medigest.cl");
  const doctorMultiA = await requireUserIdByEmail("doctor.A.multi.a@medigest.cl");
  const doctorMultiB = await requireUserIdByEmail("doctor.B.multi.b@medigest.cl");

  // 3) Memberships
  const clinicIds = clinics.map((c) => c.id);

  // Base users -> all 3 clinics
  await setMembershipsWithinClinics(admin.id, clinicIds, clinicIds);
  await setMembershipsWithinClinics(adminJean.id, clinicIds, clinicIds);
  await setMembershipsWithinClinics(doctor.id, clinicIds, clinicIds);
  await setMembershipsWithinClinics(secretary.id, clinicIds, clinicIds);

  // doctorMultiA -> Central + Norte (2 clínicas)
  await setMembershipsWithinClinics(doctorMultiA.id, clinicIds, [clinicIds[0], clinicIds[1]]);

  // doctorMultiB -> Central (1 clínica)
  await setMembershipsWithinClinics(doctorMultiB.id, clinicIds, [clinicIds[0]]);

  console.log("✅ Clinics seeded:");
  console.table(clinics);
  console.log("✅ Memberships ensured for users:", [
    admin.email,
    adminJean.email,
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
