import type { ClinicalVisit } from "../entities/ClinicalVisit";

export interface ClinicalVisitsRepository {
  getClinicalVisits(): Promise<ClinicalVisit[]>;
  startClinicalVisit(input: { patientId: string; appointmentId: string | null }): Promise<ClinicalVisit>;
}
