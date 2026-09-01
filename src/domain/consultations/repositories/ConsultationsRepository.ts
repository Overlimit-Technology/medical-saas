import type {
  ConsultationBootstrap,
  ConsultationClosureInput,
  ConsultationClosureResult,
  ConsultationDraft,
  ConsultationVisit,
} from "../entities/Consultation";

export interface ConsultationsRepository {
  /** Todo lo que la consola necesita para abrirse, en una sola ida al servidor. */
  getConsultation(appointmentId: string): Promise<ConsultationBootstrap>;
  /** Abre el encuentro, o devuelve el ya abierto si el profesional vuelve a entrar. */
  startConsultation(appointmentId: string): Promise<ConsultationVisit>;
  /** Guarda el borrador. Idempotente: reemplaza el valor de cada clave enviada. */
  saveDraft(appointmentId: string, draft: ConsultationDraft): Promise<{ savedAt: string }>;
  /** Cierra la consulta y ejecuta lo acordado: control, plan y cobro. */
  closeConsultation(
    appointmentId: string,
    input: ConsultationClosureInput
  ): Promise<ConsultationClosureResult>;
}
