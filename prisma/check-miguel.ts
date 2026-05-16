import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  const items = await prisma.patientTreatment.findMany({
    where: { patientId: "cmojeyasp001owgv7jdv67xwz" },
    include: {
      treatment: { select: { name: true } },
      payments: { select: { id: true, status: true, amount: true } },
    },
  });

  console.log("=== TRATAMIENTOS DE MIGUEL ===");
  for (const i of items) {
    const paid = i.payments.filter((p) => p.status === "PAID" || p.status === "WAIVED").length;
    console.log(`- ${i.treatment.name}: ${i.payments.length} pagos, ${paid} pagados`);
  }

  console.log("\n=== TRATAMIENTOS DISPONIBLES ===");
  const treats = await prisma.treatment.findMany({ select: { id: true, name: true } });
  console.table(treats);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
