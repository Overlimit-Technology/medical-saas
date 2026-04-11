import type {
  DeletePatientResult,
  PatientDetail,
  PatientsResult,
  SavePatientInput,
  SavePatientResult,
  UpdatePatientDetailInput,
} from "../entities/Patient";

export interface PatientsRepository {
  getPatients(input: { query?: string; page?: number; pageSize?: number }): Promise<PatientsResult>;
  savePatient(patientId: string | null, input: SavePatientInput): Promise<SavePatientResult>;
  deletePatient(patientId: string): Promise<DeletePatientResult>;
  getPatientDetail(patientId: string): Promise<PatientDetail | null>;
  updatePatientDetail(patientId: string, input: UpdatePatientDetailInput): Promise<void>;
}
