import type {
  DeletePatientResult,
  PatientDetail,
  PatientsResult,
  SavePatientInput,
  SavePatientResult,
  UpdatePatientDetailInput,
} from "@/domain/patients/entities/Patient";
import type { PatientsRepository } from "@/domain/patients/repositories/PatientsRepository";

type PatientsResponse = {
  ok: boolean;
  items?: PatientDetail[];
  item?: PatientDetail;
  total?: number;
  error?: string;
  softDeleted?: boolean;
  deletedAppointments?: number;
  notificationWarning?: string | null;
};

export class PatientsRepositoryHttp implements PatientsRepository {
  async getPatients(input: { query?: string; page?: number; pageSize?: number }): Promise<PatientsResult> {
    const query = input.query ?? "";
    const page = input.page ?? 1;
    const pageSize = input.pageSize ?? 200;
    const res = await fetch(
      `/api/patients?q=${encodeURIComponent(query)}&page=${page}&pageSize=${pageSize}`
    );
    const data = (await res.json().catch(() => null)) as PatientsResponse | null;

    if (!res.ok || !data?.ok) {
      throw new Error(data?.error ?? "No se pudieron cargar los pacientes.");
    }

    return {
      items: (data.items ?? []) as PatientDetail[],
      total: data.total ?? data.items?.length ?? 0,
    };
  }

  async savePatient(patientId: string | null, input: SavePatientInput): Promise<SavePatientResult> {
    const res = await fetch(patientId ? `/api/patients/${patientId}` : "/api/patients", {
      method: patientId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = (await res.json().catch(() => null)) as PatientsResponse | null;

    if (!res.ok || !data?.ok) {
      throw new Error(data?.error ?? "No se pudo guardar el paciente.");
    }

    return { patientId: data.item?.id, notificationWarning: data.notificationWarning ?? null };
  }

  async deletePatient(patientId: string): Promise<DeletePatientResult> {
    const res = await fetch(`/api/patients/${patientId}`, { method: "DELETE" });
    const data = (await res.json().catch(() => null)) as PatientsResponse | null;

    if (!res.ok || !data?.ok) {
      throw new Error(data?.error ?? "No se pudo eliminar el paciente.");
    }

    return {
      softDeleted: data.softDeleted,
      deletedAppointments: data.deletedAppointments,
    };
  }

  async getPatientDetail(patientId: string): Promise<PatientDetail | null> {
    const res = await fetch(`/api/patients/${patientId}`);
    const data = (await res.json().catch(() => null)) as PatientsResponse | null;

    if (!res.ok || !data?.ok) {
      return null;
    }

    return data.item ?? null;
  }

  async updatePatientDetail(patientId: string, input: UpdatePatientDetailInput): Promise<void> {
    const res = await fetch(`/api/patients/${patientId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = (await res.json().catch(() => null)) as PatientsResponse | null;

    if (!res.ok || !data?.ok) {
      throw new Error(data?.error ?? "No se pudo guardar.");
    }
  }
}
