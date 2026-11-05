import type {
  ConsultationBootstrap,
  ConsultationClosureInput,
  ConsultationClosureResult,
  ConsultationDraft,
  ConsultationStartInput,
  ConsultationVisit,
  PatientBackgroundData,
} from "@/domain/consultations/entities/Consultation";
import type { ConsultationsRepository } from "@/domain/consultations/repositories/ConsultationsRepository";

type ApiResponse<T> = {
  ok: boolean;
  item?: T;
  error?: string;
  code?: string;
};

/** La ficha se bloqueo (falta el PIN): el candado de la pantalla escucha este evento. */
export const CLINICAL_LOCKED_EVENT = "zensya:clinical-locked";

export class ClinicalLockedClientError extends Error {
  constructor(message: string, public code: string) {
    super(message);
  }
}

async function request<T>(url: string, init: RequestInit | undefined, fallback: string): Promise<T> {
  const res = await fetch(url, init);
  const data = (await res.json().catch(() => null)) as ApiResponse<T> | null;

  if (res.status === 423) {
    const code = data?.code ?? "PIN_REQUIRED";
    window.dispatchEvent(new CustomEvent(CLINICAL_LOCKED_EVENT, { detail: { code } }));
    throw new ClinicalLockedClientError(data?.error ?? "La ficha esta bloqueada.", code);
  }

  if (!res.ok || !data?.ok || data.item === undefined) {
    throw new Error(data?.error ?? fallback);
  }

  return data.item;
}

export class ConsultationsRepositoryHttp implements ConsultationsRepository {
  async getConsultation(appointmentId: string): Promise<ConsultationBootstrap> {
    return request<ConsultationBootstrap>(
      `/api/consultations/${appointmentId}`,
      undefined,
      "No se pudo cargar la consulta."
    );
  }

  async startConsultation(appointmentId: string, input: ConsultationStartInput): Promise<ConsultationVisit> {
    return request<ConsultationVisit>(
      `/api/consultations/${appointmentId}/start`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) },
      "No se pudo iniciar la consulta."
    );
  }

  async saveBackground(appointmentId: string, data: Omit<PatientBackgroundData, "updatedAt">): Promise<{ updatedAt: string }> {
    return request<{ updatedAt: string }>(
      `/api/consultations/${appointmentId}/background`,
      { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) },
      "No se pudieron guardar los antecedentes."
    );
  }

  async saveDraft(appointmentId: string, draft: ConsultationDraft): Promise<{ savedAt: string }> {
    return request<{ savedAt: string }>(
      `/api/consultations/${appointmentId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      },
      "No se pudo guardar el avance."
    );
  }

  async closeConsultation(
    appointmentId: string,
    input: ConsultationClosureInput
  ): Promise<ConsultationClosureResult> {
    return request<ConsultationClosureResult>(
      `/api/consultations/${appointmentId}/close`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      },
      "No se pudo cerrar la consulta."
    );
  }
}
