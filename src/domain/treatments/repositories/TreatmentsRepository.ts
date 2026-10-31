import type { Treatment } from "../entities/Treatment";

export interface TreatmentsRepository {
  getTreatments(): Promise<Treatment[]>;
  saveTreatment(input: { id?: string; name: string; price: number; fonasaCode?: string | null }): Promise<void>;
  deleteTreatment(treatmentId: string): Promise<void>;
}
