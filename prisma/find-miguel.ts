import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  const patients = await prisma.patient.findMany({
    where: {
      OR: [
        { firstName: { contains: "Miguel", mode: "insensitive" } },
        { lastName: { contains: "Mijares", mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      secondLastName: true,
      run: true,
      createdAt: true,
      clinicId: true,
      patientTreatments: { select: { id: true } },
    },
  });

  if (patients.length === 0) {
    console.log("❌ No se encontró el paciente. Buscando todos los pacientes...");
    const all = await prisma.patient.findMany({
      select: { id: true, firstName: true, lastName: true, createdAt: true },
      take: 20,
      orderBy: { createdAt: "desc" },
    });
    console.table(all);
  } else {
    console.log("✅ Encontrado:");
    patients.forEach((p) => {
      const date = new Date(p.createdAt);
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      const short = p.id.slice(-4).toUpperCase();
      console.log(`Ficha: ${y}${m}${d}-${short}`);
      console.log(`ID real: ${p.id}`);
      console.log(`Nombre: ${p.firstName} ${p.lastName} ${p.secondLastName ?? ""}`);
      console.log(`RUN: ${p.run}`);
      console.log(`ClinicId: ${p.clinicId}`);
      console.log(`Tratamientos: ${p.patientTreatments.length}`);
    });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
