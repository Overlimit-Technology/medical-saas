import type { ClinicalRecord } from "@/domain/clinical-records/entities/ClinicalRecord";
import type { ClinicalRecordsRepository } from "@/domain/clinical-records/repositories/ClinicalRecordsRepository";

type ClinicalRecordsResponse = {
  ok: boolean;
  items?: ClinicalRecord[];
  error?: string;
};

export class ClinicalRecordsRepositoryHttp implements ClinicalRecordsRepository {
  async getClinicalRecords(appointmentId: string): Promise<ClinicalRecord[]> {
    const res = await fetch(`/api/clinical-records?appointmentId=${appointmentId}`);
    const data = (await res.json().catch(() => null)) as ClinicalRecordsResponse | null;

    if (!res.ok || !data?.ok) {
      throw new Error(data?.error ?? "No se pudieron cargar las fichas.");
    }

    return data.items ?? [];
  }

  async saveClinicalRecord(input: {
    recordId?: string;
    appointmentId?: string;
    templateId?: string | null;
    patientId?: string;
    values: Array<{ fieldId: string; value: string }>;
  }): Promise<void> {
    const editing = Boolean(input.recordId);
    const payload: Record<string, unknown> = { values: input.values };

    if (!editing) {
      payload.appointmentId = input.appointmentId;
      payload.templateId = input.templateId;
      payload.patientId = input.patientId;
    }

    const res = await fetch(
      editing ? `/api/clinical-records/${input.recordId}` : "/api/clinical-records",
      {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    const data = (await res.json().catch(() => null)) as ClinicalRecordsResponse | null;

    if (!res.ok || !data?.ok) {
      throw new Error(data?.error ?? "No se pudo guardar la ficha.");
    }
  }
}
