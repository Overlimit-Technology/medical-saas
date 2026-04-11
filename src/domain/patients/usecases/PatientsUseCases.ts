import type {
  DeletePatientResult,
  PatientDetail,
  PatientsResult,
  SavePatientInput,
  SavePatientResult,
  UpdatePatientDetailInput,
} from "../entities/Patient";
import type { PatientsRepository } from "../repositories/PatientsRepository";

export class GetPatientsUseCase {
  constructor(private readonly repo: PatientsRepository) {}

  async execute(input: { query?: string; page?: number; pageSize?: number }): Promise<PatientsResult> {
    return this.repo.getPatients(input);
  }
}

export class SavePatientUseCase {
  constructor(private readonly repo: PatientsRepository) {}

  async execute(patientId: string | null, input: SavePatientInput): Promise<SavePatientResult> {
    return this.repo.savePatient(patientId, input);
  }
}

export class DeletePatientUseCase {
  constructor(private readonly repo: PatientsRepository) {}

  async execute(patientId: string): Promise<DeletePatientResult> {
    return this.repo.deletePatient(patientId);
  }
}

export class GetPatientDetailUseCase {
  constructor(private readonly repo: PatientsRepository) {}

  async execute(patientId: string): Promise<PatientDetail | null> {
    return this.repo.getPatientDetail(patientId);
  }
}

export class UpdatePatientDetailUseCase {
  constructor(private readonly repo: PatientsRepository) {}

  async execute(patientId: string, input: UpdatePatientDetailInput): Promise<void> {
    await this.repo.updatePatientDetail(patientId, input);
  }
}
