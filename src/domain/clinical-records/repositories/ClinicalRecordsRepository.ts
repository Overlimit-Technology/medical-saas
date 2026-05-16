import type { ClinicalRecord } from "../entities/ClinicalRecord";

export interface ClinicalRecordsRepository {
  getClinicalRecords(appointmentId: string): Promise<ClinicalRecord[]>;
  getClinicalRecordsByPatient(patientId: string): Promise<ClinicalRecord[]>;
  saveClinicalRecord(input: {
    recordId?: string;
    appointmentId?: string;
    templateId?: string | null;
    patientId?: string;
    values: Array<{ fieldId: string; value: string }>;
  }): Promise<void>;
}
