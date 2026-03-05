import { prisma } from "@/lib/prisma";

function toClinicLabel(name: string, city: string) {
  const cleanName = name.trim();
  const cleanCity = city.trim();
  return cleanCity ? `${cleanName} (${cleanCity})` : cleanName;
}

export async function resolveClinicLabels(clinicIds: string[]): Promise<string[]> {
  const ids = Array.from(new Set(clinicIds.filter(Boolean)));
  if (!ids.length) return [];

  const clinics = await prisma.clinic.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      name: true,
      city: true,
    },
  });

  const labelsById = new Map(clinics.map((clinic) => [clinic.id, toClinicLabel(clinic.name, clinic.city)]));
  return ids.map((id) => labelsById.get(id) ?? "Sede no especificada");
}

export async function resolveSingleClinicLabel(clinicId: string): Promise<string> {
  const [label] = await resolveClinicLabels([clinicId]);
  return label ?? "Sede no especificada";
}
