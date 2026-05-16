import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const MIGUEL_ID = "cmojeyasp001owgv7jdv67xwz";
const CLINIC_ID = "clinic_santiago";

async function main() {
  console.log("▶ Seeding data for Miguel Mijares...\n");

  // 1. Verificar que el paciente existe
  const patient = await prisma.patient.findUnique({
    where: { id: MIGUEL_ID },
    select: { id: true, firstName: true, lastName: true },
  });
  if (!patient) {
    console.error("❌ Paciente no encontrado");
    process.exit(1);
  }
  console.log(`✅ Paciente: ${patient.firstName} ${patient.lastName}`);

  // 2. Buscar un tratamiento disponible para asignar (Ortodoncia/Implante)
  const implante = await prisma.treatment.findFirst({
    where: { name: { contains: "Implante", mode: "insensitive" } },
    select: { id: true, name: true },
  });
  const ortodoncia = await prisma.treatment.findFirst({
    where: { name: { contains: "Brackets", mode: "insensitive" } },
    select: { id: true, name: true },
  });

  // 3. Crear tratamiento in_progress: Implante Dental (sin pagos = in_progress)
  if (implante) {
    const existing = await prisma.patientTreatment.findFirst({
      where: { patientId: MIGUEL_ID, treatmentId: implante.id },
    });
    if (!existing) {
      const pt = await prisma.patientTreatment.create({
        data: {
          patientId: MIGUEL_ID,
          treatmentId: implante.id,
          performedAt: new Date("2026-03-15"),
        },
      });
      // Crear pagos parciales: 1 de 4 pagado → Fase 2 de 4
      await prisma.paymentHistory.createMany({
        data: [
          {
            patientTreatmentId: pt.id,
            status: "PAID",
            amount: 150000,
            recordedAt: new Date("2026-03-15"),
          },
          {
            patientTreatmentId: pt.id,
            status: "PENDING",
            amount: 150000,
            recordedAt: new Date("2026-04-15"),
          },
          {
            patientTreatmentId: pt.id,
            status: "PENDING",
            amount: 150000,
            recordedAt: new Date("2026-05-15"),
          },
          {
            patientTreatmentId: pt.id,
            status: "PENDING",
            amount: 150000,
            recordedAt: new Date("2026-06-15"),
          },
        ],
      });
      console.log(`✅ Tratamiento creado: ${implante.name} (4 cuotas, 1 pagada)`);
    } else {
      console.log(`ℹ️  Tratamiento ${implante.name} ya existe`);
    }
  }

  // 4. Crear segundo tratamiento in_progress: Brackets (si existe)
  if (ortodoncia) {
    const existing2 = await prisma.patientTreatment.findFirst({
      where: { patientId: MIGUEL_ID, treatmentId: ortodoncia.id },
    });
    if (!existing2) {
      const pt2 = await prisma.patientTreatment.create({
        data: {
          patientId: MIGUEL_ID,
          treatmentId: ortodoncia.id,
          performedAt: new Date("2026-01-10"),
        },
      });
      await prisma.paymentHistory.createMany({
        data: [
          {
            patientTreatmentId: pt2.id,
            status: "PAID",
            amount: 80000,
            recordedAt: new Date("2026-01-10"),
          },
          {
            patientTreatmentId: pt2.id,
            status: "PAID",
            amount: 80000,
            recordedAt: new Date("2026-02-10"),
          },
          {
            patientTreatmentId: pt2.id,
            status: "PENDING",
            amount: 80000,
            recordedAt: new Date("2026-05-10"),
          },
        ],
      });
      console.log(`✅ Tratamiento creado: ${ortodoncia.name} (3 cuotas, 2 pagadas)`);
    } else {
      console.log(`ℹ️  Tratamiento ${ortodoncia.name} ya existe`);
    }
  }

  // 5. Seed de imagenología
  const existingImaging = await prisma.patientImaging.findFirst({
    where: { patientId: MIGUEL_ID },
  });

  if (!existingImaging) {
    await prisma.patientImaging.createMany({
      data: [
        {
          clinicId: CLINIC_ID,
          patientId: MIGUEL_ID,
          studyName: "Radiografía Panorámica",
          doctorName: "Dra. Valentina Soto",
          status: "completado",
          imageUrl: null,
          observation: "Vista completa de la dentición. Sin hallazgos patológicos mayores.",
          studiedAt: new Date("2026-03-10"),
        },
        {
          clinicId: CLINIC_ID,
          patientId: MIGUEL_ID,
          studyName: "Radiografía Periapical - Sector 3",
          doctorName: "Dr. Andrés Muñoz",
          status: "completado",
          imageUrl: null,
          observation: "Control post-instalación de implante. Oseointegración en proceso.",
          studiedAt: new Date("2026-03-20"),
        },
        {
          clinicId: CLINIC_ID,
          patientId: MIGUEL_ID,
          studyName: "Tomografía Cone Beam",
          doctorName: "Dra. Valentina Soto",
          status: "pendiente",
          imageUrl: null,
          observation: "Solicitada para evaluación de densidad ósea previo a segunda fase.",
          studiedAt: new Date("2026-04-28"),
        },
      ],
    });
    console.log("✅ Imagenología creada (3 estudios)");
  } else {
    console.log("ℹ️  Imagenología ya existe para Miguel");
  }

  console.log("\n🎉 Seed completado para Miguel Mijares");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
