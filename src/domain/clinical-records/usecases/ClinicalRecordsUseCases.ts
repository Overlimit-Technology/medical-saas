import type { ClinicalRecord } from "../entities/ClinicalRecord";
import type { ClinicalRecordsRepository } from "../repositories/ClinicalRecordsRepository";

export class GetClinicalRecordsUseCase {
  constructor(private readonly repo: ClinicalRecordsRepository) {}

  async execute(appointmentId: string): Promise<ClinicalRecord[]> {
    return this.repo.getClinicalRecords(appointmentId);
  }
}

export class GetClinicalRecordsByPatientUseCase {
  constructor(private readonly repo: ClinicalRecordsRepository) {}

  async execute(patientId: string): Promise<ClinicalRecord[]> {
    return this.repo.getClinicalRecordsByPatient(patientId);
  }
}

export class SaveClinicalRecordUseCase {
  constructor(private readonly repo: ClinicalRecordsRepository) {}

  async execute(input: {
    recordId?: string;
    appointmentId?: string;
    templateId?: string | null;
    patientId?: string;
    values: Array<{ fieldId: string; value: string }>;
  }): Promise<void> {
    await this.repo.saveClinicalRecord(input);
  }
}
