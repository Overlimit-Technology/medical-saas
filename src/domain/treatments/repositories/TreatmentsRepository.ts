import type { Treatment } from "../entities/Treatment";

export interface TreatmentsRepository {
  getTreatments(): Promise<Treatment[]>;
  saveTreatment(input: { id?: string; name: string; price: number }): Promise<void>;
  deleteTreatment(treatmentId: string): Promise<void>;
}
