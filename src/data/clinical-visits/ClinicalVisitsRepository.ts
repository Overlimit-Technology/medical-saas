import type { ClinicalVisit } from "@/domain/clinical-visits/entities/ClinicalVisit";
import type { ClinicalVisitsRepository } from "@/domain/clinical-visits/repositories/ClinicalVisitsRepository";

type ClinicalVisitsResponse = {
  ok: boolean;
  items?: ClinicalVisit[];
  item?: ClinicalVisit;
  error?: string;
};

export class ClinicalVisitsRepositoryHttp implements ClinicalVisitsRepository {
  async getClinicalVisits(): Promise<ClinicalVisit[]> {
    const res = await fetch("/api/clinical-visits");
    const data = (await res.json().catch(() => null)) as ClinicalVisitsResponse | null;

    if (!res.ok || !data?.ok) {
      throw new Error(data?.error ?? "No se pudieron cargar las visitas.");
    }

    return data.items ?? [];
  }

  async startClinicalVisit(input: { patientId: string; appointmentId: string | null }): Promise<ClinicalVisit> {
    const res = await fetch("/api/clinical-visits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = (await res.json().catch(() => null)) as ClinicalVisitsResponse | null;

    if (!res.ok || !data?.ok || !data.item) {
      throw new Error(data?.error ?? "No se pudo iniciar la cita clínica.");
    }

    return data.item;
  }
}
